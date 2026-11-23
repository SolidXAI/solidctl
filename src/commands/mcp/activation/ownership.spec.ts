import { classifyEntry, isLocalUrl, sameLocalEndpoint } from './ownership';

const TARGET = 'http://localhost:9000/mcp';

describe('ownership', () => {
  it('recognizes local addresses', () => {
    expect(isLocalUrl('http://localhost:9000/mcp')).toBe(true);
    expect(isLocalUrl('http://127.0.0.1:9000/mcp')).toBe(true);
    expect(isLocalUrl('http://[::1]:9000/mcp')).toBe(true);
    expect(isLocalUrl('https://prod.example.com/mcp')).toBe(false);
    expect(isLocalUrl(undefined)).toBe(false);
    expect(sameLocalEndpoint('http://127.0.0.1:9000/x', TARGET)).toBe(true);
    expect(sameLocalEndpoint('http://127.0.0.1:9001/x', TARGET)).toBe(false);
  });

  it('requires name, SolidX shape and a local URL to manage an entry', () => {
    const none = new Set<string>();
    expect(
      classifyEntry(
        { name: 'solidx-a-mcp', url: TARGET, hasSolidxKey: true },
        none,
        TARGET,
      ),
    ).toBe('managed');
    expect(
      classifyEntry(
        {
          name: 'solidx-a-mcp',
          url: 'https://prod.example.com/mcp',
          hasSolidxKey: true,
        },
        none,
        TARGET,
      ),
    ).toBe('unrelated');
    expect(
      classifyEntry(
        { name: 'solidx-a-mcp', url: TARGET, hasSolidxKey: false },
        none,
        TARGET,
      ),
    ).toBe('ambiguous');
    expect(
      classifyEntry(
        {
          name: 'ai_news',
          url: 'http://127.0.0.1:9000/mcp/agents/1',
          hasSolidxKey: false,
        },
        none,
        TARGET,
      ),
    ).toBe('ambiguous');
    expect(
      classifyEntry(
        {
          name: 'ai_news',
          url: 'http://127.0.0.1:9000/mcp',
          hasSolidxKey: true,
        },
        none,
        TARGET,
      ),
    ).toBe('ambiguous');
    expect(
      classifyEntry(
        {
          name: 'tolaria',
          url: 'http://localhost:4000/mcp',
          hasSolidxKey: false,
        },
        none,
        TARGET,
      ),
    ).toBe('unrelated');
    expect(
      classifyEntry({ name: 'node_repl', hasSolidxKey: false }, none, TARGET),
    ).toBe('unrelated');
  });

  it('treats registry-known custom names as owned', () => {
    expect(
      classifyEntry(
        { name: 'my-thing', url: TARGET, hasSolidxKey: true },
        new Set(['my-thing']),
        TARGET,
      ),
    ).toBe('managed');
  });
});
