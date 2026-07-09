import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import {
  AgentInstallResult,
  AgentInstaller,
  InstallDeps,
  McpInstallOptions,
} from './types';
import { codexConfigPath, backupFile, commandExists } from './config-paths';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildCodexTomlBlock(opts: McpInstallOptions): string {
  const headerSection = `${opts.serverName}.http_headers`;
  return [
    `[mcp_servers.${opts.serverName}]`,
    `enabled = true`,
    `url = "${opts.url}"`,
    ``,
    `[mcp_servers.${headerSection}]`,
    `solidx-api-key = "${opts.apiKey}"`,
    ``,
  ].join('\n');
}

/**
 * Surgical TOML transform: locate any existing
 * `[mcp_servers.<name>]` block (plus its
 * `[mcp_servers.<name>.http_headers]` child if present) and replace it
 * wholesale with the regenerated block, or append a new block.
 * Preserves everything else. Returns whether the content changed.
 *
 * Uses string text (no TOML parser dependency).
 */
export function injectCodexTomlHeaders(
  existingText: string,
  opts: McpInstallOptions,
): { content: string; changed: boolean } {
  const fresh = buildCodexTomlBlock(opts);
  const headerTableLine = `[mcp_servers.${opts.serverName}.http_headers]`;
  const serverTableLine = `[mcp_servers.${opts.serverName}]`;

  const escServer = escapeRegex(serverTableLine);
  const escHeader = escapeRegex(headerTableLine);

  // Match the server table header line, its body lines (until the next
  // top-level [table] header), and optionally the http_headers sub-table
  // + its body. 'm' flag makes ^/$ match at line boundaries.
  const source = `^[ \\t]*${escServer}[^\\n]*\\n(?:(?!^[ \\t]*\\[[^\\]]+\\][^\\n]*\\n)[^\\n]*\\n)*(?:^[ \\t]*${escHeader}[^\\n]*\\n(?:(?!^[ \\t]*\\[[^\\]]+\\][^\\n]*\\n)[^\\n]*\\n)*)?`;
  const blockRe = new RegExp(source, 'm');

  const match = existingText.match(blockRe);
  const paddedFresh = fresh.endsWith('\n') ? fresh : `${fresh}\n`;

  if (match) {
    const matched = match[0];
    if (matched === paddedFresh) {
      return { content: existingText, changed: false };
    }
    const idx = match.index ?? 0;
    const content =
      existingText.slice(0, idx) +
      paddedFresh +
      existingText.slice(idx + matched.length);
    return { content, changed: true };
  }

  // Append a new block (with a leading blank line when the file is non-empty
  // and not already trailing a blank line, so we get exactly one separator).
  const separator =
    existingText.length === 0 ? '' : existingText.endsWith('\n\n') ? '' : '\n';
  const content = existingText + separator + fresh;
  return { content, changed: true };
}

export interface CodexInstallDeps extends InstallDeps {
  cliAvailable?: boolean;
}

function runInstall(
  opts: McpInstallOptions,
  deps: CodexInstallDeps,
): AgentInstallResult {
  const homeDir = deps.injectedHomeDir;
  const configPath = codexConfigPath(homeDir);
  const cliAvailable = deps.cliAvailable ?? commandExists('codex');

  if (cliAvailable && !opts.dryRun) {
    return installViaCli(opts, configPath);
  }
  return installViaFileFallback(opts, configPath);
}

function installViaCli(
  opts: McpInstallOptions,
  configPath: string,
): AgentInstallResult {
  const get = spawnSync('codex', ['mcp', 'get', opts.serverName], {
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
  const getOut =
    (get.stdout?.toString() || '') + (get.stderr?.toString() || '');
  const present = get.status === 0 && !/not found|no entry/i.test(getOut);

  // The CLI cannot write http_headers, so we always run the surgical
  // injection afterwards to set/refresh the solidx-api-key header.
  if (present) {
    const existingText = fs.existsSync(configPath)
      ? fs.readFileSync(configPath, 'utf8')
      : '';
    const injection = injectCodexTomlHeaders(existingText, opts);
    if (!injection.changed && !opts.force) {
      return {
        agent: 'codex',
        status: 'skipped',
        message: `already installed (${opts.serverName})`,
      };
    }
    const backupPath = fs.existsSync(configPath)
      ? (backupFile(configPath) ?? undefined)
      : undefined;
    fs.writeFileSync(configPath, injection.content);
    return {
      agent: 'codex',
      status: 'installed',
      message: `updated headers for ${opts.serverName}`,
      backupPath,
    };
  }

  // Not present → CLI add, then write headers.
  const add = spawnSync(
    'codex',
    ['mcp', 'add', '--url', opts.url, opts.serverName],
    { stdio: 'pipe', shell: process.platform === 'win32' },
  );
  if (add.status !== 0) {
    return {
      agent: 'codex',
      status: 'error',
      message: `codex mcp add failed: ${(add.stderr?.toString() || '').trim()}`,
    };
  }
  const afterAdd = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, 'utf8')
    : '';
  const injection = injectCodexTomlHeaders(afterAdd, opts);
  const backupPath = fs.existsSync(configPath)
    ? (backupFile(configPath) ?? undefined)
    : undefined;
  if (injection.changed) {
    fs.writeFileSync(configPath, injection.content);
  }
  return {
    agent: 'codex',
    status: 'installed',
    message: `installed via codex CLI (${opts.serverName})`,
    backupPath,
  };
}

function installViaFileFallback(
  opts: McpInstallOptions,
  configPath: string,
): AgentInstallResult {
  const existing = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, 'utf8')
    : '';
  const { content, changed } = injectCodexTomlHeaders(existing, opts);
  if (!changed && !opts.force) {
    return {
      agent: 'codex',
      status: 'skipped',
      message: `already installed (${opts.serverName})`,
    };
  }
  if (opts.dryRun) {
    return {
      agent: 'codex',
      status: 'installed',
      message: `would write ${configPath}`,
    };
  }
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const backupPath = fs.existsSync(configPath)
    ? (backupFile(configPath) ?? undefined)
    : undefined;
  fs.writeFileSync(configPath, content);
  return {
    agent: 'codex',
    status: 'installed',
    message: `wrote ${configPath}`,
    backupPath,
  };
}

export const codexInstaller: AgentInstaller = {
  name: 'codex',
  isDetected: () => commandExists('codex') || fs.existsSync(codexConfigPath()),
  install: (opts, deps?) =>
    Promise.resolve(runInstall(opts, (deps as CodexInstallDeps) ?? {})),
};
