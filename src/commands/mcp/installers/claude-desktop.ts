import fs from 'fs-extra';
import path from 'path';
import {
  AgentInstallResult,
  AgentInstaller,
  InstallDeps,
  McpInstallOptions,
} from './types';
import { claudeDesktopConfigPath, backupFile } from './config-paths';

/** Stdio bridge entry for mcp-remote, OS-branched command shape. */
export function buildClaudeDesktopEntry(
  opts: McpInstallOptions,
  platform: NodeJS.Platform,
): { command: string; args: string[] } {
  const urlWithSlash = opts.url.endsWith('/') ? opts.url : `${opts.url}/`;
  const headerArg = `solidx-api-key:${opts.apiKey}`;
  if (platform === 'win32') {
    return {
      command: 'cmd',
      args: [
        '/c',
        'npx',
        '-y',
        'mcp-remote',
        urlWithSlash,
        '--header',
        headerArg,
      ],
    };
  }
  return {
    command: 'npx',
    args: ['-y', 'mcp-remote', urlWithSlash, '--header', headerArg],
  };
}

type DesktopConfig = {
  mcpServers?: Record<string, { command: string; args: string[] }>;
};

/** Pure merge: returns the new config object and whether anything changed. */
export function mergeClaudeDesktopConfig(
  existing: DesktopConfig,
  opts: McpInstallOptions,
  platform: NodeJS.Platform,
): { config: DesktopConfig; changed: boolean } {
  const entry = buildClaudeDesktopEntry(opts, platform);
  const servers: Record<string, { command: string; args: string[] }> = {
    ...(existing.mcpServers || {}),
  };
  const current = servers[opts.serverName];
  const changed = !current || JSON.stringify(current) !== JSON.stringify(entry);
  servers[opts.serverName] = entry;
  return { config: { ...existing, mcpServers: servers }, changed };
}

export interface ClaudeDesktopInstallDeps extends InstallDeps {
  platform?: NodeJS.Platform;
  appData?: string;
}

function resolveDeps(d: ClaudeDesktopInstallDeps) {
  const platform = d.platform ?? process.platform;
  const appData =
    d.appData ?? (platform === 'win32' ? process.env.APPDATA : undefined);
  return {
    platform,
    configPath: claudeDesktopConfigPath({
      homeDir: d.injectedHomeDir,
      platform,
      appData,
    }),
  };
}

function runInstall(
  opts: McpInstallOptions,
  deps: ClaudeDesktopInstallDeps,
): AgentInstallResult {
  const { platform, configPath } = resolveDeps(deps);
  const existing: DesktopConfig = fs.existsSync(configPath)
    ? (JSON.parse(fs.readFileSync(configPath, 'utf8')) as DesktopConfig)
    : {};
  const { config, changed } = mergeClaudeDesktopConfig(
    existing,
    opts,
    platform,
  );

  if (!changed && !opts.force) {
    return {
      agent: 'claude-desktop',
      status: 'skipped',
      message: `already installed (${opts.serverName})`,
    };
  }

  if (opts.dryRun) {
    return {
      agent: 'claude-desktop',
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
    agent: 'claude-desktop',
    status: 'installed',
    message: `wrote ${configPath}`,
    backupPath,
  };
}

export const claudeDesktopInstaller: AgentInstaller = {
  name: 'claude-desktop',
  isDetected: () => {
    try {
      return fs.existsSync(claudeDesktopConfigPath());
    } catch {
      return false;
    }
  },
  install: (opts, deps?) =>
    Promise.resolve(runInstall(opts, (deps as ClaudeDesktopInstallDeps) ?? {})),
};
