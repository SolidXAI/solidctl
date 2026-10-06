import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { Command } from 'commander';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as helper from '../helper';
import { checkAgentHubUpdate, ensureAgentHubInstalled, getAgentHubVersion } from './agenthub-helper';
import { buildAgentHubEnv, runAgentHubManager } from './agenthub.command';
import { registerStartCommand } from './start.command';

jest.mock('child_process', () => ({ spawn: jest.fn(), spawnSync: jest.fn() }));
jest.mock('./agenthub-helper', () => ({ checkAgentHubUpdate: jest.fn(), ensureAgentHubInstalled: jest.fn(), getAgentHubVersion: jest.fn() }));

describe('AgentHub startup', () => {
  const originalEnv = process.env;
  let project: string;
  let child: EventEmitter & { pid: number };
  beforeEach(() => {
    jest.resetAllMocks();
    process.exitCode = 0;
    process.env = { ...originalEnv };
    for (const key of Object.keys(process.env)) {
      if (/^(DATABASE_URL|BASE_URL|SOLIDX_API_BASE_URL|APP_ENCRYPTION_KEY|DEFAULT_DATABASE_|AGENTHUB_)/.test(key)) {
        delete process.env[key];
      }
    }
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'solidctl-agenthub-'));
    fs.mkdirSync(path.join(project, 'solid-api'));
    child = Object.assign(new EventEmitter(), { pid: 12345 });
    jest.mocked(spawn).mockReturnValue(child as any);
    jest.mocked(ensureAgentHubInstalled).mockReturnValue('/local/.venv/bin/agenthub-runtime');
    jest.mocked(getAgentHubVersion).mockReturnValue('0.1.0');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'kill').mockReturnValue(true);
  });
  afterEach(() => {
    process.exitCode = 0;
    process.env = originalEnv;
    fs.rmSync(project, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('bridges project DB/API settings and preserves AgentHub settings', () => {
    fs.writeFileSync(path.join(project, 'solid-api', '.env'), [
      'DEFAULT_DATABASE_HOST=localhost', 'DEFAULT_DATABASE_PORT=5432',
      'DEFAULT_DATABASE_USER=user', 'DEFAULT_DATABASE_PASSWORD=p@ss', 'DEFAULT_DATABASE_NAME=app',
      'BASE_URL=http://localhost:3000', 'APP_ENCRYPTION_KEY=test-key',
    ].join('\n'));
    fs.writeFileSync(path.join(project, '.env'), 'AGENTHUB_MANAGER_INTERNAL_TOKEN=test-token\nAGENTHUB_PORT_RANGE=9200-9299\n');
    const env = buildAgentHubEnv(project);
    expect(env).toMatchObject({
      DATABASE_URL: 'postgresql://user:p%40ss@localhost:5432/app',
      SOLIDX_API_BASE_URL: 'http://localhost:3000', APP_ENCRYPTION_KEY: 'test-key',
      AGENTHUB_MANAGER_INTERNAL_TOKEN: 'test-token', AGENTHUB_PORT_RANGE: '9200-9299',
      AGENTHUB_MANAGER_BIND_HOST: '127.0.0.1',
    });
  });

  it('keeps OS settings above root .env above solid-api/.env, with CLI host overriding', () => {
    process.env.DATABASE_URL = 'postgresql://os:pw@localhost/app';
    process.env.AGENTHUB_MANAGER_BIND_HOST = '127.0.0.2';
    fs.writeFileSync(path.join(project, '.env'), 'DATABASE_URL=postgresql://root:pw@localhost/app\nSOLIDX_API_BASE_URL=http://root:3000\n');
    fs.writeFileSync(path.join(project, 'solid-api', '.env'), 'SOLIDX_API_BASE_URL=http://api:3000\n');
    const env = buildAgentHubEnv(project, '0.0.0.0');
    expect(env.DATABASE_URL).toBe(process.env.DATABASE_URL);
    expect(env.SOLIDX_API_BASE_URL).toBe('http://root:3000');
    expect(env.AGENTHUB_MANAGER_BIND_HOST).toBe('0.0.0.0');
  });

  it('reports missing runtime configuration before installation', () => {
    expect(() => buildAgentHubEnv(project)).toThrow('DATABASE_URL, SOLIDX_API_BASE_URL');
    expect(ensureAgentHubInstalled).not.toHaveBeenCalled();
  });

  it('dispatches start agenthub to the runtime without starting the API/UI/MCP supervisor', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pw@localhost/app';
    process.env.BASE_URL = 'http://localhost:3000';
    jest.spyOn(helper, 'validateProjectRoot').mockImplementation(() => {});
    const validateScript = jest.spyOn(helper, 'validateProjectScript').mockImplementation(() => {});
    const program = new Command().enablePositionalOptions().exitOverride();
    registerStartCommand(program);
    const pending = program.parseAsync(['start', 'agenthub', '--local', '--port', '9010'], { from: 'user' });
    await new Promise(setImmediate);
    expect(checkAgentHubUpdate).toHaveBeenCalledWith({ isLocal: true });
    expect(ensureAgentHubInstalled).toHaveBeenCalledWith(expect.objectContaining({ local: true }));
    expect(spawn).toHaveBeenCalledWith('/local/.venv/bin/agenthub-runtime', ['manager', '--port', '9010'],
      expect.objectContaining({ env: expect.objectContaining({ SOLIDX_API_BASE_URL: 'http://localhost:3000' }) }));
    expect(validateScript).not.toHaveBeenCalled();
    child.emit('close', 0);
    await pending;
    expect(process.exitCode).toBe(0);
  });

  it('rejects invalid ports before installing or spawning', async () => {
    const program = new Command().exitOverride();
    registerStartCommand(program);
    await program.parseAsync(['start', 'agenthub', '--port', '0'], { from: 'user' });
    expect(ensureAgentHubInstalled).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('preserves manager failures and removes signal handlers', async () => {
    const before = process.listenerCount('SIGTERM');
    const pending = runAgentHubManager('/runtime', project, {}, '9000');
    child.emit('close', 7);
    await expect(pending).resolves.toBe(7);
    expect(process.listenerCount('SIGTERM')).toBe(before);
  });

  it('reports spawn failures and removes signal handlers', async () => {
    const before = process.listenerCount('SIGINT');
    const pending = runAgentHubManager('/missing', project, {}, '9000');
    child.emit('error', new Error('ENOENT'));
    await expect(pending).rejects.toThrow('Failed to start AgentHub manager: ENOENT');
    expect(process.listenerCount('SIGINT')).toBe(before);
  });

  if (process.platform !== 'win32') {
    it('forwards Ctrl+C to the whole process group and clears shutdown timers', async () => {
      jest.useFakeTimers();
      const pending = runAgentHubManager('/runtime', project, {}, '9000');
      const interrupt = process.listeners('SIGINT').at(-1)!;
      interrupt.call(process);
      expect(process.kill).toHaveBeenCalledWith(-child.pid, 'SIGINT');
      jest.advanceTimersByTime(5_000);
      expect(process.kill).toHaveBeenCalledWith(-child.pid, 'SIGKILL');
      child.emit('close', null);
      await expect(pending).resolves.toBe(0);
      expect(jest.getTimerCount()).toBe(0);
      jest.useRealTimers();
    });
  }
});
