import { Command } from 'commander';
import chalk from 'chalk';
import { kebabCase } from 'lodash';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {
  AgentInstallResult,
  AgentName,
  AGENT_NAMES,
  McpInstallOptions,
  parseAgentsList,
  KEBAB_CASE_RE,
} from './installers/types';
import { claudeCodeInstaller } from './installers/claude-code';
import { cursorInstaller } from './installers/cursor';
import { codexInstaller } from './installers/codex';
import { claudeDesktopInstaller } from './installers/claude-desktop';

const DEFAULT_URL = 'http://localhost:9000/mcp';

export interface RawInstallOptions {
  project?: string;
  apiKey?: string;
  url?: string;
  name?: string;
  agents?: string;
  dryRun?: boolean;
  force?: boolean;
}

const INSTALLERS = {
  'claude-code': claudeCodeInstaller,
  cursor: cursorInstaller,
  codex: codexInstaller,
  'claude-desktop': claudeDesktopInstaller,
} as const;

export function resolveInstallOptions(
  raw: RawInstallOptions,
): McpInstallOptions {
  // 1. project name
  let projectName: string;
  if (raw.project) {
    projectName = raw.project;
    if (!KEBAB_CASE_RE.test(projectName)) {
      throw new Error(
        `--project must be kebab-case (e.g. new-todo-app). Got "${projectName}".`,
      );
    }
  } else {
    // Derive from cwd basename; require SolidX project root. We inline a
    // throw-based check rather than calling validateProjectRoot() (which
    // hard-exits), so runMcpInstall can catch and print a clean error.
    const cwd = process.cwd();
    const hasApi = fs.existsSync(path.join(cwd, 'solid-api', 'package.json'));
    const hasUi = fs.existsSync(path.join(cwd, 'solid-ui', 'package.json'));
    if (!hasApi || !hasUi) {
      throw new Error(
        `Could not derive project name: cwd is not a SolidX project root (missing solid-api/ or solid-ui/). Run from the project root, or pass --project explicitly.`,
      );
    }
    projectName = kebabCase(path.basename(process.cwd()));
    if (!projectName || !KEBAB_CASE_RE.test(projectName)) {
      throw new Error(
        `Could not derive a kebab-case project name from cwd "${process.cwd()}". Pass --project explicitly.`,
      );
    }
  }

  // 2. api key (mandatory)
  let apiKey: string;
  if (raw.apiKey) {
    apiKey = raw.apiKey;
    if (!apiKey.startsWith('sldx_')) {
      throw new Error('--api-key must start with "sldx_".');
    }
  } else {
    const keyFile = path.join(
      process.env.HOME ?? os.homedir(),
      '.solidx',
      projectName,
      'mcp.json',
    );
    if (!fs.existsSync(keyFile)) {
      throw new Error(
        `No API key found at ~/.solidx/${projectName}/mcp.json. Run \`solidctl create-app\` first, or pass --api-key.`,
      );
    }
    const parsed = JSON.parse(fs.readFileSync(keyFile, 'utf8')) as {
      solidxAdminApiKey?: { apiKey?: string };
    };
    const key = parsed.solidxAdminApiKey?.apiKey;
    if (!key) {
      throw new Error(
        `~/.solidx/${projectName}/mcp.json has no solidxAdminApiKey.apiKey.`,
      );
    }
    apiKey = key;
  }

  const url = raw.url ?? DEFAULT_URL;
  const serverName = raw.name ?? `solidx-${projectName}-mcp`;

  return {
    projectName,
    apiKey,
    url,
    serverName,
    agents: parseAgentsList(raw.agents),
    dryRun: Boolean(raw.dryRun),
    force: Boolean(raw.force),
  };
}

function statusLabel(status: AgentInstallResult['status']): string {
  switch (status) {
    case 'installed':
      return chalk.green('installed');
    case 'skipped':
      return chalk.dim('skipped');
    case 'not-detected':
      return chalk.dim('not detected');
    case 'error':
      return chalk.red('error');
  }
}

export async function runMcpInstall(raw: RawInstallOptions): Promise<void> {
  let opts: McpInstallOptions;
  try {
    opts = resolveInstallOptions(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`❌ ${msg}`));
    process.exit(1);
  }

  const requestedNames: AgentName[] =
    opts.agents ?? (AGENT_NAMES as AgentName[]);
  let hadError = false;
  const results: AgentInstallResult[] = [];

  for (const name of requestedNames) {
    const installer = INSTALLERS[name];
    if (!installer) continue;
    if (!installer.isDetected()) {
      results.push({
        agent: name,
        status: 'not-detected',
        message: 'agent not detected on this machine',
      });
      continue;
    }
    try {
      const res = await installer.install(opts);
      results.push(res);
      if (res.status === 'error') {
        hadError = true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        agent: name,
        status: 'error',
        message: msg,
      });
      hadError = true;
    }
  }

  // Summary
  console.log('');
  console.log(chalk.cyan(`SolidX MCP install — server "${opts.serverName}"`));
  for (const r of results) {
    const label = r.agent.padEnd(15);
    const detail = r.message ? chalk.dim(`(${r.message})`) : '';
    console.log(`  ${chalk.magenta(label)} ${statusLabel(r.status)} ${detail}`);
    if (r.backupPath) console.log(chalk.dim(`        backup: ${r.backupPath}`));
  }
  console.log('');

  if (opts.dryRun) {
    console.log(chalk.yellow('Dry run — no files were modified.'));
  }

  if (hadError) process.exit(1);
}

export function registerMcpInstallCommand(mcp: Command) {
  mcp
    .command('install')
    .description(
      'Install the SolidX MCP server into Claude Code, Cursor, Codex, and Claude Desktop globally',
    )
    .option(
      '--project <name>',
      'Consuming project name (kebab-case). Default: derived from cwd basename.',
    )
    .option(
      '--api-key <key>',
      'Override the API key read from ~/.solidx/<project>/mcp.json',
    )
    .option('--url <url>', `MCP server URL (default: ${DEFAULT_URL})`)
    .option(
      '--name <server>',
      'Override the server entry name (default: solidx-<project>-mcp)',
    )
    .option(
      '--agents <list>',
      'Comma-separated subset: claude-code,cursor,codex,claude-desktop',
    )
    .option('--dry-run', 'Print planned changes, touch nothing')
    .option('--force', 'Re-write even when an identical entry already exists')
    .action(async (options: RawInstallOptions) => {
      await runMcpInstall(options);
    });
}
