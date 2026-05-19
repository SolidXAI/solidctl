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
 * Probe a Python command and return its real executable path plus major/minor version.
 *
 * We intentionally ask Python for sys.executable instead of returning the command name
 * we were given. This matters on Ubuntu because "python" often comes from a shell alias
 * or shell function (for example alias python=python3). Node's spawnSync does not execute
 * those shell customizations unless we explicitly go through an interactive shell, so a
 * command that works in the user's terminal can still look "missing" from here.
 */
function probePythonCommand(cmd: string): { executable: string; major: number; minor: number } | null {
  const versionScript = [
    'import sys',
    'print(sys.executable)',
    'print(f"{sys.version_info[0]}.{sys.version_info[1]}")',
  ].join('; ');

  const directResult = spawnSync(cmd, ['-c', versionScript], { stdio: 'pipe' });
  const directProbe = parsePythonProbeOutput(directResult.stdout?.toString() || '');
  if (directResult.status === 0 && directProbe) {
    return directProbe;
  }

  if (process.platform === 'win32') {
    return null;
  }

  // Ubuntu-specific fallback: re-run the probe through the user's interactive shell so
  // aliases like "python=python3" and shell-managed shims resolve the same way they do
  // in a normal terminal session.
  const shellPath = process.env.SHELL || '/bin/bash';
  const shellResult = spawnSync(shellPath, ['-ic', `${cmd} -c '${versionScript}'`], { stdio: 'pipe' });
  const shellProbe = parsePythonProbeOutput(shellResult.stdout?.toString() || '');
  if (shellResult.status === 0 && shellProbe) {
    return shellProbe;
  }

  return null;
}

function parsePythonProbeOutput(output: string): { executable: string; major: number; minor: number } | null {
  const [executableLine, versionLine] = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const versionMatch = versionLine?.match(/^(\d+)\.(\d+)$/);

  if (!executableLine || !versionMatch) {
    return null;
  }

  return {
    executable: executableLine,
    major: +versionMatch[1],
    minor: +versionMatch[2],
  };
}

/**
 * Detect the best available Python executable that is version 3.11+.
 * Returns the resolved executable path so later subprocesses do not depend on shell aliases.
 */
function findPython(): string | null {
  for (const cmd of ['python3', 'python']) {
    const probe = probePythonCommand(cmd);
    if (probe && (probe.major > 3 || (probe.major === 3 && probe.minor >= 11))) {
      return probe.executable;
    }
  }
  return null;
}

/**
 * Detect uv on PATH and verify it actually works.
 */
function findUv(): string | null {
  if (!commandExists('uv')) {
    return null;
  }
  const result = spawnSync('uv', ['--version'], { stdio: 'pipe' });
  if (result.status === 0) {
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
      `   ${pythonCmd} -m venv ${VENV_DIR}` +
      (process.platform === 'linux'
        ? '\n   On Ubuntu/Debian you may also need: sudo apt-get install python3-venv'
        : ''),
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
 * Detect local solidx-ai-agent source directory.
 * Checks SOLIDX_AI_AGENT_PATH env var; errors if not set or not valid.
 * Returns the directory path if a valid agent repo is found.
 */
function resolveLocalAgentSource(): string {
  const envPath = process.env.SOLIDX_AI_AGENT_PATH;

  if (!envPath) {
    console.error(
      '❌ --local requires SOLIDX_AI_AGENT_PATH to be set.\n' +
      '   Example: SOLIDX_AI_AGENT_PATH=/path/to/solidx-ai-agent solidctl agent start --local',
    );
    process.exit(1);
  }

  const resolved = path.resolve(envPath);
  if (!fs.existsSync(path.join(resolved, 'pyproject.toml'))) {
    console.error(
      `❌ SOLIDX_AI_AGENT_PATH points to an invalid directory: ${resolved}\n` +
      '   Expected pyproject.toml to exist in that directory.',
    );
    process.exit(1);
  }

  return resolved;
}

/**
 * Install solidx-ai-agent from local source in editable mode.
 * Uses pip install -e .[full] into the source directory's own venv.
 */
function installLocalAgent(agentSourceDir: string): boolean {
  const localVenvDir = path.join(agentSourceDir, '.venv');
  const localVenvBin = path.join(localVenvDir, process.platform === 'win32' ? 'Scripts' : 'bin');
  const pythonBin = path.join(localVenvBin, process.platform === 'win32' ? 'python.exe' : 'python');

  console.log(`📦 Installing local ${AGENT_PACKAGE} from ${agentSourceDir} into ${localVenvDir}...`);

  const uvCmd = findUv();
  if (uvCmd) {
    const result = spawnSync(uvCmd, ['pip', 'install', '-e', `${agentSourceDir}[full]`, '--python', pythonBin], {
      stdio: 'inherit',
    });
    if (result.status === 0) return true;
    console.warn('⚠ uv pip install -e failed, falling back to python -m pip');
  }

  const result = spawnSync(pythonBin, ['-m', 'pip', 'install', '-e', `${agentSourceDir}[full]`], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

/**
 * Ensure the solidx-agent binary is available from a local source install.
 * If --local is used:
 *   1. Validate SOLIDX_AI_AGENT_PATH
 *   2. Create .venv in the agent source directory
 *   3. Install with pip install -e .[full]
 *   4. Return the binary path
 *
 * Exits with an error if local source is not found or install fails.
 */
export function ensureAgentInstalledLocal(): string {
  const agentSourceDir = resolveLocalAgentSource();
  const localVenvDir = path.join(agentSourceDir, '.venv');
  const localVenvBin = path.join(localVenvDir, process.platform === 'win32' ? 'Scripts' : 'bin');
  const localAgentBin = path.join(localVenvBin, process.platform === 'win32' ? 'solidx-agent.exe' : 'solidx-agent');

  // Check if local venv binary already exists
  if (fs.existsSync(localAgentBin)) {
    console.log(`📦 Using local agent from ${localAgentBin}`);
    return localAgentBin;
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
  const localPythonBin = path.join(localVenvBin, process.platform === 'win32' ? 'python.exe' : 'python');

  // Create local venv inside the agent source directory
  let venvNeedsCreation = !fs.existsSync(path.join(localVenvDir, 'pyvenv.cfg'));

  // Also recreate if pip is missing (e.g. uv venv without pip, or corrupted venv)
  if (!venvNeedsCreation && fs.existsSync(localPythonBin)) {
    const pipCheck = spawnSync(localPythonBin, ['-m', 'pip', '--version'], { stdio: 'pipe' });
    if (pipCheck.status !== 0) {
      console.warn(`⚠ ${localVenvDir} exists but pip is missing; recreating venv...`);
      venvNeedsCreation = true;
    }
  }

  if (venvNeedsCreation) {
    // Remove any stale venv before recreating
    if (fs.existsSync(localVenvDir)) {
      fs.rmSync(localVenvDir, { recursive: true, force: true });
    }

    console.log(`📦 Creating local virtual environment at ${localVenvDir}`);
    if (uvCmd) {
      const uvResult = spawnSync(uvCmd, ['venv', localVenvDir, '--python', pythonCmd], {
        stdio: 'inherit',
      });
      if (uvResult.status !== 0) {
        console.warn('⚠ uv venv failed, falling back to python -m venv');
      }
    }
    if (!fs.existsSync(path.join(localVenvDir, 'pyvenv.cfg'))) {
      const venvResult = spawnSync(pythonCmd, ['-m', 'venv', '--upgrade-deps', localVenvDir], {
        stdio: 'inherit',
      });
      if (venvResult.status !== 0) {
        console.error(
          '❌ Failed to create virtual environment at ' + localVenvDir + '\n' +
          '   Try creating it manually:\n' +
          `   ${pythonCmd} -m venv --upgrade-deps ${localVenvDir}` +
          (process.platform === 'linux'
            ? '\n   On Ubuntu/Debian you may also need: sudo apt-get install python3-venv'
            : ''),
        );
        process.exit(1);
      }
    }
  }

  if (!installLocalAgent(agentSourceDir)) {
    console.error(
      '❌ Failed to install local ' + AGENT_PACKAGE + '\n' +
      '   Try installing manually:\n' +
      `   ${localPythonBin} -m pip install -e ${agentSourceDir}[full]`,
    );
    process.exit(1);
  }

  // Verify the binary is now available
  if (!fs.existsSync(localAgentBin)) {
    console.error(
      '❌ Package installed but solidx-agent binary not found at ' + localAgentBin + '\n' +
      '   The package may not have installed correctly. Try:\n' +
      `   ${localPythonBin} -m pip install --force-reinstall -e ${agentSourceDir}[full]`,
    );
    process.exit(1);
  }

  console.log(`✔ Local ${AGENT_PACKAGE} installed successfully`);
  return localAgentBin;
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
