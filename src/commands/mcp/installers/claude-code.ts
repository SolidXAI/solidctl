import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import {
  AgentInstallResult,
  AgentInstaller,
  InstallDeps,
  McpInstallOptions,
} from './types';
import {
  claudeCodeConfigPath,
  backupFile,
  commandExists,
} from './config-paths';

export interface ClaudeCodeEntry {
  type: 'http';
  url: string;
  headers: { 'solidx-api-key': string };
}

export function buildClaudeCodeEntry(opts: McpInstallOptions): ClaudeCodeEntry {
  return {
    type: 'http',
    url: opts.url,
    headers: { 'solidx-api-key': opts.apiKey },
  };
}

type ClaudeCodeConfig = {
  mcpServers?: Record<string, ClaudeCodeEntry>;
  [k: string]: unknown;
};

export function mergeClaudeCodeConfig(
  existing: ClaudeCodeConfig,
  opts: McpInstallOptions,
): { config: ClaudeCodeConfig; changed: boolean } {
  const entry = buildClaudeCodeEntry(opts);
  const servers: Record<string, ClaudeCodeEntry> = {
    ...(existing.mcpServers || {}),
  };
  const current = servers[opts.serverName];
  const changed = !current || JSON.stringify(current) !== JSON.stringify(entry);
  servers[opts.serverName] = entry;
  return { config: { ...existing, mcpServers: servers }, changed };
}

export interface ClaudeCodeInstallDeps extends InstallDeps {
  cliAvailable?: boolean;
}

function runInstall(
  opts: McpInstallOptions,
  deps: ClaudeCodeInstallDeps,
): AgentInstallResult {
  const homeDir = deps.injectedHomeDir;
  const configPath = claudeCodeConfigPath(homeDir);
  const cliAvailable = deps.cliAvailable ?? commandExists('claude');

  if (cliAvailable && !opts.dryRun) {
    return installViaCli(opts);
  }
  return installViaFile(opts, configPath);
}

function installViaCli(opts: McpInstallOptions): AgentInstallResult {
  // Idempotency check via `claude mcp get <name>`.
  const get = spawnSync('claude', ['mcp', 'get', opts.serverName], {
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
  const present = get.status === 0;
  const getOut =
    (get.stdout?.toString() || '') + (get.stderr?.toString() || '');

  if (
    present &&
    !opts.force &&
    getOut.includes(opts.url) &&
    getOut.includes('solidx-api-key')
  ) {
    return {
      agent: 'claude-code',
      status: 'skipped',
      message: `already installed (${opts.serverName})`,
    };
  }
  if (
    present &&
    (opts.force ||
      !getOut.includes(opts.url) ||
      !getOut.includes('solidx-api-key'))
  ) {
    spawnSync('claude', ['mcp', 'remove', opts.serverName, '-s', 'user'], {
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });
  }
  const add = spawnSync(
    'claude',
    [
      'mcp',
      'add',
      '-s',
      'user',
      '-t',
      'http',
      opts.serverName,
      opts.url,
      '--header',
      `solidx-api-key: ${opts.apiKey}`,
    ],
    { stdio: 'pipe', shell: process.platform === 'win32' },
  );
  if (add.status !== 0) {
    return {
      agent: 'claude-code',
      status: 'error',
      message: `claude mcp add failed: ${(add.stderr?.toString() || '').trim()}`,
    };
  }
  return {
    agent: 'claude-code',
    status: 'installed',
    message: `installed via claude CLI (${opts.serverName})`,
  };
}

function installViaFile(
  opts: McpInstallOptions,
  configPath: string,
): AgentInstallResult {
  const existing: ClaudeCodeConfig = fs.existsSync(configPath)
    ? (JSON.parse(fs.readFileSync(configPath, 'utf8')) as ClaudeCodeConfig)
    : {};
  const { config, changed } = mergeClaudeCodeConfig(existing, opts);
  if (!changed && !opts.force) {
    return {
      agent: 'claude-code',
      status: 'skipped',
      message: `already installed (${opts.serverName})`,
    };
  }
  if (opts.dryRun) {
    return {
      agent: 'claude-code',
      status: 'installed',
      message: `would write ${configPath}`,
    };
  }
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const backupPath = fs.existsSync(configPath)
    ? (backupFile(configPath) ?? undefined)
    : undefined;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return {
    agent: 'claude-code',
    status: 'installed',
    message: `wrote ${configPath}`,
    backupPath,
  };
}

export const claudeCodeInstaller: AgentInstaller = {
  name: 'claude-code',
  isDetected: () => commandExists('claude'),
  install: (opts, deps?) =>
    Promise.resolve(runInstall(opts, (deps as ClaudeCodeInstallDeps) ?? {})),
};
