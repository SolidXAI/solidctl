import { Command } from 'commander';
import { registerStartCommand, resolveStartServices } from './start.command';
import { RELEASE_VALIDATION_START_DEV_ARGS } from './release.command';

describe('resolveStartServices', () => {
  const startDev = { supportsMcp: true, supportsAgentHub: true };
  const start = { supportsMcp: true };

  it('defaults start:dev to api, ui, mcp, and agenthub', () => {
    expect(resolveStartServices({}, startDev)).toEqual(['api', 'ui', 'mcp', 'agenthub']);
  });

  it('does not include agenthub in the production start command', () => {
    expect(resolveStartServices({}, start)).toEqual(['api', 'ui', 'mcp']);
  });

  it('treats explicit selectors as exclusive', () => {
    expect(resolveStartServices({ api: true, ui: true }, startDev)).toEqual(['api', 'ui']);
    expect(resolveStartServices({ agenthub: true }, startDev)).toEqual(['agenthub']);
    expect(resolveStartServices({ api: true, agenthub: true }, startDev)).toEqual([
      'api',
      'agenthub',
    ]);
    expect(resolveStartServices({ mcp: true }, startDev)).toEqual(['mcp']);
  });

  it('ignores agenthub and mcp selectors the command does not support', () => {
    expect(resolveStartServices({ agenthub: true, mcp: true }, {})).toEqual(['api', 'ui']);
  });
});

describe('release validation start:dev spawn', () => {
  it('starts only the API and UI so MCP and AgentHub are ignored', () => {
    expect(RELEASE_VALIDATION_START_DEV_ARGS).toEqual(['start:dev', '--api', '--ui']);
  });
});

describe('start:dev AgentHub flags', () => {
  it('namespaces AgentHub options on start:dev and omits them from start', () => {
    const program = new Command().exitOverride();
    registerStartCommand(program);
    const optionNames = (name: string) =>
      program.commands.find((command) => command.name() === name)?.options.map((option) => option.long) ?? [];

    expect(optionNames('start:dev')).toEqual(
      expect.arrayContaining([
        '--agenthub',
        '--agenthub-port',
        '--agenthub-host',
        '--agenthub-local',
        '--agenthub-log-level',
        '--agenthub-env',
      ]),
    );
    expect(optionNames('start')).not.toEqual(
      expect.arrayContaining(['--agenthub', '--agenthub-port']),
    );
  });
});
