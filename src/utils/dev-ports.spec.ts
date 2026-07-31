import {
  findDevPortConflicts,
  formatDevPortConflictMessage,
  MCP_DEV_PORT,
  validateCreateAppPorts,
  validateDevPortAssignments,
} from './dev-ports';

describe('validateCreateAppPorts', () => {
  it('accepts distinct API, UI, and MCP ports', () => {
    expect(validateCreateAppPorts('3000', '3001')).toBeNull();
  });

  it('rejects API port matching the MCP port', () => {
    const error = validateCreateAppPorts(MCP_DEV_PORT, '3001');
    expect(error).toContain('Port conflict detected');
    expect(error).toContain(MCP_DEV_PORT);
    expect(error).toContain('reserved for the SolidX MCP server');
  });

  it('rejects UI port matching the MCP port', () => {
    const error = validateCreateAppPorts('3000', MCP_DEV_PORT);
    expect(error).toContain('Port conflict detected');
    expect(error).toContain('reserved for the SolidX MCP server');
  });

  it('rejects API and UI on the same port', () => {
    const error = validateCreateAppPorts('4000', '4000');
    expect(error).toContain('Port conflict detected');
    expect(error).toContain('API and UI');
  });
});

describe('validateDevPortAssignments', () => {
  it('checks only the services that will run', () => {
    expect(validateDevPortAssignments({ api: '3000', ui: '3001' })).toBeNull();
    expect(validateDevPortAssignments({ api: '9000', mcp: '9000' })).toContain(
      'API and MCP',
    );
  });
});

describe('findDevPortConflicts', () => {
  it('returns groups of services that share a port', () => {
    expect(
      findDevPortConflicts({ api: '9000', ui: '9001', mcp: '9000' }),
    ).toEqual([['api', 'mcp']]);
  });
});

describe('formatDevPortConflictMessage', () => {
  it('mentions reserved MCP port guidance', () => {
    const message = formatDevPortConflictMessage([['api', 'mcp']], {
      api: '9000',
      mcp: '9000',
    });

    expect(message).toContain('reserved for the SolidX MCP server');
    expect(message).toContain('solid-api/.env');
  });
});
