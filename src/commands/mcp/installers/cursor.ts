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
  cursorConfigPath,
  backupFile,
  commandExists,
  isCursorDesktopInstalled,
} from './config-paths';

export interface CursorEntry {
  url: string;
  headers: { 'solidx-api-key': string };
}

export function buildCursorEntry(opts: McpInstallOptions): CursorEntry {
  return { url: opts.url, headers: { 'solidx-api-key': opts.apiKey } };
}

type CursorConfig = { mcpServers?: Record<string, CursorEntry> };

export function mergeCursorConfig(
  existing: CursorConfig,
  opts: McpInstallOptions,
): { config: CursorConfig; changed: boolean } {
  const entry = buildCursorEntry(opts);
  const servers: Record<string, CursorEntry> = {
    ...(existing.mcpServers || {}),
  };
  const current = servers[opts.serverName];
  const changed = !current || JSON.stringify(current) !== JSON.stringify(entry);
  servers[opts.serverName] = entry;
  return { config: { ...existing, mcpServers: servers }, changed };
}

/** True when the cursor CLI supports `mcp add --url ... --header ...`. */
function cliSupportsHeaderFlags(mockCli?: boolean): boolean {
  if (mockCli === false) return false;
  if (!commandExists('cursor')) return false;
  const help = spawnSync('cursor', ['mcp', 'add', '--help'], {
    stdio: 'pipe',
  });
  const text =
    (help.stdout?.toString() || '') + (help.stderr?.toString() || '');
  return /--url/.test(text) && /--header/.test(text);
}

export interface CursorInstallDeps extends InstallDeps {
  cliAvailable?: boolean;
}

function runInstall(
  opts: McpInstallOptions,
  deps: CursorInstallDeps,
): AgentInstallResult {
  const homeDir = deps.injectedHomeDir;
  const configPath = cursorConfigPath(homeDir);

  if (cliSupportsHeaderFlags(deps.cliAvailable) && !opts.dryRun) {
    return installViaCli(opts);
  }
  return installViaFile(opts, configPath);
}

function installViaCli(opts: McpInstallOptions): AgentInstallResult {
  // CLI is idempotent-aware: check existing via `cursor mcp get <name>`.
  const get = spawnSync('cursor', ['mcp', 'get', opts.serverName], {
    stdio: 'pipe',
  });
  const existingText =
    (get.stdout?.toString() || '') + (get.stderr?.toString() || '');
  const alreadyPresent =
    get.status === 0 && !/not/i.test(existingText.split('\n')[0] || '');

  if (alreadyPresent && !opts.force) {
    return {
      agent: 'cursor',
      status: 'skipped',
      message: `already installed (${opts.serverName})`,
    };
  }
  if (alreadyPresent && opts.force) {
    spawnSync('cursor', ['mcp', 'remove', opts.serverName], {
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });
  }
  const add = spawnSync(
    'cursor',
    [
      'mcp',
      'add',
      opts.serverName,
      '--url',
      opts.url,
      '--header',
      `solidx-api-key:${opts.apiKey}`,
    ],
    { stdio: 'pipe', shell: process.platform === 'win32' },
  );
  if (add.status !== 0) {
    return {
      agent: 'cursor',
      status: 'error',
      message: `cursor mcp add failed: ${(add.stderr?.toString() || '').trim()}`,
    };
  }
  return {
    agent: 'cursor',
    status: 'installed',
    message: `installed via cursor CLI (${opts.serverName})`,
  };
}

function installViaFile(
  opts: McpInstallOptions,
  configPath: string,
): AgentInstallResult {
  const existing: CursorConfig = fs.existsSync(configPath)
    ? (JSON.parse(fs.readFileSync(configPath, 'utf8')) as CursorConfig)
    : {};
  const { config, changed } = mergeCursorConfig(existing, opts);
  if (!changed && !opts.force) {
    return {
      agent: 'cursor',
      status: 'skipped',
      message: `already installed (${opts.serverName})`,
    };
  }
  if (opts.dryRun) {
    return {
      agent: 'cursor',
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
    agent: 'cursor',
    status: 'installed',
    message: `wrote ${configPath}`,
    backupPath,
  };
}

export const cursorInstaller: AgentInstaller = {
  name: 'cursor',
  isDetected: () =>
    commandExists('cursor') ||
    fs.existsSync(cursorConfigPath()) ||
    isCursorDesktopInstalled(),
  install: (opts, deps?) =>
    Promise.resolve(runInstall(opts, (deps as CursorInstallDeps) ?? {})),
};
