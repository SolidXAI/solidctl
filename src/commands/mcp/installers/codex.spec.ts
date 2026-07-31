import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import {
  injectCodexTomlHeaders,
  buildCodexTomlBlock,
  codexInstaller,
} from './codex';
import { codexConfigPath } from './config-paths';
import { McpInstallOptions } from './types';

const OPTS: McpInstallOptions = {
  projectName: 'new-todo-app',
  apiKey: 'sldx_abc123',
  url: 'http://localhost:9000/mcp',
  serverName: 'solidx-new-todo-app-mcp',
  dryRun: false,
  force: false,
};

describe('buildCodexTomlBlock', () => {
  it('emits the enabled + url + http_headers sub-table', () => {
    expect(buildCodexTomlBlock(OPTS)).toBe(
      [
        `[mcp_servers.solidx-new-todo-app-mcp]`,
        `enabled = true`,
        `url = "http://localhost:9000/mcp"`,
        ``,
        `[mcp_servers.solidx-new-todo-app-mcp.http_headers]`,
        `solidx-api-key = "sldx_abc123"`,
        ``,
      ].join('\n'),
    );
  });
});

describe('injectCodexTomlHeaders (full-edit / fallback path)', () => {
  it('appends block when none exists', () => {
    const existing = 'model = "gpt-5"\n';
    const { content, changed } = injectCodexTomlHeaders(existing, OPTS);
    expect(changed).toBe(true);
    expect(content).toContain(buildCodexTomlBlock(OPTS).trim());
    expect(content).toContain('model = "gpt-5"');
  });

  it('replaces an existing block when value differs', () => {
    const existing = `model = "gpt-5"\n[mcp_servers.solidx-new-todo-app-mcp]\nenabled = true\nurl = "http://localhost:9000/old"\n\n[mcp_servers.solidx-new-todo-app-mcp.http_headers]\nsolidx-api-key = "old"\n`;
    const { content, changed } = injectCodexTomlHeaders(existing, OPTS);
    expect(changed).toBe(true);
    expect(content).toContain('url = "http://localhost:9000/mcp"');
    expect(content).toContain('solidx-api-key = "sldx_abc123"');
    expect(content).not.toContain('9000/old');
    expect(content).not.toContain('"old"');
    expect(content).toContain('model = "gpt-5"');
  });

  it('is idempotent when block is identical', () => {
    const existing = `model = "gpt-5"\n\n${buildCodexTomlBlock(OPTS)}`;
    const { content, changed } = injectCodexTomlHeaders(existing, OPTS);
    expect(changed).toBe(false);
    expect(content).toBe(existing);
  });

  it('preserves other mcp_servers blocks', () => {
    const existing = `[mcp_servers.node_repl]\nenabled = true\nargs = []\n\n${buildCodexTomlBlock(OPTS)}`;
    const { content } = injectCodexTomlHeaders(existing, OPTS);
    expect(content).toContain('[mcp_servers.node_repl]');
    expect(content).toContain('args = []');
  });
});

describe('codexInstaller (file-only fallback via inject)', () => {
  let tmpHome: string;
  let configPath: string;
  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-codex-'));
    configPath = codexConfigPath(tmpHome);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  });
  afterEach(() => fs.removeSync(tmpHome));

  it('writes config file when cliAvailable false (full-edit fallback)', async () => {
    const res = await codexInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('installed');
    const written = fs.readFileSync(configPath, 'utf8');
    expect(written).toContain('url = "http://localhost:9000/mcp"');
    expect(written).toContain('solidx-api-key = "sldx_abc123"');
  });

  it('skips when identical', async () => {
    await codexInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    const before = fs.readFileSync(configPath, 'utf8');
    const res = await codexInstaller.install(
      { ...OPTS },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('skipped');
    expect(fs.readFileSync(configPath, 'utf8')).toBe(before);
  });

  it('dry-run touches nothing', async () => {
    const res = await codexInstaller.install(
      { ...OPTS, dryRun: true },
      { injectedHomeDir: tmpHome, cliAvailable: false },
    );
    expect(res.status).toBe('installed');
    expect(fs.existsSync(configPath)).toBe(false);
  });
});
