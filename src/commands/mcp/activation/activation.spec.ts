import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { activateMcpRegistration, type ActivationRequest } from './activation';
import { CLIENT_SPECS, type ClientEnv, type McpRegistration } from './clients';
import { parseCodexServers } from './codex-toml';
import { withFileLock } from './fs-utils';
import { loadRegistry, registryPath } from './registry';
import type { AgentName } from '../installers/types';

const A: McpRegistration = {
  projectName: 'proj-a',
  serverName: 'solidx-proj-a-mcp',
  url: 'http://localhost:9000/mcp',
  apiKey: 'sldx_a',
};
const B: McpRegistration = {
  projectName: 'proj-b',
  serverName: 'solidx-proj-b-mcp',
  url: 'http://localhost:9000/mcp',
  apiKey: 'sldx_b',
};

const REMOTE = {
  url: 'https://prod.example.com/mcp',
  headers: { 'solidx-api-key': 'sldx_remote' },
};

interface JsonServerEntry {
  url: string;
  args: string[];
  headers: Record<string, string>;
  [k: string]: unknown;
}

interface JsonConfig {
  mcpServers: Record<string, JsonServerEntry>;
  numStartups?: number;
  [k: string]: unknown;
}

interface Home {
  dir: string;
  env: ClientEnv;
  path(client: AgentName): string;
  json(client: AgentName): JsonConfig;
  codex(): ReturnType<typeof parseCodexServers>;
}

function makeHome(): Home {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-act-'));
  const env: ClientEnv = { homeDir: dir, platform: 'darwin' };
  const home: Home = {
    dir,
    env,
    path: (client) => CLIENT_SPECS[client].configPath(env),
    json: (client) =>
      JSON.parse(fs.readFileSync(home.path(client), 'utf8')) as JsonConfig,
    codex: () => parseCodexServers(fs.readFileSync(home.path('codex'), 'utf8')),
  };
  const write = (client: AgentName, content: string) => {
    fs.mkdirSync(path.dirname(home.path(client)), { recursive: true });
    fs.writeFileSync(home.path(client), content);
  };
  write(
    'codex',
    'model = "gpt-5"\n\n[mcp_servers.node_repl]\ncommand = "node"\n',
  );
  write(
    'cursor',
    JSON.stringify(
      {
        mcpServers: {
          tolaria: { command: 'tolaria' },
          'solidx-prod-mcp': REMOTE,
        },
      },
      null,
      2,
    ),
  );
  write(
    'claude-code',
    JSON.stringify(
      { numStartups: 3, mcpServers: { tolaria: { command: 'tolaria' } } },
      null,
      2,
    ),
  );
  write('claude-desktop', JSON.stringify({ mcpServers: {} }, null, 2));
  return home;
}

const homes: string[] = [];
function req(
  home: Home,
  target: McpRegistration,
  extra: Partial<ActivationRequest> = {},
): ActivationRequest {
  return {
    target,
    targetMode: 'install',
    source: 'install',
    homeDir: home.dir,
    platform: 'darwin',
    detect: (client, env) =>
      fs.existsSync(CLIENT_SPECS[client].configPath(env)),
    ...extra,
  };
}

let home: Home;
beforeEach(() => {
  home = makeHome();
  homes.push(home.dir);
});
afterAll(() => homes.forEach((d) => fs.removeSync(d)));

describe('activateMcpRegistration', () => {
  it('switches A -> B -> A across all four clients and preserves unrelated entries', async () => {
    await activateMcpRegistration(req(home, A));
    const first = await activateMcpRegistration(req(home, B));
    expect(first.hadError).toBe(false);

    const codex = home.codex();
    expect(codex.find((s) => s.name === A.serverName)?.enabled).toBe(false);
    expect(codex.find((s) => s.name === B.serverName)).toMatchObject({
      enabled: true,
      apiKey: 'sldx_b',
    });
    expect(codex.find((s) => s.name === 'node_repl')).toBeDefined();

    for (const client of ['cursor', 'claude-code', 'claude-desktop'] as const) {
      const servers = home.json(client).mcpServers;
      expect(servers[A.serverName]).toBeUndefined();
      expect(servers[B.serverName]).toBeDefined();
    }
    expect(home.json('cursor').mcpServers.tolaria).toEqual({
      command: 'tolaria',
    });
    expect(home.json('cursor').mcpServers['solidx-prod-mcp']).toEqual(REMOTE);
    expect(home.json('claude-code').numStartups).toBe(3);
    expect(home.json('claude-desktop').mcpServers[B.serverName].args).toEqual([
      '-y',
      'mcp-remote',
      'http://localhost:9000/mcp/',
      '--header',
      'solidx-api-key:sldx_b',
    ]);

    const registry = loadRegistry(home.dir);
    expect(registry.archived.cursor?.[A.serverName]?.entry).toEqual({
      url: A.url,
      headers: { 'solidx-api-key': 'sldx_a' },
    });
    expect(registry.archived.codex).toBeUndefined();
    expect(registry.active).toMatchObject({
      projectName: 'proj-b',
      source: 'install',
    });

    const back = await activateMcpRegistration(req(home, A));
    const cursorPlan = back.clients.find((c) => c.client === 'cursor')!;
    expect(cursorPlan.actions).toEqual(
      expect.arrayContaining([
        { kind: 'restore', serverName: A.serverName },
        { kind: 'archive', serverName: B.serverName },
      ]),
    );
    expect(home.json('cursor').mcpServers[A.serverName]).toBeDefined();
    expect(home.json('cursor').mcpServers[B.serverName]).toBeUndefined();
    expect(home.codex().find((s) => s.name === A.serverName)?.enabled).toBe(
      true,
    );
    expect(home.codex().find((s) => s.name === B.serverName)?.enabled).toBe(
      false,
    );
    const after = loadRegistry(home.dir);
    expect(after.archived.cursor?.[A.serverName]).toBeUndefined();
    expect(after.archived.cursor?.[B.serverName]).toBeDefined();
  });

  it('deactivates competitors even when the selected entry is already correct', async () => {
    fs.writeFileSync(
      home.path('cursor'),
      JSON.stringify(
        {
          mcpServers: {
            [A.serverName]: {
              url: A.url,
              headers: { 'solidx-api-key': 'sldx_a' },
            },
            [B.serverName]: {
              url: B.url,
              headers: { 'solidx-api-key': 'sldx_b' },
            },
          },
        },
        null,
        2,
      ),
    );
    const result = await activateMcpRegistration(
      req(home, A, { clients: ['cursor'] }),
    );
    const plan = result.clients[0];
    expect(plan.status).toBe('changed');
    expect(plan.actions).toEqual([
      { kind: 'unchanged', serverName: A.serverName },
      { kind: 'archive', serverName: B.serverName },
    ]);
    expect(Object.keys(home.json('cursor').mcpServers)).toEqual([A.serverName]);
  });

  it('refreshes rotated credentials and keeps custom entry fields', async () => {
    await activateMcpRegistration(req(home, A));
    const cursor = home.json('cursor');
    cursor.mcpServers[A.serverName].headers['x-extra'] = '1';
    fs.writeFileSync(home.path('cursor'), JSON.stringify(cursor, null, 2));

    const rotated = await activateMcpRegistration(
      req(home, { ...A, apiKey: 'sldx_a2' }),
    );
    expect(
      rotated.clients.find((c) => c.client === 'cursor')?.actions[0],
    ).toEqual({
      kind: 'update',
      serverName: A.serverName,
      detail: 'credentials',
    });
    expect(home.json('cursor').mcpServers[A.serverName].headers).toEqual({
      'solidx-api-key': 'sldx_a2',
      'x-extra': '1',
    });
    expect(home.codex().find((s) => s.name === A.serverName)?.apiKey).toBe(
      'sldx_a2',
    );
    expect(
      home.json('claude-code').mcpServers[A.serverName].headers[
        'solidx-api-key'
      ],
    ).toBe('sldx_a2');
  });

  it('treats registry-known custom names and custom ports as managed', async () => {
    await activateMcpRegistration(
      req(home, {
        ...A,
        serverName: 'my-thing',
        url: 'http://127.0.0.1:9100/mcp',
      }),
    );
    await activateMcpRegistration(req(home, B));
    expect(home.json('cursor').mcpServers['my-thing']).toBeUndefined();
    expect(home.codex().find((s) => s.name === 'my-thing')?.enabled).toBe(
      false,
    );
    expect(loadRegistry(home.dir).projects['proj-a']).toMatchObject({
      serverName: 'my-thing',
      url: 'http://127.0.0.1:9100/mcp',
    });
  });

  it('honors an explicit client subset', async () => {
    const codexBefore = fs.readFileSync(home.path('codex'), 'utf8');
    const result = await activateMcpRegistration(
      req(home, A, { clients: ['cursor'] }),
    );
    expect(result.clients.map((c) => c.client)).toEqual(['cursor']);
    expect(fs.readFileSync(home.path('codex'), 'utf8')).toBe(codexBefore);
  });

  it('dry run plans everything and writes nothing', async () => {
    const before = Object.fromEntries(
      (['codex', 'cursor', 'claude-code', 'claude-desktop'] as const).map(
        (c) => [c, fs.readFileSync(home.path(c), 'utf8')],
      ),
    );
    const result = await activateMcpRegistration(req(home, A), {
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.clients.every((c) => c.status === 'changed')).toBe(true);
    for (const [client, text] of Object.entries(before))
      expect(fs.readFileSync(home.path(client as AgentName), 'utf8')).toBe(
        text,
      );
    expect(fs.existsSync(registryPath(home.dir))).toBe(false);
    expect(
      fs
        .readdirSync(path.dirname(home.path('cursor')))
        .some((f) => f.includes('solidx-bak')),
    ).toBe(false);
  });

  it('reports ambiguous entries and leaves them alone', async () => {
    fs.writeFileSync(
      home.path('cursor'),
      JSON.stringify({
        mcpServers: {
          ai_news: { url: 'http://127.0.0.1:9000/mcp/agents/1' },
          'solidx-old-mcp': { url: 'http://localhost:9000/mcp' },
        },
      }),
    );
    const result = await activateMcpRegistration(
      req(home, A, { clients: ['cursor'] }),
    );
    const kinds = result.clients[0].actions
      .filter((a) => a.kind === 'ambiguous')
      .map((a) => a.serverName);
    expect(kinds).toEqual(['ai_news', 'solidx-old-mcp']);
    expect(Object.keys(home.json('cursor').mcpServers)).toEqual([
      'ai_news',
      'solidx-old-mcp',
      A.serverName,
    ]);
  });

  it('reports malformed config for one client and still applies the others', async () => {
    fs.writeFileSync(home.path('cursor'), '{ not json');
    const result = await activateMcpRegistration(req(home, A));
    expect(result.hadError).toBe(true);
    expect(result.clients.find((c) => c.client === 'cursor')).toMatchObject({
      status: 'error',
    });
    expect(fs.readFileSync(home.path('cursor'), 'utf8')).toBe('{ not json');
    expect(home.json('claude-code').mcpServers[A.serverName]).toBeDefined();
  });

  it('rolls back earlier writes when a later client write fails', async () => {
    const claudeBefore = fs.readFileSync(home.path('claude-code'), 'utf8');
    const result = await activateMcpRegistration(req(home, A), {
      writeFile: (file, content) => {
        if (file === home.path('cursor')) throw new Error('disk full');
        fs.writeFileSync(file, content);
      },
    });
    expect(result.applied).toBe(false);
    expect(
      result.clients.find((c) => c.client === 'claude-code')?.rolledBack,
    ).toBe(true);
    expect(result.clients.find((c) => c.client === 'cursor')).toMatchObject({
      status: 'error',
      error: 'disk full',
    });
    expect(result.clients.find((c) => c.client === 'codex')?.status).toBe(
      'skipped',
    );
    expect(fs.readFileSync(home.path('claude-code'), 'utf8')).toBe(
      claudeBefore,
    );
    expect(loadRegistry(home.dir).projects['proj-a']).toBeUndefined();
  });

  it('re-plans from fresh content when a client rewrote its file meanwhile', async () => {
    const result = await activateMcpRegistration(
      req(home, A, { clients: ['claude-code'] }),
      {
        beforeWrite: (plan) => {
          const cfg = JSON.parse(
            fs.readFileSync(plan.configPath, 'utf8'),
          ) as JsonConfig;
          cfg.numStartups = 4;
          fs.writeFileSync(plan.configPath, JSON.stringify(cfg, null, 2));
        },
      },
    );
    expect(result.hadError).toBe(false);
    expect(home.json('claude-code').numStartups).toBe(4);
    expect(home.json('claude-code').mcpServers[A.serverName]).toBeDefined();
  });

  it('runtime mode only activates where the project is already configured', async () => {
    const result = await activateMcpRegistration(
      req(home, A, {
        targetMode: 'if-present',
        source: 'runtime',
        requireTargetSomewhere: true,
      }),
    );
    expect(result.notRegistered).toBe(true);
    expect(home.json('cursor').mcpServers[A.serverName]).toBeUndefined();

    await activateMcpRegistration(req(home, B, { clients: ['cursor'] }));
    await activateMcpRegistration(req(home, A, { clients: ['cursor'] }));
    const runtime = await activateMcpRegistration(
      req(home, B, {
        targetMode: 'if-present',
        source: 'runtime',
        requireTargetSomewhere: true,
      }),
    );
    expect(runtime.notRegistered).toBeUndefined();
    expect(home.json('cursor').mcpServers[B.serverName]).toBeDefined();
    expect(home.json('claude-code').mcpServers[B.serverName]).toBeUndefined();
    expect(loadRegistry(home.dir).active).toMatchObject({
      projectName: 'proj-b',
      source: 'runtime',
    });
  });

  it('keeps registry and backups owner-only and does not rewrite unchanged files', async () => {
    const first = await activateMcpRegistration(req(home, A));
    expect(fs.statSync(registryPath(home.dir)).mode & 0o777).toBe(0o600);
    const backup = first.clients.find((c) => c.client === 'cursor')?.backupPath;
    expect(backup && fs.statSync(backup).mode & 0o777).toBe(0o600);
    const second = await activateMcpRegistration(req(home, A));
    expect(second.clients.every((c) => c.status === 'unchanged')).toBe(true);
    const forced = await activateMcpRegistration(req(home, A, { force: true }));
    expect(forced.clients.every((c) => c.status === 'changed')).toBe(true);
  });

  it('writes through a symlinked config file', async () => {
    const real = path.join(home.dir, 'dotfiles-cursor.json');
    fs.moveSync(home.path('cursor'), real);
    fs.symlinkSync(real, home.path('cursor'));
    await activateMcpRegistration(req(home, A, { clients: ['cursor'] }));
    expect(fs.lstatSync(home.path('cursor')).isSymbolicLink()).toBe(true);
    expect(
      (JSON.parse(fs.readFileSync(real, 'utf8')) as JsonConfig).mcpServers[
        A.serverName
      ],
    ).toBeDefined();
  });

  it('uses the Windows bridge shape for Claude Desktop on win32', async () => {
    const appData = path.join(home.dir, 'AppData');
    const env: ClientEnv = { homeDir: home.dir, platform: 'win32', appData };
    fs.mkdirSync(path.dirname(CLIENT_SPECS['claude-desktop'].configPath(env)), {
      recursive: true,
    });
    fs.writeFileSync(CLIENT_SPECS['claude-desktop'].configPath(env), '{}');
    await activateMcpRegistration(
      req(home, A, { clients: ['claude-desktop'], platform: 'win32', appData }),
    );
    const cfg = JSON.parse(
      fs.readFileSync(CLIENT_SPECS['claude-desktop'].configPath(env), 'utf8'),
    ) as JsonConfig;
    expect(cfg.mcpServers[A.serverName]).toEqual({
      command: 'cmd',
      args: [
        '/c',
        'npx',
        '-y',
        'mcp-remote',
        'http://localhost:9000/mcp/',
        '--header',
        'solidx-api-key:sldx_a',
      ],
    });
  });

  it('marks undetected clients and leaves them alone', async () => {
    const result = await activateMcpRegistration(
      req(home, A, { detect: (c) => c === 'cursor' }),
    );
    expect(
      result.clients
        .filter((c) => c.status === 'not-detected')
        .map((c) => c.client),
    ).toEqual(['claude-code', 'codex', 'claude-desktop']);
  });
});

describe('withFileLock', () => {
  it('waits for a live holder and times out', async () => {
    const lock = path.join(home.dir, '.solidx', 'test.lock');
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }));
    await expect(
      withFileLock(lock, () => 1, { timeoutMs: 200, pollMs: 20 }),
    ).rejects.toThrow(/Another solidctl process/);
  });

  it('takes over a lock left by a dead process', async () => {
    const lock = path.join(home.dir, '.solidx', 'test.lock');
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.writeFileSync(lock, JSON.stringify({ pid: 2 ** 22 + 12345 }));
    await expect(
      withFileLock(lock, () => 'ok', { timeoutMs: 200 }),
    ).resolves.toBe('ok');
    expect(fs.existsSync(lock)).toBe(false);
  });

  it('serializes concurrent activations without losing changes', async () => {
    await Promise.all([
      activateMcpRegistration(req(home, A, { clients: ['cursor'] })),
      activateMcpRegistration(req(home, B, { clients: ['codex'] })),
    ]);
    const registry = loadRegistry(home.dir);
    expect(Object.keys(registry.projects).sort()).toEqual(['proj-a', 'proj-b']);
  });
});
