import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import inquirer from 'inquirer';
import { AgentCommandExit, ensureVenv, findPython, findUv, getSolidctlAgentTrack } from './agent-helper';
import { isInteractiveSession } from '../utils/interactive';
import { checkAgentHubUpdate, ensureAgentHubInstalled } from './agenthub-helper';

jest.mock('child_process', () => ({ spawnSync: jest.fn() }));
jest.mock('fs', () => ({ existsSync: jest.fn() }));
jest.mock('./agent-helper', () => ({
  AgentCommandExit: jest.requireActual('./agent-helper').AgentCommandExit,
  ensureVenv: jest.fn(), findPython: jest.fn(), findUv: jest.fn(), getSolidctlAgentTrack: jest.fn(),
}));
jest.mock('../utils/interactive', () => ({ isInteractiveSession: jest.fn() }));
jest.mock('inquirer', () => ({ prompt: jest.fn() }));
jest.mock('ora', () => () => ({ start: () => ({ stop: jest.fn() }) }));

const mockSpawn = jest.mocked(spawnSync);
const mockExists = jest.mocked(fs.existsSync);
const source = path.resolve('/tmp/agenthub-source');
const managed = path.join(os.homedir(), '.solidx', 'agenthub-venv');
const binDir = process.platform === 'win32' ? 'Scripts' : 'bin';
const binaryName = process.platform === 'win32' ? 'agenthub-runtime.exe' : 'agenthub-runtime';
const pythonName = process.platform === 'win32' ? 'python.exe' : 'python';

describe('AgentHub runtime installation', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SOLIDX_AGENTHUB_RUNTIME_PATH;
    jest.mocked(findPython).mockReturnValue('/usr/bin/python3');
    jest.mocked(findUv).mockReturnValue('uv');
    jest.mocked(ensureVenv).mockReturnValue(true);
    jest.mocked(getSolidctlAgentTrack).mockReturnValue('beta');
    mockSpawn.mockReturnValue({ status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('requires an explicit local source without trying a published install', () => {
    expect(() => ensureAgentHubInstalled({ local: true })).toThrow('SOLIDX_AGENTHUB_RUNTIME_PATH');
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('rejects invalid local source before creating a venv', () => {
    process.env.SOLIDX_AGENTHUB_RUNTIME_PATH = source;
    mockExists.mockReturnValue(false);
    expect(() => ensureAgentHubInstalled({ local: true })).toThrow('expected pyproject.toml');
    expect(ensureVenv).not.toHaveBeenCalled();
  });

  it('reuses the local checkout binary without installing from PyPI', () => {
    process.env.SOLIDX_AGENTHUB_RUNTIME_PATH = source;
    mockExists.mockReturnValue(true);
    expect(ensureAgentHubInstalled({ local: true })).toBe(path.join(source, '.venv', binDir, binaryName));
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('installs editable runtime source without the agent-only full extra', () => {
    process.env.SOLIDX_AGENTHUB_RUNTIME_PATH = source;
    let installed = false;
    mockExists.mockImplementation((file) => String(file).endsWith('pyproject.toml') ||
      (installed && String(file).endsWith(binaryName)));
    mockSpawn.mockImplementation(() => {
      installed = true;
      return { status: 0 } as any;
    });
    const result = ensureAgentHubInstalled({ local: true });
    expect(result).toBe(path.join(source, '.venv', binDir, binaryName));
    expect(ensureVenv).toHaveBeenCalledWith('/usr/bin/python3', 'uv', path.join(source, '.venv'));
    expect(mockSpawn).toHaveBeenCalledWith('uv', [
      'pip', 'install', '-e', source, '--python', path.join(source, '.venv', binDir, pythonName),
    ], { stdio: 'inherit' });
  });

  it.each(['beta', 'stable'] as const)('upgrades published %s packages in a separate managed venv', (track) => {
    jest.mocked(getSolidctlAgentTrack).mockReturnValue(track);
    mockExists.mockReturnValue(true);
    ensureAgentHubInstalled({ upgrade: true });
    expect(ensureVenv).toHaveBeenCalledWith(path.join(managed, binDir, pythonName), 'uv', managed);
    expect(mockSpawn).toHaveBeenCalledWith('uv', [
      'pip', 'install', '--upgrade', ...(track === 'beta' ? ['--pre'] : []),
      'solidx-agenthub-runtime', '--python', path.join(managed, binDir, pythonName),
    ], { stdio: 'inherit' });
  });

  it('falls back to pip when uv fails', () => {
    mockExists.mockReturnValue(true);
    mockSpawn.mockReturnValueOnce({ status: 1 } as any);
    ensureAgentHubInstalled({ upgrade: true });
    expect(mockSpawn).toHaveBeenLastCalledWith(path.join(managed, binDir, pythonName), [
      '-m', 'pip', 'install', '--upgrade', '--pre', 'solidx-agenthub-runtime',
    ], { stdio: 'inherit' });
  });

  it('gives actionable local-mode guidance when published installation fails', () => {
    mockExists.mockReturnValue(false);
    mockSpawn.mockReturnValue({ status: 1 } as any);
    expect(() => ensureAgentHubInstalled({})).toThrow('solidctl start agenthub --local');
  });

  it('probes PATH binaries with --help instead of unsupported --version', () => {
    mockExists.mockReturnValue(false);
    mockSpawn.mockReturnValueOnce({ status: 0, stdout: Buffer.from('/usr/local/bin/agenthub-runtime\n') } as any);
    expect(ensureAgentHubInstalled({})).toBe('/usr/local/bin/agenthub-runtime');
    expect(mockSpawn).toHaveBeenLastCalledWith('/usr/local/bin/agenthub-runtime', ['--help'], {
      stdio: 'pipe', timeout: 15_000,
    });
    expect(ensureVenv).not.toHaveBeenCalled();
  });

  describe('automatic upgrades match agent startup', () => {
    beforeEach(() => {
      mockExists.mockReturnValue(true);
      mockSpawn.mockReturnValue({ status: 0, stdout: Buffer.from('0.1.0b1') } as any);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true, json: async () => ({ releases: { '0.1.0b1': [], '0.1.0b2': [], '1.0.0': [] } }),
      } as any);
    });

    it('skips all version/network checks in local mode', async () => {
      await checkAgentHubUpdate({ isLocal: true });
      expect(fetch).not.toHaveBeenCalled();
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('checks the runtime JSON endpoint and avoids prompts/installs without a TTY', async () => {
      jest.mocked(isInteractiveSession).mockReturnValue(false);
      await checkAgentHubUpdate({ isLocal: false });
      expect(fetch).toHaveBeenCalledWith('https://pypi.org/pypi/solidx-agenthub-runtime/json', {
        signal: expect.any(AbortSignal),
      });
      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('0.1.0b2'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('--pre --upgrade solidx-agenthub-runtime'));
    });

    it('prompts with default no and keeps the installed runtime when declined', async () => {
      jest.mocked(isInteractiveSession).mockReturnValue(true);
      jest.mocked(inquirer.prompt).mockResolvedValue({ upgrade: false } as any);
      await checkAgentHubUpdate({ isLocal: false });
      expect(inquirer.prompt).toHaveBeenCalledWith([expect.objectContaining({ default: false })]);
      expect(ensureVenv).not.toHaveBeenCalled();
    });

    it('upgrades only after acceptance, then exits successfully for a rerun', async () => {
      jest.mocked(isInteractiveSession).mockReturnValue(true);
      jest.mocked(inquirer.prompt).mockResolvedValue({ upgrade: true } as any);
      await expect(checkAgentHubUpdate({ isLocal: false })).rejects.toBeInstanceOf(AgentCommandExit);
      expect(mockSpawn).toHaveBeenCalledWith('uv', [
        'pip', 'install', '--upgrade', '--pre', 'solidx-agenthub-runtime', '--python', path.join(managed, binDir, pythonName),
      ], { stdio: 'inherit' });
    });

    it('ignores unpublished packages and network failures', async () => {
      jest.mocked(fetch).mockResolvedValueOnce({ ok: false } as any);
      await expect(checkAgentHubUpdate({ isLocal: false })).resolves.toBeUndefined();
      jest.mocked(fetch).mockRejectedValueOnce(new Error('network unavailable'));
      await expect(checkAgentHubUpdate({ isLocal: false })).resolves.toBeUndefined();
      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(ensureVenv).not.toHaveBeenCalled();
    });
  });
});
