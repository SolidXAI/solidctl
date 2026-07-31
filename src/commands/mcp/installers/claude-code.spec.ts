import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import {
  buildClaudeCodeEntry,
  mergeClaudeCodeConfig,
  claudeCodeInstaller,
} from './claude-code';
import { claudeCodeConfigPath } from './config-paths';
import { McpInstallOptions } from './types';

const OPTS: McpInstallOptions = {
  projectName: 'new-todo-app',
  apiKey: 'sldx_abc123',
  url: 'http://localhost:9000/mcp',
  serverName: 'solidx-new-todo-app-mcp',
  dryRun: false,
  force: false,
};

describe('buildClaudeCodeEntry', () => {
  it('builds http type with url + headers', () => {
    expect(buildClaudeCodeEntry(OPTS)).toEqual({
      type: 'http',
      url: 'http://localhost:9000/mcp',
      headers: { 'solidx-api-key': 'sldx_abc123' },
    });
  });
});

describe('mergeClaudeCodeConfig', () => {
  it('adds server under top-level mcpServers', () => {
    const { config, changed } = mergeClaudeCodeConfig({}, OPTS);
    expect(changed).toBe(true);
    expect(config.mcpServers![OPTS.serverName]).toEqual(
      buildClaudeCodeEntry(OPTS),
    );
  });
  it('idempotent on identical', () => {
    const first = mergeClaudeCodeConfig({}, OPTS);
    const second = mergeClaudeCodeConfig(first.config, OPTS);
    expect(second.changed).toBe(false);
  });
  it('replaces differing url', () => {
    const init = {
      mcpServers: {
        [OPTS.serverName]: {
          type: 'http' as const,
          url: 'old',
          headers: { 'solidx-api-key': 'x' },
        },
      },
    };
    const { config, changed } = mergeClaudeCodeConfig(init, OPTS);
    expect(changed).toBe(true);
    expect(config.mcpServers![OPTS.serverName].url).toBe(OPTS.url);
  });
});

describe('claudeCodeInstaller (file fallback via inject)', () => {
  let tmpHome: string;
  let configPath: string;
  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-cc-'));
    configPath = claudeCodeConfigPath(tmpHome);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  });
  afterEach(() => fs.removeSync(tmpHome));

  it('writes mcpServers into existing ~/.claude.json, preserving other keys', async () => {
    fs.writeFileSync(configPath, JSON.stringify({ someOtherKey: 42 }));
    const res = await claudeCodeInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('installed');
    const written = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      mcpServers: Record<string, { type: string; url: string }>;
      someOtherKey: number;
    };
    expect(written.someOtherKey).toBe(42);
    expect(written.mcpServers[OPTS.serverName].type).toBe('http');
  });

  it('skips when identical', async () => {
    await claudeCodeInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    const before = fs.readFileSync(configPath, 'utf8');
    const res = await claudeCodeInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('skipped');
    expect(fs.readFileSync(configPath, 'utf8')).toBe(before);
  });

  it('backs up existing file before replacing a differing entry', async () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          [OPTS.serverName]: {
            type: 'http',
            url: 'old',
            headers: { 'solidx-api-key': 'x' },
          },
        },
      }),
    );
    const res = await claudeCodeInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('installed');
    expect(res.backupPath).toBeTruthy();
  });

  it('dry-run touches nothing', async () => {
    const res = await claudeCodeInstaller.install(
      { ...OPTS, dryRun: true },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('installed');
    expect(fs.existsSync(configPath)).toBe(false);
  });
});
