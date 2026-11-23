import {
  appendCodexServer,
  parseCodexServers,
  setCodexServerApiKey,
  setCodexServerEnabled,
  setCodexServerUrl,
  splitTomlKeyPath,
} from './codex-toml';

const SAMPLE = [
  'model = "gpt-5"',
  '',
  '[mcp_servers.node_repl]',
  'command = "node"',
  'args = []',
  '',
  '[mcp_servers.solidx-a-mcp]',
  'enabled = true',
  'url = "http://localhost:9000/mcp"',
  '',
  '[mcp_servers.solidx-a-mcp.http_headers]',
  'solidx-api-key = "sldx_a"',
  '',
  '[mcp_servers."dotted.name"]',
  'url = "http://127.0.0.1:9000/mcp"',
  'http_headers = { "solidx-api-key" = "sldx_d" }',
  '',
  '[profiles.fast]',
  'model = "o4-mini"',
  '',
].join('\n');

describe('splitTomlKeyPath', () => {
  it('handles bare, basic-quoted and literal-quoted keys', () => {
    expect(splitTomlKeyPath('mcp_servers.solidx-a-mcp.http_headers')).toEqual([
      'mcp_servers',
      'solidx-a-mcp',
      'http_headers',
    ]);
    expect(splitTomlKeyPath('mcp_servers."dotted.name"')).toEqual([
      'mcp_servers',
      'dotted.name',
    ]);
    expect(splitTomlKeyPath("mcp_servers . 'lit.name' . env")).toEqual([
      'mcp_servers',
      'lit.name',
      'env',
    ]);
  });
});

describe('parseCodexServers', () => {
  it('finds every server with url, enabled state and key presence', () => {
    const servers = parseCodexServers(SAMPLE);
    expect(servers.map((s) => s.name)).toEqual([
      'node_repl',
      'solidx-a-mcp',
      'dotted.name',
    ]);
    const a = servers[1];
    expect(a).toMatchObject({
      url: 'http://localhost:9000/mcp',
      enabled: true,
      hasSolidxKey: true,
      apiKey: 'sldx_a',
    });
    expect(a.segments).toHaveLength(2);
    expect(servers[2]).toMatchObject({
      url: 'http://127.0.0.1:9000/mcp',
      hasSolidxKey: true,
      apiKey: 'sldx_d',
    });
    expect(servers[0].hasSolidxKey).toBe(false);
  });

  it('ignores header-looking lines inside multi-line strings', () => {
    const text =
      'instructions = """\n[mcp_servers.fake]\nurl = "x"\n"""\n\n[mcp_servers.real]\nurl = "http://localhost:1/mcp"\n';
    expect(parseCodexServers(text).map((s) => s.name)).toEqual(['real']);
  });

  it('collects non-contiguous child tables', () => {
    const text =
      '[mcp_servers.a]\nurl = "http://localhost:9000/mcp"\n\n[mcp_servers.b]\nurl = "x"\n\n[mcp_servers.a.http_headers]\nsolidx-api-key = "k"\n';
    const a = parseCodexServers(text).find((s) => s.name === 'a');
    expect(a?.hasSolidxKey).toBe(true);
    expect(a?.apiKey).toBe('k');
  });
});

describe('codex edits', () => {
  it('flips an existing enabled line and leaves everything else byte-identical', () => {
    const out = setCodexServerEnabled(SAMPLE, 'solidx-a-mcp', false);
    expect(out).toBe(SAMPLE.replace('enabled = true', 'enabled = false'));
  });

  it('inserts enabled right after the header when absent (quoted table name)', () => {
    const out = setCodexServerEnabled(SAMPLE, 'dotted.name', false);
    expect(out).toContain(
      '[mcp_servers."dotted.name"]\nenabled = false\nurl = "http://127.0.0.1:9000/mcp"',
    );
    expect(
      parseCodexServers(out).find((s) => s.name === 'dotted.name')?.enabled,
    ).toBe(false);
  });

  it('updates url and the header-table key in place', () => {
    let out = setCodexServerUrl(
      SAMPLE,
      'solidx-a-mcp',
      'http://localhost:9100/mcp',
    );
    out = setCodexServerApiKey(out, 'solidx-a-mcp', 'sldx_new');
    const a = parseCodexServers(out).find((s) => s.name === 'solidx-a-mcp');
    expect(a).toMatchObject({
      url: 'http://localhost:9100/mcp',
      apiKey: 'sldx_new',
    });
    expect(out).toContain('[profiles.fast]\nmodel = "o4-mini"');
  });

  it('updates an inline http_headers key', () => {
    const out = setCodexServerApiKey(SAMPLE, 'dotted.name', 'sldx_d2');
    expect(out).toContain('http_headers = { "solidx-api-key" = "sldx_d2" }');
  });

  it('adds an http_headers table when the server has no key yet', () => {
    const text =
      '[mcp_servers.solidx-b-mcp]\nurl = "http://localhost:9000/mcp"\n\n[other]\nx = 1\n';
    const out = setCodexServerApiKey(text, 'solidx-b-mcp', 'sldx_b');
    const b = parseCodexServers(out).find((s) => s.name === 'solidx-b-mcp');
    expect(b?.apiKey).toBe('sldx_b');
    expect(out).toContain('[other]\nx = 1');
  });

  it('appends a new block with one blank-line separator and quotes unusual names', () => {
    const out = appendCodexServer(
      'model = "x"\n',
      'my.server',
      'http://localhost:9000/mcp',
      'sldx_k',
    );
    expect(out).toBe(
      'model = "x"\n\n[mcp_servers."my.server"]\nenabled = true\nurl = "http://localhost:9000/mcp"\n\n[mcp_servers."my.server".http_headers]\nsolidx-api-key = "sldx_k"\n',
    );
  });

  it('preserves CRLF line endings on edited lines', () => {
    const crlf =
      '[mcp_servers.solidx-a-mcp]\r\nenabled = true\r\nurl = "http://localhost:9000/mcp"\r\n';
    expect(setCodexServerEnabled(crlf, 'solidx-a-mcp', false)).toBe(
      crlf.replace('enabled = true', 'enabled = false'),
    );
  });
});
