import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import {
  buildClaudeDesktopEntry,
  mergeClaudeDesktopConfig,
  claudeDesktopInstaller,
} from './claude-desktop';
import { claudeDesktopConfigPath } from './config-paths';
import { McpInstallOptions } from './types';

const OPTS: McpInstallOptions = {
  projectName: 'new-todo-app',
  apiKey: 'sldx_abc123',
  url: 'http://localhost:9000/mcp',
  serverName: 'solidx-new-todo-app-mcp',
  dryRun: false,
  force: false,
};

describe('buildClaudeDesktopEntry', () => {
  it('uses bare npx on darwin/linux, URL gets trailing slash', () => {
    const entry = buildClaudeDesktopEntry(OPTS, 'darwin');
    expect(entry).toEqual({
      command: 'npx',
      args: [
        '-y',
        'mcp-remote',
        'http://localhost:9000/mcp/',
        '--header',
        'solidx-api-key:sldx_abc123',
      ],
    });
  });

  it('wraps npx in cmd /c on win32', () => {
    const entry = buildClaudeDesktopEntry(OPTS, 'win32');
    expect(entry).toEqual({
      command: 'cmd',
      args: [
        '/c',
        'npx',
        '-y',
        'mcp-remote',
        'http://localhost:9000/mcp/',
        '--header',
        'solidx-api-key:sldx_abc123',
      ],
    });
  });
});

describe('mergeClaudeDesktopConfig', () => {
  it('creates mcpServers in an empty config', () => {
    const { config, changed } = mergeClaudeDesktopConfig({}, OPTS, 'darwin');
    expect(changed).toBe(true);
    expect(config.mcpServers).toBeDefined();
  });

  it('adds the entry under mcpServers', () => {
    const { config } = mergeClaudeDesktopConfig({}, OPTS, 'darwin');
    expect(config.mcpServers![OPTS.serverName]).toEqual(
      buildClaudeDesktopEntry(OPTS, 'darwin'),
    );
  });

  it('is idempotent when an identical entry already exists', () => {
    const first = mergeClaudeDesktopConfig({}, OPTS, 'darwin');
    const second = mergeClaudeDesktopConfig(first.config, OPTS, 'darwin');
    expect(second.changed).toBe(false);
  });

  it('replaces a differing entry', () => {
    const initial = {
      mcpServers: { [OPTS.serverName]: { command: 'old', args: [] } },
    };
    const { config, changed } = mergeClaudeDesktopConfig(
      initial,
      OPTS,
      'darwin',
    );
    expect(changed).toBe(true);
    expect(config.mcpServers![OPTS.serverName].command).toBe('npx');
  });

  it('preserves unrelated servers', () => {
    const initial = {
      mcpServers: { other: { command: 'x', args: ['y'] } },
    };
    const { config } = mergeClaudeDesktopConfig(initial, OPTS, 'darwin');
    expect(config.mcpServers!.other).toEqual({ command: 'x', args: ['y'] });
  });
});

describe('claudeDesktopInstaller.install', () => {
  let tmpHome: string;
  let configPath: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-cd-'));
    configPath = claudeDesktopConfigPath({
      homeDir: tmpHome,
      platform: process.platform,
      appData:
        process.platform === 'win32'
          ? path.join(tmpHome, 'AppData', 'Roaming')
          : undefined,
    });
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  });
  afterEach(() => fs.removeSync(tmpHome));

  it('writes a new config and reports installed', async () => {
    const res = await claudeDesktopInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome },
    );
    expect(res.status).toBe('installed');
    const written = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(written.mcpServers[OPTS.serverName].command).toBe(
      process.platform === 'win32' ? 'cmd' : 'npx',
    );
  });

  it('skips without writing a backup when entry already identical', async () => {
    await claudeDesktopInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome },
    );
    const before = fs.readFileSync(configPath, 'utf8');
    const res = await claudeDesktopInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome },
    );
    expect(res.status).toBe('skipped');
    expect(fs.readFileSync(configPath, 'utf8')).toBe(before);
    expect(
      fs
        .readdirSync(path.dirname(configPath))
        .filter((f) => f.includes('solidx-bak')),
    ).toEqual([]);
  });

  it('backs up and replaces a differing entry', async () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: { [OPTS.serverName]: { command: 'old', args: [] } },
      }),
    );
    const res = await claudeDesktopInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome },
    );
    expect(res.status).toBe('installed');
    expect(res.backupPath).toBeTruthy();
    expect(fs.existsSync(res.backupPath as string)).toBe(true);
  });

  it('dry-run touches nothing', async () => {
    const res = await claudeDesktopInstaller.install(
      { ...OPTS, dryRun: true },
      { injectedHomeDir: tmpHome },
    );
    expect(res.status).toBe('installed');
    expect(fs.existsSync(configPath)).toBe(false);
  });

  it('force rewrites even when identical', async () => {
    await claudeDesktopInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome },
    );
    const res = await claudeDesktopInstaller.install(
      { ...OPTS, force: true },
      { injectedHomeDir: tmpHome },
    );
    expect(res.status).toBe('installed');
    expect(res.backupPath).toBeTruthy();
  });
});
