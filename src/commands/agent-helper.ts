import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const AGENT_PACKAGE = 'solidx-ai-agent';
const AGENT_UI_PACKAGE = '@solidxai/agent-ui';
const VENV_DIR = path.join(os.homedir(), '.solidx', 'venv');
const VENV_BIN = path.join(VENV_DIR, process.platform === 'win32' ? 'Scripts' : 'bin');
const VENV_AGENT_BIN = path.join(VENV_BIN, process.platform === 'win32' ? 'solidx-agent.exe' : 'solidx-agent');
const AGENT_UI_DIR = path.join(os.homedir(), '.solidx', 'agent-ui');
const AGENT_UI_PKG_DIR = path.join(AGENT_UI_DIR, 'node_modules', '@solidxai', 'agent-ui');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * Check if a command exists in PATH and returns exit code 0.
 */
function commandExists(cmd: string): boolean {
  const result = spawnSync(
    process.platform === 'win32' ? 'where' : 'which',
    [cmd],
    { stdio: 'pipe' },
  );
  return result.status === 0;
}

/**
 * Check if solidx-agent binary is available — either in PATH or in the
 * dedicated ~/.solidx/venv.
 */
function findAgentBinary(): string | null {
  // 1. Check PATH first (covers dev installs and manual installs)
  const pathBinary = process.platform === 'win32' ? 'solidx-agent.cmd' : 'solidx-agent';
  if (commandExists(pathBinary)) {
    return pathBinary;
  }

  // 2. Check dedicated venv
  if (fs.existsSync(VENV_AGENT_BIN)) {
    return VENV_AGENT_BIN;
  }

  return null;
}

/**
 * Detect the best available Python command (python3 or python) that is
 * version 3.11+. Returns null if none found.
 */
function findPython(): string | null {
  for (const cmd of ['python3', 'python']) {
    const result = spawnSync(cmd, ['--version'], { stdio: 'pipe' });
    if (result.status === 0) {
      const output = (result.stdout?.toString() || '') + (result.stderr?.toString() || '');
      const match = output.match(/Python\s+(\d+)\.(\d+)/);
      if (match && (+match[1] > 3 || (+match[1] === 3 && +match[2] >= 11))) {
        return cmd;
      }
    }
  }
  return null;
}

/**
 * Detect uv on PATH.
 */
function findUv(): string | null {
  if (commandExists('uv')) {
    return 'uv';
  }
  return null;
}

/**
 * Create ~/.solidx/venv if it doesn't exist, using the best available tool.
 * Returns true on success.
 */
function ensureVenv(pythonCmd: string, uvCmd: string | null): boolean {
  if (fs.existsSync(path.join(VENV_DIR, 'pyvenv.cfg'))) {
    return true; // venv already exists
  }

  fs.mkdirSync(path.dirname(VENV_DIR), { recursive: true });

  console.log(`📦 Creating virtual environment at ${VENV_DIR}`);

  if (uvCmd) {
    const result = spawnSync(uvCmd, ['venv', VENV_DIR, '--python', pythonCmd], {
      stdio: 'inherit',
    });
    if (result.status === 0) return true;
    console.warn('⚠ uv venv failed, falling back to python -m venv');
  }

  const result = spawnSync(pythonCmd, ['-m', 'venv', VENV_DIR], {
    stdio: 'inherit',
  });
  return result.status === 0;
}

/**
 * Install solidx-ai-agent into the dedicated venv.
 * Prefers uv (faster) but falls back to pip.
 */
function installAgent(pythonCmd: string, uvCmd: string | null): boolean {
  const pipBin = path.join(VENV_BIN, process.platform === 'win32' ? 'pip.exe' : 'pip');

  console.log(`📦 Installing ${AGENT_PACKAGE}...`);

  if (uvCmd) {
    const result = spawnSync(uvCmd, ['pip', 'install', AGENT_PACKAGE, '--python', pipBin], {
      stdio: 'inherit',
    });
    if (result.status === 0) return true;
    console.warn('⚠ uv pip install failed, falling back to pip');
  }

  const result = spawnSync(pipBin, ['install', AGENT_PACKAGE], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

/**
 * Ensure the solidx-agent binary is available. If not found:
 *   1. Detect Python 3.11+ and uv
 *   2. Create ~/.solidx/venv if needed
 *   3. Install solidx-ai-agent into the venv
 *   4. Return the binary path
 *
 * Exits with an error if installation is impossible.
 */
export function ensureAgentInstalled(): string {
  const existing = findAgentBinary();
  if (existing) {
    return existing;
  }

  console.log(`⚠ solidx-agent not found in PATH`);

  const pythonCmd = findPython();
  if (!pythonCmd) {
    console.error(
      '❌ Python 3.11+ is required but not found.\n' +
      '   Install Python 3.11+ and try again, or manually run:\n' +
      `   pip install ${AGENT_PACKAGE}`,
    );
    process.exit(1);
  }

  const uvCmd = findUv();

  if (!ensureVenv(pythonCmd, uvCmd)) {
    console.error(
      '❌ Failed to create virtual environment at ' + VENV_DIR + '\n' +
      '   Try creating it manually:\n' +
      `   ${pythonCmd} -m venv ${VENV_DIR}`,
    );
    process.exit(1);
  }

  if (!installAgent(pythonCmd, uvCmd)) {
    console.error(
      '❌ Failed to install ' + AGENT_PACKAGE + '\n' +
      '   Try installing manually:\n' +
      `   ${VENV_BIN}/pip install ${AGENT_PACKAGE}`,
    );
    process.exit(1);
  }

  // Verify the binary is now available
  if (!fs.existsSync(VENV_AGENT_BIN)) {
    console.error(
      '❌ Package installed but solidx-agent binary not found at ' + VENV_AGENT_BIN + '\n' +
      '   The package may not have installed correctly. Try:\n' +
      `   ${VENV_BIN}/pip install --force-reinstall ${AGENT_PACKAGE}`,
    );
    process.exit(1);
  }

  console.log(`✔ ${AGENT_PACKAGE} installed successfully`);
  return VENV_AGENT_BIN;
}

/**
 * Ensure the agent UI is installed in ~/.solidx/agent-ui/.
 * Creates a runner project with @solidxai/agent-ui as a dependency,
 * then runs npm install. Returns the runner directory path.
 * Exits with an error if installation is impossible.
 */
export function ensureAgentUIInstalled(): string {
  const markerFile = path.join(AGENT_UI_DIR, 'node_modules', '.package-lock.json');

  if (fs.existsSync(markerFile)) {
    return AGENT_UI_DIR;
  }

  console.log(`📦 Installing ${AGENT_UI_PACKAGE}...`);

  fs.mkdirSync(AGENT_UI_DIR, { recursive: true });

  const runnerPackageJson = {
    name: 'solidx-agent-ui-runner',
    private: true,
    scripts: {
      dev: 'vite --port 8768 --host --root ./node_modules/@solidxai/agent-ui',
    },
  };

  fs.writeFileSync(
    path.join(AGENT_UI_DIR, 'package.json'),
    JSON.stringify(runnerPackageJson, null, 2),
  );

  const result = spawnSync(npmCommand, ['install', AGENT_UI_PACKAGE], {
    cwd: AGENT_UI_DIR,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error(
      `❌ Failed to install ${AGENT_UI_PACKAGE}\n` +
      '   Try installing manually:\n' +
      `   cd ${AGENT_UI_DIR} && npm install ${AGENT_UI_PACKAGE}`,
    );
    process.exit(1);
  }

  if (!fs.existsSync(AGENT_UI_PKG_DIR)) {
    console.error(
      `❌ Package installed but not found at ${AGENT_UI_PKG_DIR}\n` +
      '   Try reinstalling:\n' +
      `   cd ${AGENT_UI_DIR} && npm install ${AGENT_UI_PACKAGE}`,
    );
    process.exit(1);
  }

  console.log(`✔ ${AGENT_UI_PACKAGE} installed successfully`);
  return AGENT_UI_DIR;
}
