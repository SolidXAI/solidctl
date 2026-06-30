import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

/** ~/.claude.json — same on all platforms. */
export function claudeCodeConfigPath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, '.claude.json');
}

/** ~/.cursor/mcp.json — Cursor uses the home-dir .cursor folder on all platforms. */
export function cursorConfigPath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, '.cursor', 'mcp.json');
}

/** ~/.codex/config.toml — codex loads config from ~/.codex/config.toml on all platforms. */
export function codexConfigPath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, '.codex', 'config.toml');
}

export interface ClaudeDesktopPathOpts {
  homeDir?: string;
  platform?: NodeJS.Platform;
  appData?: string;
}

/** Claude Desktop config path, resolved per-OS. */
export function claudeDesktopConfigPath(
  opts: ClaudeDesktopPathOpts = {},
): string {
  const platform = opts.platform ?? process.platform;
  const homeDir = opts.homeDir ?? os.homedir();
  const filename = 'claude_desktop_config.json';
  if (platform === 'darwin') {
    return path.join(
      homeDir,
      'Library',
      'Application Support',
      'Claude',
      filename,
    );
  }
  if (platform === 'win32') {
    const appData = opts.appData ?? process.env.APPDATA;
    if (!appData) {
      throw new Error(
        'APPDATA environment variable is not set; cannot locate Claude Desktop config on Windows.',
      );
    }
    return path.join(appData, 'Claude', filename);
  }
  // linux & other: XDG default
  return path.join(homeDir, '.config', 'Claude', filename);
}

/**
 * Copy `filePath` to `<filePath>.solidx-bak-<YYYYMMDD-HHmmSS>` if it exists.
 * Returns the backup path, or null when the source file does not exist
 * (so idempotent re-runs that would create a fresh file don't pile backups).
 */
export function backupFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const backupPath = `${filePath}.solidx-bak-${ts}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/** True when `cmd` resolves on PATH and exits 0 from `which`/`where`. */
export function commandExists(
  cmd: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  const result = spawnSync(platform === 'win32' ? 'where' : 'which', [cmd], {
    stdio: 'pipe',
  });
  return result.status === 0;
}
