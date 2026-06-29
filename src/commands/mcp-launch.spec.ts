import { MCP_DEFAULT_OPTIONS, buildBridgedEnv } from './mcp-launch';

describe('MCP_DEFAULT_OPTIONS', () => {
  it('exposes the expected default values', () => {
    expect(MCP_DEFAULT_OPTIONS).toEqual({
      port: '9000',
      host: '0.0.0.0',
      logLevel: 'INFO',
      mountPath: '/mcp',
    });
  });
});

describe('buildBridgedEnv', () => {
  it('sets SOLIDX_PROJECT_ROOT to the provided project root', () => {
    const env = buildBridgedEnv('/tmp/fake-project');
    expect(env.SOLIDX_PROJECT_ROOT).toBe('/tmp/fake-project');
  });

  it('includes DATABASE_URL when already present in process.env', () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    try {
      const env = buildBridgedEnv('/tmp/fake-project');
      expect(env.DATABASE_URL).toBeDefined();
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });

  it('returns an object that includes process.env keys', () => {
    process.env.MCP_LAUNCH_TEST_VAR = 'hello';
    try {
      const env = buildBridgedEnv('/tmp/fake-project');
      expect(env.MCP_LAUNCH_TEST_VAR).toBe('hello');
    } finally {
      delete process.env.MCP_LAUNCH_TEST_VAR;
    }
  });
});
