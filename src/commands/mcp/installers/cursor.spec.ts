import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { buildCursorEntry, mergeCursorConfig, cursorInstaller } from './cursor';
import { cursorConfigPath } from './config-paths';
import { McpInstallOptions } from './types';

const OPTS: McpInstallOptions = {
  projectName: 'new-todo-app',
  apiKey: 'sldx_abc123',
  url: 'http://localhost:9000/mcp',
  serverName: 'solidx-new-todo-app-mcp',
  dryRun: false,
  force: false,
};

describe('buildCursorEntry', () => {
  it('builds url + headers entry', () => {
    expect(buildCursorEntry(OPTS)).toEqual({
      url: 'http://localhost:9000/mcp',
      headers: { 'solidx-api-key': 'sldx_abc123' },
    });
  });
});

describe('mergeCursorConfig', () => {
  it('creates mcpServers in empty config', () => {
    const { config, changed } = mergeCursorConfig({}, OPTS);
    expect(changed).toBe(true);
    expect(config.mcpServers![OPTS.serverName]).toEqual(buildCursorEntry(OPTS));
  });
  it('idempotent on identical entry', () => {
    const first = mergeCursorConfig({}, OPTS);
    const second = mergeCursorConfig(first.config, OPTS);
    expect(second.changed).toBe(false);
  });
  it('replaces differing entry', () => {
    const init = {
      mcpServers: { [OPTS.serverName]: { url: 'old', headers: {} } },
    } as unknown as Parameters<typeof mergeCursorConfig>[0];
    const { config, changed } = mergeCursorConfig(init, OPTS);
    expect(changed).toBe(true);
    expect(config.mcpServers![OPTS.serverName].url).toBe(OPTS.url);
  });
  it('preserves unrelated servers', () => {
    const init = {
      mcpServers: { other: { url: 'x', headers: {} } },
    } as unknown as Parameters<typeof mergeCursorConfig>[0];
    const { config } = mergeCursorConfig(init, OPTS);
    expect(config.mcpServers!.other).toEqual({ url: 'x', headers: {} });
  });
});

describe('cursorInstaller.install', () => {
  let tmpHome: string;
  let configPath: string;
  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-cur-'));
    configPath = cursorConfigPath(tmpHome);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  });
  afterEach(() => fs.removeSync(tmpHome));

  it('writes new config (no CLI path available → file fallback)', async () => {
    const res = await cursorInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('installed');
    const written = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      mcpServers: Record<
        string,
        { url: string; headers: Record<string, string> }
      >;
    };
    expect(written.mcpServers[OPTS.serverName].url).toBe(OPTS.url);
  });

  it('skips without backup when identical', async () => {
    await cursorInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    const before = fs.readFileSync(configPath, 'utf8');
    const res = await cursorInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('skipped');
    expect(fs.readFileSync(configPath, 'utf8')).toBe(before);
  });

  it('backs up and replaces a differing entry', async () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: { [OPTS.serverName]: { url: 'old', headers: {} } },
      }),
    );
    const res = await cursorInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('installed');
    expect(res.backupPath).toBeTruthy();
  });

  it('dry-run touches nothing', async () => {
    const res = await cursorInstaller.install(
      { ...OPTS, dryRun: true },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('installed');
    expect(fs.existsSync(configPath)).toBe(false);
  });
});
