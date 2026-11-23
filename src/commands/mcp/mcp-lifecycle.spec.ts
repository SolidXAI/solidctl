import * as fs from 'fs-extra';
import * as http from 'http';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { CLIENT_SPECS } from './activation/clients';
import { loadRegistry } from './activation/registry';
import {
  activateMcpForRuntime,
  clientFacingUrl,
  inspectMcpPort,
  probeHost,
  probeMcpAuth,
  projectFingerprint,
  resolveRuntimeRegistration,
  waitForMcpReady,
} from './mcp-lifecycle';
import { executeMcpInstall } from './mcp-install.command';
import { prepareAgentMcp } from '../agent.command';

interface FakeServer {
  port: number;
  requests: { method?: string; url?: string; key?: string }[];
  close(): Promise<void>;
}

/** Minimal stand-in for `solidx-agent mcp-remote`. */
function startFakeMcp(opts: {
  fingerprint?: string | null;
  validKeys?: string[];
  apiDown?: boolean;
}): Promise<FakeServer> {
  const requests: FakeServer['requests'] = [];
  const server = http.createServer((req, res) => {
    const key = req.headers['solidx-api-key'] as string | undefined;
    requests.push({ method: req.method, url: req.url, key });
    req.resume();
    if (req.url === '/health') {
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'ok',
          ...(opts.fingerprint
            ? { project_fingerprint: opts.fingerprint }
            : {}),
        }),
      );
      return;
    }
    if (!key || !(opts.validKeys ?? []).includes(key)) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'invalid_api_key' }));
      return;
    }
    if (opts.apiDown) {
      res.statusCode = 502;
      res.end(JSON.stringify({ error: 'access_token_fetch_failed' }));
      return;
    }
    res.setHeader('mcp-session-id', 'sess-1');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      resolve({
        port,
        requests,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(port));
    });
  });
}

const tmp: string[] = [];
afterAll(() => tmp.forEach((d) => fs.removeSync(d)));

function makeProject(name: string): string {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-life-'));
  tmp.push(parent);
  const root = path.join(parent, name);
  for (const sub of ['solid-api', 'solid-ui']) {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
    fs.writeFileSync(path.join(root, sub, 'package.json'), '{}');
  }
  return root;
}

function makeHome(keys: Record<string, string>): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-life-home-'));
  tmp.push(home);
  for (const [project, apiKey] of Object.entries(keys)) {
    fs.mkdirSync(path.join(home, '.solidx', project), { recursive: true });
    fs.writeJsonSync(path.join(home, '.solidx', project, 'mcp.json'), {
      solidxAdminApiKey: { apiKey },
    });
  }
  return home;
}

const cursorPath = (home: string) =>
  CLIENT_SPECS.cursor.configPath({ homeDir: home, platform: 'darwin' });
const cursorOnly = {
  clients: ['cursor' as const],
  detect: () => true,
  platform: 'darwin' as const,
};

function writeCursor(home: string, servers: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(cursorPath(home)), { recursive: true });
  fs.writeFileSync(
    cursorPath(home),
    JSON.stringify({ mcpServers: servers }, null, 2),
  );
}
const readCursor = (home: string) =>
  (
    JSON.parse(fs.readFileSync(cursorPath(home), 'utf8')) as {
      mcpServers: Record<string, { url?: string; [k: string]: unknown }>;
    }
  ).mcpServers;

describe('addresses', () => {
  it('maps wildcard binds to connectable addresses', () => {
    expect(probeHost('0.0.0.0')).toBe('127.0.0.1');
    expect(clientFacingUrl('0.0.0.0', 9000, '/mcp')).toBe(
      'http://localhost:9000/mcp',
    );
    expect(clientFacingUrl('::', '9100', 'mcp/')).toBe(
      'http://localhost:9100/mcp',
    );
    expect(clientFacingUrl('192.168.1.5', 9000, '/mcp')).toBe(
      'http://192.168.1.5:9000/mcp',
    );
  });
});

describe('inspectMcpPort / waitForMcpReady', () => {
  it('distinguishes free, same project, other project, unknown and foreign listeners', async () => {
    const root = makeProject('proj-a');
    expect(await inspectMcpPort('0.0.0.0', await freePort(), root)).toEqual({
      kind: 'free',
    });

    const same = await startFakeMcp({ fingerprint: projectFingerprint(root) });
    const other = await startFakeMcp({ fingerprint: 'ffffffffffffffff' });
    const unknown = await startFakeMcp({ fingerprint: null });
    const raw = net.createServer((s) => s.destroy());
    await new Promise<void>((r) => raw.listen(0, '127.0.0.1', () => r()));
    try {
      expect(await inspectMcpPort('0.0.0.0', same.port, root)).toEqual({
        kind: 'same-project',
      });
      expect(await inspectMcpPort('0.0.0.0', other.port, root)).toEqual({
        kind: 'other-project',
      });
      expect(await inspectMcpPort('0.0.0.0', unknown.port, root)).toEqual({
        kind: 'solidx-unknown-project',
      });
      expect(
        await inspectMcpPort(
          '0.0.0.0',
          (raw.address() as net.AddressInfo).port,
          root,
        ),
      ).toEqual({ kind: 'other-process' });
    } finally {
      await Promise.all([
        same.close(),
        other.close(),
        unknown.close(),
        new Promise((r) => raw.close(r)),
      ]);
    }
  });

  it('waits for a late server, and stops or times out', async () => {
    const root = makeProject('proj-a');
    const port = await freePort();
    const late = new Promise<FakeServer>((resolve) =>
      setTimeout(() => {
        const server = http.createServer((_req, res) =>
          res.end(
            JSON.stringify({
              status: 'ok',
              project_fingerprint: projectFingerprint(root),
            }),
          ),
        );
        server.listen(port, '127.0.0.1', () =>
          resolve({
            port,
            requests: [],
            close: () => new Promise((r) => server.close(() => r())),
          }),
        );
      }, 300),
    );
    expect(
      await waitForMcpReady({
        bindHost: '0.0.0.0',
        port,
        projectRoot: root,
        intervalMs: 50,
        timeoutMs: 5000,
      }),
    ).toBe('ready');
    await (await late).close();
    expect(
      await waitForMcpReady({
        bindHost: '0.0.0.0',
        port,
        projectRoot: root,
        intervalMs: 50,
        timeoutMs: 200,
      }),
    ).toBe('timeout');
    expect(
      await waitForMcpReady({
        bindHost: '0.0.0.0',
        port,
        projectRoot: root,
        isAlive: () => false,
      }),
    ).toBe('stopped');
  });
});

describe('probeMcpAuth', () => {
  it('classifies the server answer and closes the probe session', async () => {
    const server = await startFakeMcp({
      fingerprint: 'x',
      validKeys: ['sldx_ok'],
    });
    const down = await startFakeMcp({
      fingerprint: 'x',
      validKeys: ['sldx_ok'],
      apiDown: true,
    });
    try {
      const url = `http://localhost:${server.port}/mcp`;
      expect(await probeMcpAuth(url, 'sldx_ok')).toEqual({ result: 'ok' });
      expect(server.requests.some((r) => r.method === 'DELETE')).toBe(true);
      expect(await probeMcpAuth(url, 'sldx_other')).toEqual({
        result: 'invalid-key',
      });
      expect(
        await probeMcpAuth(`http://localhost:${down.port}/mcp`, 'sldx_ok'),
      ).toEqual({ result: 'api-unavailable' });
      expect(
        (
          await probeMcpAuth(
            `http://localhost:${await freePort()}/mcp`,
            'sldx_ok',
          )
        ).result,
      ).toBe('error');
    } finally {
      await Promise.all([server.close(), down.close()]);
    }
  });
});

describe('resolveRuntimeRegistration', () => {
  it('reuses saved names, keeps remote URLs and moves local URLs to the real port', () => {
    const root = makeProject('proj-a');
    const home = makeHome({ 'proj-a': 'sldx_a' });
    fs.writeJsonSync(path.join(home, '.solidx', 'mcp-registry.json'), {
      version: 1,
      projects: {
        'proj-a': {
          serverName: 'custom-a',
          url: 'http://127.0.0.1:9000/mcp',
          projectRoot: root,
          clients: ['cursor'],
          updatedAt: '',
        },
      },
      archived: {},
    });
    const res = resolveRuntimeRegistration({
      projectRoot: root,
      bindHost: '0.0.0.0',
      port: 9100,
      mountPath: '/mcp',
      homeDir: home,
    });
    expect(res).toMatchObject({
      ok: true,
      probeUrl: 'http://localhost:9100/mcp',
      registration: {
        serverName: 'custom-a',
        url: 'http://127.0.0.1:9100/mcp',
        apiKey: 'sldx_a',
      },
    });

    fs.writeJsonSync(path.join(home, '.solidx', 'mcp-registry.json'), {
      version: 1,
      projects: {
        'proj-a': {
          serverName: 'custom-a',
          url: 'https://prod.example.com/mcp',
          clients: [],
          updatedAt: '',
        },
      },
      archived: {},
    });
    const remote = resolveRuntimeRegistration({
      projectRoot: root,
      bindHost: '0.0.0.0',
      port: 9000,
      mountPath: '/mcp',
      homeDir: home,
    });
    expect(remote).toMatchObject({
      ok: true,
      registration: { url: 'https://prod.example.com/mcp' },
    });

    const noKey = resolveRuntimeRegistration({
      projectRoot: makeProject('proj-z'),
      bindHost: '0.0.0.0',
      port: 9000,
      mountPath: '/mcp',
      homeDir: home,
    });
    expect(noKey.ok).toBe(false);
  });
});

describe('activateMcpForRuntime', () => {
  async function scenario(
    validKeys: string[],
    servers?: Record<string, unknown>,
  ) {
    const root = makeProject('proj-a');
    const home = makeHome({ 'proj-a': 'sldx_a' });
    writeCursor(
      home,
      servers ?? {
        'solidx-proj-a-mcp': {
          url: 'http://localhost:9000/mcp',
          headers: { 'solidx-api-key': 'sldx_a' },
        },
        'solidx-proj-b-mcp': {
          url: 'http://localhost:9000/mcp',
          headers: { 'solidx-api-key': 'sldx_b' },
        },
        tolaria: { command: 'tolaria' },
      },
    );
    const server = await startFakeMcp({
      fingerprint: projectFingerprint(root),
      validKeys,
    });
    const logs: string[] = [];
    const outcome = await activateMcpForRuntime({
      projectRoot: root,
      bindHost: '0.0.0.0',
      port: server.port,
      mountPath: '/mcp',
      homeDir: home,
      log: (m) => logs.push(m),
      activation: cursorOnly,
    });
    await server.close();
    return { outcome, logs, home, port: server.port };
  }

  it('switches clients once the server is ready and the key is accepted', async () => {
    const { outcome, logs, home, port } = await scenario(['sldx_a']);
    expect(outcome).toBe('activated');
    const servers = readCursor(home);
    expect(Object.keys(servers).sort()).toEqual([
      'solidx-proj-a-mcp',
      'tolaria',
    ]);
    expect(servers['solidx-proj-a-mcp'].url).toBe(
      `http://localhost:${port}/mcp`,
    );
    expect(logs.join('\n')).toMatch(/Restart or reload to apply: cursor/);
    expect(logs.join('\n')).not.toContain('sldx_a');
    expect(loadRegistry(home).active).toMatchObject({
      projectName: 'proj-a',
      source: 'runtime',
    });
  });

  it('does not switch when the server rejects the stored key', async () => {
    const { outcome, logs, home } = await scenario(['sldx_something_else']);
    expect(outcome).toBe('failed');
    expect(Object.keys(readCursor(home))).toContain('solidx-proj-b-mcp');
    expect(logs.join('\n')).toMatch(/was rejected/);
  });

  it('skips with a hint when the project is not configured in any client', async () => {
    const { outcome, logs, home } = await scenario(['sldx_a'], {
      'solidx-proj-b-mcp': {
        url: 'http://localhost:9000/mcp',
        headers: { 'solidx-api-key': 'sldx_b' },
      },
    });
    expect(outcome).toBe('skipped');
    expect(Object.keys(readCursor(home))).toEqual(['solidx-proj-b-mcp']);
    expect(logs.join('\n')).toMatch(/solidctl mcp install/);
  });
});

describe('executeMcpInstall', () => {
  let oldHome: string | undefined;
  let oldCwd: string;
  beforeEach(() => {
    oldHome = process.env.HOME;
    oldCwd = process.cwd();
  });
  afterEach(() => {
    process.chdir(oldCwd);
    if (oldHome === undefined) delete process.env.HOME;
    else process.env.HOME = oldHome;
  });

  it('refuses to select a project while another project serves the URL, unless forced', async () => {
    const root = makeProject('proj-a');
    const home = makeHome({ 'proj-a': 'sldx_a' });
    process.env.HOME = home;
    process.chdir(root);
    const other = await startFakeMcp({ fingerprint: 'ffffffffffffffff' });
    const errors: string[] = [];
    try {
      const url = `http://localhost:${other.port}/mcp`;
      const code = await executeMcpInstall(
        { url },
        {
          homeDir: home,
          log: () => undefined,
          error: (l) => errors.push(l),
          activation: { detect: () => true, platform: 'darwin' },
        },
      );
      expect(code).toBe(1);
      expect(errors.join('\n')).toMatch(/different SolidX project/);
      expect(fs.existsSync(cursorPath(home))).toBe(false);

      const forced = await executeMcpInstall(
        { url, force: true, agents: 'cursor' },
        {
          homeDir: home,
          log: () => undefined,
          error: () => undefined,
          activation: { detect: () => true, platform: 'darwin' },
        },
      );
      expect(forced).toBe(0);
      expect(readCursor(home)['solidx-proj-a-mcp'].url).toBe(url);
    } finally {
      await other.close();
    }
  });

  it('prints the full plan on dry run without writing', async () => {
    const root = makeProject('proj-a');
    const home = makeHome({ 'proj-a': 'sldx_a' });
    process.env.HOME = home;
    process.chdir(root);
    writeCursor(home, {
      'solidx-proj-b-mcp': {
        url: 'http://localhost:9000/mcp',
        headers: { 'solidx-api-key': 'sldx_b' },
      },
    });
    const before = fs.readFileSync(cursorPath(home), 'utf8');
    const lines: string[] = [];
    const code = await executeMcpInstall(
      {
        dryRun: true,
        agents: 'cursor',
        url: `http://localhost:${await freePort()}/mcp`,
      },
      {
        homeDir: home,
        log: (l) => lines.push(l),
        activation: { detect: () => true, platform: 'darwin' },
      },
    );
    expect(code).toBe(0);
    const out = lines.join('\n');
    expect(out).toMatch(
      /would change: add solidx-proj-a-mcp; deactivate solidx-proj-b-mcp/,
    );
    expect(out).toMatch(/Dry run/);
    expect(out).not.toContain('sldx_');
    expect(fs.readFileSync(cursorPath(home), 'utf8')).toBe(before);
  });
});

describe('prepareAgentMcp', () => {
  it("reuses this project's server, refuses other owners, and manages a free port", async () => {
    const root = makeProject('proj-a');
    const same = await startFakeMcp({ fingerprint: projectFingerprint(root) });
    const other = await startFakeMcp({ fingerprint: 'ffffffffffffffff' });
    const logs: string[] = [];
    const oldDb = process.env.DATABASE_URL;
    try {
      expect(
        await prepareAgentMcp(root, 'agent', String(same.port), (m) =>
          logs.push(m),
        ),
      ).toEqual({ mode: 'reuse', port: String(same.port) });
      expect(
        await prepareAgentMcp(root, 'agent', String(other.port), (m) =>
          logs.push(m),
        ),
      ).toEqual({ mode: 'off' });
      expect(logs.join('\n')).toMatch(/different SolidX project/);

      process.env.DATABASE_URL = 'postgresql://u@localhost:5432/db';
      const port = String(await freePort());
      const managed = await prepareAgentMcp(
        root,
        'agent',
        port,
        () => undefined,
      );
      expect(managed.mode).toBe('managed');
      if (managed.mode === 'managed') {
        expect(managed.launchConfig.args).toEqual([
          'mcp-remote',
          '--host',
          '0.0.0.0',
          '--port',
          port,
          '--log-level',
          'INFO',
          '--mount-path',
          '/mcp',
        ]);
        expect(managed.launchConfig.env.SOLIDX_PROJECT_ROOT).toBe(root);
      }
    } finally {
      if (oldDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = oldDb;
      await Promise.all([same.close(), other.close()]);
    }
  });
});
