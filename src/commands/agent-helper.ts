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

const AGENT_LOCAL_PATH_ENV = 'SOLIDX_AI_AGENT_PATH';
const AGENT_LOCAL_CANDIDATES = [
  '../solidx-ai-agent',
  '../../solidx-ai-agent',
  '../../../solidx-ai-agent',
];

/**
 * Detect local solidx-ai-agent source directory.
 * Checks SOLIDX_AI_AGENT_PATH env var first, then common relative paths.
 * Returns the directory path if a valid agent repo is found, else null.
 */
function findLocalAgentSource(): string | null {
  const envPath = process.env[AGENT_LOCAL_PATH_ENV];
  if (envPath && fs.existsSync(path.join(envPath, 'pyproject.toml'))) {
    return path.resolve(envPath);
  }

  for (const candidate of AGENT_LOCAL_CANDIDATES) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(path.join(resolved, 'pyproject.toml'))) {
      return resolved;
    }
  }

  return null;
}

/**
 * Install solidx-ai-agent from local source in editable mode.
 * Uses pip install -e .[full] into the dedicated venv.
 */
function installLocalAgent(agentSourceDir: string): boolean {
  const pipBin = path.join(VENV_BIN, process.platform === 'win32' ? 'pip.exe' : 'pip');

  console.log(`📦 Installing local ${AGENT_PACKAGE} from ${agentSourceDir}...`);

  const uvCmd = findUv();
  if (uvCmd) {
    const result = spawnSync(uvCmd, ['pip', 'install', '-e', `${agentSourceDir}[full]`, '--python', pipBin], {
      stdio: 'inherit',
    });
    if (result.status === 0) return true;
    console.warn('⚠ uv pip install -e failed, falling back to pip');
  }

  const result = spawnSync(pipBin, ['install', '-e', `${agentSourceDir}[full]`], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

/**
 * Ensure the solidx-agent binary is available from a local source install.
 * If --local is used:
 *   1. Detect local agent source directory
 *   2. Ensure ~/.solidx/venv exists
 *   3. Install with pip install -e .[full]
 *   4. Return the binary path
 *
 * Exits with an error if local source is not found or install fails.
 */
export function ensureAgentInstalledLocal(): string {
  const existing = findAgentBinary();

  const agentSourceDir = findLocalAgentSource();
  if (!agentSourceDir) {
    console.error(
      '❌ Local solidx-ai-agent source not found.\n' +
      '   Set SOLIDX_AI_AGENT_PATH to the agent repo root, or ensure it\n' +
      '   exists at a common relative path (e.g. ../solidx-ai-agent).',
    );
    process.exit(1);
  }

  console.log(`📦 Using local agent source: ${agentSourceDir}`);

  const pythonCmd = findPython();
  if (!pythonCmd) {
    console.error(
      '❌ Python 3.11+ is required but not found.\n' +
      '   Install Python 3.11+ and try again.',
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

  if (!installLocalAgent(agentSourceDir)) {
    console.error(
      '❌ Failed to install local ' + AGENT_PACKAGE + '\n' +
      '   Try installing manually:\n' +
      `   ${VENV_BIN}/pip install -e ${agentSourceDir}[full]`,
    );
    process.exit(1);
  }

  // Verify the binary is now available
  if (!fs.existsSync(VENV_AGENT_BIN)) {
    console.error(
      '❌ Package installed but solidx-agent binary not found at ' + VENV_AGENT_BIN + '\n' +
      '   The package may not have installed correctly. Try:\n' +
      `   ${VENV_BIN}/pip install --force-reinstall -e ${agentSourceDir}[full]`,
    );
    process.exit(1);
  }

  console.log(`✔ Local ${AGENT_PACKAGE} installed successfully`);
  return VENV_AGENT_BIN;
}

const MIN_AGENT_UI_VERSION = '0.1.2';

/**
 * Parse a simple semver string into a comparable tuple [major, minor, patch].
 */
function parseVersion(version: string): [number, number, number] {
  const match = version.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [+match[1], +match[2], +match[3]];
}

/**
 * Returns true if installedVersion >= minVersion.
 */
function isVersionSatisfied(installedVersion: string, minVersion: string): boolean {
  const installed = parseVersion(installedVersion);
  const min = parseVersion(minVersion);
  for (let i = 0; i < 3; i++) {
    if (installed[i] > min[i]) return true;
    if (installed[i] < min[i]) return false;
  }
  return true;
}

/**
 * Ensure the agent UI is installed in ~/.solidx/agent-ui/.
 * Creates a runner project with @solidxai/agent-ui as a dependency,
 * then runs npm install. Returns the runner directory path.
 * Exits with an error if installation is impossible.
 */
export function ensureAgentUIInstalled(): string {
  const markerFile = path.join(AGENT_UI_DIR, 'node_modules', '.package-lock.json');
  const packageJsonPath = path.join(AGENT_UI_DIR, 'package.json');
  const installedAgentUiPkgJson = path.join(AGENT_UI_PKG_DIR, 'package.json');

  const runnerPackageJson = {
    name: 'solidx-agent-ui-runner',
    private: true,
    scripts: {
      dev: 'vite --port 8768 --host --config ./node_modules/@solidxai/agent-ui/vite.config.ts',
    },
  };

  let needsInstall = false;
  if (!fs.existsSync(packageJsonPath)) {
    needsInstall = true;
  } else {
    try {
      const existing = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (JSON.stringify(existing.scripts) !== JSON.stringify(runnerPackageJson.scripts)) {
        needsInstall = true;
      }
    } catch {
      needsInstall = true;
    }
  }

  // Check installed agent-ui version
  if (!needsInstall && fs.existsSync(installedAgentUiPkgJson)) {
    try {
      const installed = JSON.parse(fs.readFileSync(installedAgentUiPkgJson, 'utf-8'));
      if (!isVersionSatisfied(installed.version || '0.0.0', MIN_AGENT_UI_VERSION)) {
        console.log(`📦 ${AGENT_UI_PACKAGE} v${installed.version} is outdated (need >= ${MIN_AGENT_UI_VERSION}), updating...`);
        needsInstall = true;
      }
    } catch {
      needsInstall = true;
    }
  }

  if (!needsInstall && fs.existsSync(markerFile)) {
    return AGENT_UI_DIR;
  }

  console.log(`📦 Installing ${AGENT_UI_PACKAGE}...`);

  fs.mkdirSync(AGENT_UI_DIR, { recursive: true });

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(runnerPackageJson, null, 2),
  );

  // Clean up stale runner vite.config.ts from older solidctl versions
  const staleRunnerConfig = path.join(AGENT_UI_DIR, 'vite.config.ts');
  if (fs.existsSync(staleRunnerConfig)) {
    fs.unlinkSync(staleRunnerConfig);
  }

  const result = spawnSync(npmCommand, ['install', `${AGENT_UI_PACKAGE}@latest`], {
    cwd: AGENT_UI_DIR,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error(
      `❌ Failed to install ${AGENT_UI_PACKAGE}\n` +
      '   Try installing manually:\n' +
      `   cd ${AGENT_UI_DIR} && npm install ${AGENT_UI_PACKAGE}@latest`,
    );
    process.exit(1);
  }

  if (!fs.existsSync(AGENT_UI_PKG_DIR)) {
    console.error(
      `❌ Package installed but not found at ${AGENT_UI_PKG_DIR}\n` +
      '   Try reinstalling:\n' +
      `   cd ${AGENT_UI_DIR} && npm install ${AGENT_UI_PACKAGE}@latest`,
    );
    process.exit(1);
  }

  console.log(`✔ ${AGENT_UI_PACKAGE} installed successfully`);
  return AGENT_UI_DIR;
}
