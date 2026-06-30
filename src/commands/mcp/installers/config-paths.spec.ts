import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import {
  claudeCodeConfigPath,
  cursorConfigPath,
  codexConfigPath,
  claudeDesktopConfigPath,
  backupFile,
  commandExists,
} from './config-paths';

describe('config paths', () => {
  it('claudeCodeConfigPath resolves under home dir', () => {
    expect(claudeCodeConfigPath('/home/u')).toBe('/home/u/.claude.json');
  });

  it('cursorConfigPath resolves .cursor/mcp.json under home dir', () => {
    expect(cursorConfigPath('/home/u')).toBe('/home/u/.cursor/mcp.json');
  });

  it('codexConfigPath resolves .codex/config.toml under home dir', () => {
    expect(codexConfigPath('/home/u')).toBe('/home/u/.codex/config.toml');
  });

  it('claudeDesktopConfigPath resolves per-platform macOS', () => {
    const home = '/Users/u';
    expect(claudeDesktopConfigPath({ homeDir: home, platform: 'darwin' })).toBe(
      '/Users/u/Library/Application Support/Claude/claude_desktop_config.json',
    );
  });

  it('claudeDesktopConfigPath resolves per-platform Linux (XDG)', () => {
    expect(
      claudeDesktopConfigPath({ homeDir: '/home/u', platform: 'linux' }),
    ).toBe('/home/u/.config/Claude/claude_desktop_config.json');
  });

  it('claudeDesktopConfigPath resolves per-platform Windows via APPDATA', () => {
    const expected = path.join(
      'C:\\Users\\u\\AppData\\Roaming',
      'Claude',
      'claude_desktop_config.json',
    );
    expect(
      claudeDesktopConfigPath({
        homeDir: 'C:\\Users\\u',
        platform: 'win32',
        appData: 'C:\\Users\\u\\AppData\\Roaming',
      }),
    ).toBe(expected);
  });

  it('claudeDesktopConfigPath errors on Windows when APPDATA unset', () => {
    expect(() =>
      claudeDesktopConfigPath({
        homeDir: 'C:\\Users\\u',
        platform: 'win32',
        appData: undefined,
      }),
    ).toThrow(/APPDATA/i);
  });
});

describe('backupFile', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-bak-'));
  });
  afterEach(() => {
    fs.removeSync(tmp);
  });

  it('returns null and writes nothing when source absent', () => {
    const result = backupFile(path.join(tmp, 'nope.json'));
    expect(result).toBeNull();
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  it('copies to .solidx-bak-<timestamp> when source present', () => {
    const src = path.join(tmp, 'cfg.json');
    fs.writeFileSync(src, '{"a":1}');
    const result = backupFile(src);
    expect(result).toBeTruthy();
    expect(result).toMatch(/cfg\.json\.solidx-bak-\d{8}-\d{6}$/);
    expect(fs.existsSync(result as string)).toBe(true);
    expect(fs.readFileSync(result as string, 'utf8')).toBe('{"a":1}');
  });
});

describe('commandExists', () => {
  it('returns true for a binary that definitely exists on the test platform', () => {
    // `node` is guaranteed present because jest itself runs under node
    expect(commandExists('node')).toBe(true);
  });

  it('returns false for a nonsense name', () => {
    expect(commandExists('this-binary-does-not-exist-xyz')).toBe(false);
  });
});
