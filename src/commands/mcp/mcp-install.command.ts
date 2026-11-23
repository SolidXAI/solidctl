import { Command } from 'commander';
import chalk from 'chalk';
import { kebabCase } from 'lodash';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {
  McpInstallOptions,
  parseAgentsList,
  KEBAB_CASE_RE,
} from './installers/types';
import {
  activateMcpRegistration,
  type ActivationRequest,
  type ActivationResult,
} from './activation/activation';
import { isLocalUrl, parseUrl } from './activation/ownership';
import { defaultHomeDir, loadRegistry } from './activation/registry';
import {
  clientsNeedingReload,
  formatActivationReport,
} from './activation/report';
import { inspectMcpPort } from './mcp-lifecycle';

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

function isProjectRoot(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, 'solid-api', 'package.json')) &&
    fs.existsSync(path.join(dir, 'solid-ui', 'package.json'))
  );
}

export function resolveInstallOptions(
  raw: RawInstallOptions,
): McpInstallOptions {
  // 1. project name
  let projectName: string;
  let projectRoot: string | undefined;
  if (raw.project) {
    projectName = raw.project;
    if (!KEBAB_CASE_RE.test(projectName)) {
      throw new Error(
        `--project must be kebab-case (e.g. new-todo-app). Got "${projectName}".`,
      );
    }
    const cwd = process.cwd();
    if (isProjectRoot(cwd) && kebabCase(path.basename(cwd)) === projectName) {
      projectRoot = cwd;
    }
  } else {
    // Derive from cwd basename; require SolidX project root. We inline a
    // throw-based check rather than calling validateProjectRoot() (which
    // hard-exits), so runMcpInstall can catch and print a clean error.
    const cwd = process.cwd();
    if (!isProjectRoot(cwd)) {
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
    projectRoot = cwd;
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
  if (!parseUrl(url)) {
    throw new Error(`--url must be an absolute URL. Got "${url}".`);
  }
  const serverName = raw.name ?? `solidx-${projectName}-mcp`;

  return {
    projectName,
    apiKey,
    url,
    serverName,
    ...(projectRoot ? { projectRoot } : {}),
    agents: parseAgentsList(raw.agents),
    dryRun: Boolean(raw.dryRun),
    force: Boolean(raw.force),
  };
}

export interface McpInstallDeps {
  homeDir?: string;
  log?: (line: string) => void;
  error?: (line: string) => void;
  activation?: Pick<ActivationRequest, 'detect' | 'platform' | 'appData'>;
}

/**
 * Register the project and make it the only active SolidX local MCP
 * registration in each processed client. Returns the process exit code.
 */
export async function executeMcpInstall(
  raw: RawInstallOptions,
  deps: McpInstallDeps = {},
): Promise<number> {
  const log = deps.log ?? ((line: string) => console.log(line));
  const error = deps.error ?? ((line: string) => console.error(line));
  const homeDir = deps.homeDir ?? defaultHomeDir();

  let opts: McpInstallOptions;
  try {
    opts = resolveInstallOptions(raw);
  } catch (err: unknown) {
    error(chalk.red(`❌ ${err instanceof Error ? err.message : String(err)}`));
    return 1;
  }

  let projectRoot = opts.projectRoot;
  try {
    projectRoot ??=
      loadRegistry(homeDir).projects[opts.projectName]?.projectRoot;
  } catch (err: unknown) {
    error(chalk.red(`❌ ${err instanceof Error ? err.message : String(err)}`));
    return 1;
  }

  // Selecting this project while another project's server owns the endpoint
  // would only move the 401s to this project's key.
  const endpoint = parseUrl(opts.url);
  if (!opts.force && projectRoot && endpoint && isLocalUrl(opts.url)) {
    const port =
      endpoint.port || (endpoint.protocol === 'https:' ? '443' : '80');
    const state = await inspectMcpPort(endpoint.hostname, port, projectRoot);
    if (state.kind === 'other-project') {
      error(
        chalk.red(
          `❌ ${opts.url} is currently served by a different SolidX project's MCP server. ` +
            `Stop it and start this project's server, or pass --force to select ${opts.projectName} anyway.`,
        ),
      );
      return 1;
    }
  }

  let result: ActivationResult;
  try {
    result = await activateMcpRegistration(
      {
        ...deps.activation,
        target: {
          projectName: opts.projectName,
          serverName: opts.serverName,
          url: opts.url,
          apiKey: opts.apiKey,
          ...(projectRoot ? { projectRoot } : {}),
        },
        targetMode: 'install',
        source: 'install',
        clients: opts.agents,
        homeDir,
        force: opts.force,
      },
      { dryRun: opts.dryRun },
    );
  } catch (err: unknown) {
    error(chalk.red(`❌ ${err instanceof Error ? err.message : String(err)}`));
    return 1;
  }

  log('');
  log(
    chalk.cyan(
      `SolidX MCP install — server "${opts.serverName}" (project ${opts.projectName})`,
    ),
  );
  for (const line of formatActivationReport(result)) log(`  ${line}`);
  log('');
  if (opts.dryRun) {
    log(chalk.yellow('Dry run — no files were modified.'));
  }
  const reload = clientsNeedingReload(result);
  if (reload.length) {
    log(
      chalk.yellow(
        `Restart or reload these clients to apply the change: ${reload.join(', ')}`,
      ),
    );
  }
  return result.hadError ? 1 : 0;
}

export async function runMcpInstall(raw: RawInstallOptions): Promise<void> {
  const exitCode = await executeMcpInstall(raw);
  if (exitCode !== 0) process.exit(exitCode);
}

export function registerMcpInstallCommand(mcp: Command) {
  mcp
    .command('install')
    .description(
      'Register this project with Claude Code, Cursor, Codex and Claude Desktop, and make it the only active SolidX local MCP server in each',
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
    .option(
      '--dry-run',
      'Print the planned activation and deactivation changes, touch nothing',
    )
    .option(
      '--force',
      "Rewrite entries even when unchanged, and select this project even if another project's MCP server is running on the URL",
    )
    .action(async (options: RawInstallOptions) => {
      await runMcpInstall(options);
    });
}
