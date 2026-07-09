import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import semver from 'semver';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { isInteractiveSession } from '../utils/interactive';

const AGENT_PACKAGE = 'solidx-ai-agent';
const AGENT_UI_PACKAGE = '@solidxai/agent-ui';
const VENV_DIR = path.join(os.homedir(), '.solidx', 'venv');
const VENV_BIN = path.join(VENV_DIR, process.platform === 'win32' ? 'Scripts' : 'bin');
const VENV_AGENT_BIN = path.join(VENV_BIN, process.platform === 'win32' ? 'solidx-agent.exe' : 'solidx-agent');
const AGENT_UI_DIR = path.join(os.homedir(), '.solidx', 'agent-ui');
const AGENT_UI_PKG_DIR = path.join(AGENT_UI_DIR, 'node_modules', '@solidxai', 'agent-ui');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

type ExitMode = 'exit' | 'throw';

export class AgentCommandExit extends Error {
  constructor(
    public readonly exitCode: number,
    message?: string,
  ) {
    super(message ?? `Command exited with code ${exitCode}`);
    this.name = 'AgentCommandExit';
  }
}

function exitCommand(exitCode: number, exitMode: ExitMode, message?: string): never {
  if (exitMode === 'throw') {
    throw new AgentCommandExit(exitCode, message);
  }
  process.exit(exitCode);
}

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
 * Actually invoke a binary to confirm it runs successfully.
 *
 * This catches "ghost" entries on PATH that pass `which` but blow up on
 * execution — the most common case being pyenv shims. When a user has
 * `solidx-agent` installed in a pyenv-managed virtualenv but their
 * currently-selected pyenv version is something else, `~/.pyenv/shims/solidx-agent`
 * exists (so `which` returns 0) but executing it prints
 * `pyenv: solidx-agent: command not found` and exits 127.
 */
function commandRuns(cmd: string): boolean {
  const result = spawnSync(cmd, ['--version'], { stdio: 'pipe' });
  return result.status === 0;
}

/**
 * Check if solidx-agent binary is available.
 *
 * Order matters here. We prefer the dedicated ~/.solidx/venv binary that
 * solidctl itself manages, because it is the only location we can guarantee
 * is sane. Falling back to PATH only when the venv is missing avoids being
 * tripped up by broken pyenv shims (and similar) that are first on PATH but
 * fail at execution time.
 */
function findAgentBinary(): string | null {
  // 1. Prefer the dedicated venv solidctl owns — always works once installed.
  if (fs.existsSync(VENV_AGENT_BIN)) {
    return VENV_AGENT_BIN;
  }

  // 2. Fall back to PATH (dev installs, manual installs), but only if the
  //    binary actually executes — `which` alone is not enough because a
  //    broken pyenv shim will satisfy it but fail with exit 127 on spawn.
  const pathBinary = process.platform === 'win32' ? 'solidx-agent.cmd' : 'solidx-agent';
  if (commandExists(pathBinary) && commandRuns(pathBinary)) {
    return pathBinary;
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
    // --seed ensures pip and setuptools are included in the venv,
    // matching the behavior of `python -m venv`.
    const result = spawnSync(
      uvCmd,
      ['venv', VENV_DIR, '--python', pythonCmd, '--seed'],
      {
        stdio: 'inherit',
      },
    );
    if (result.status === 0) return true;
    console.warn('⚠ uv venv failed, falling back to python -m venv');
  }

  const result = spawnSync(pythonCmd, ['-m', 'venv', VENV_DIR], {
    stdio: 'inherit',
  });
  return result.status === 0;
}

/**
 * Resolve the Python interpreter that backs a given solidx-agent binary.
 *
 * The agent exposes no `--version` flag, so we instead ask the interpreter
 * that owns it for the installed `solidx-ai-agent` package metadata. Works for
 * the managed venv (`~/.solidx/venv/bin/`), local installs (`<src>/.venv/bin/`),
 * and PATH binaries (via the entrypoint script's shebang).
 */
function resolveAgentPython(binary: string): string | null {
  const dir = path.dirname(binary);
  const pyInDir = path.join(dir, process.platform === 'win32' ? 'python.exe' : 'python');
  if (fs.existsSync(pyInDir)) return pyInDir;

  try {
    const content = fs.readFileSync(binary, 'utf-8');
    const firstLine = content.split(/\r?\n/)[0] || '';
    if (firstLine.startsWith('#!')) {
      const interp = firstLine.slice(2).trim().split(/\s+/)[0];
      if (interp && fs.existsSync(interp)) return interp;
    }
  } catch {
    // ignore unreadable shebangs
  }

  return null;
}

/**
 * Probe the installed solidx-ai-agent package version backing a solidx-agent
 * binary by asking its owning Python interpreter for the package metadata.
 *
 * Read-only: no install is triggered. Returns the trimmed version, or
 * 'not installed' / 'unknown' when the binary is missing or the probe fails.
 */
export function getAgentVersion(agentCommand?: string): string {
  const binary = agentCommand || findAgentBinary();
  if (!binary) return 'not installed';
  const pythonBin = resolveAgentPython(binary);
  if (!pythonBin) return 'unknown';
  const result = spawnSync(
    pythonBin,
    ['-c', "import importlib.metadata as m; print(m.version('solidx-ai-agent'))"],
    { stdio: 'pipe' },
  );
  if (result.status !== 0) return 'unknown';
  return (result.stdout?.toString() || '').trim() || 'unknown';
}

/**
 * Print `solidx-ai-agent v<x.y.z>` to stdout.
 */
export function printAgentVersion(agentCommand?: string): void {
  console.log(`solidx-ai-agent v${getAgentVersion(agentCommand)}`);
}

const PYPI_TIMEOUT_MS = 10_000;

/**
 * Determine which agent track to use based on the installed solidctl version.
 * Any solidctl prerelease (alpha/beta/rc) maps to the agent beta track; a
 * stable solidctl maps to the agent stable track.
 */
export function getSolidctlAgentTrack(): 'stable' | 'beta' {
  // agent-helper.ts lives in src/commands/ → dist/commands/, so the consuming
  // package.json is two levels up (repo root in dev, package root when installed).
  const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version?: string };
    const version = packageJson.version || '0.0.0';
    return semver.prerelease(version) ? 'beta' : 'stable';
  } catch {
    return 'stable';
  }
}

/**
 * Normalize a PEP 440 agent version into a semver-parseable string.
 * `0.2.3b1` → `0.2.3-b1`; everything else passes through unchanged.
 */
function toSemver(version: string): string {
  return version.replace(/^(\d+\.\d+\.\d+)b(\d+)$/, '$1-b$2');
}

/**
 * Ask PyPI for the highest published solidx-ai-agent release on the given track.
 * Returns null on any network/parse failure (swallowed silently by callers).
 */
async function getLatestAgentRelease(track: 'stable' | 'beta'): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PYPI_TIMEOUT_MS);
    const response = await fetch('https://pypi.org/pypi/solidx-ai-agent/json', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = (await response.json()) as { releases?: Record<string, unknown> };
    const candidates = Object.keys(data.releases || {})
      .map((v) => toSemver(v))
      .filter((v) => semver.valid(v) && (track === 'beta' ? !!semver.prerelease(v) : !semver.prerelease(v)));
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => semver.rcompare(a, b));
    return candidates[0];
  } catch {
    return null;
  }
}

/**
 * Check PyPI for a newer solidx-ai-agent in the same track as the installed
 * solidctl, and prompt the user to upgrade into the managed ~/.solidx/venv.
 *
 * Skipped entirely when `isLocal` is true (the user is developing against a
 * local agent checkout). Silent on any network/parse failure. Mirrors the UX
 * of the solidctl self-update check in src/version-check.ts.
 */
export async function checkAgentUpdate(opts: { isLocal: boolean; exitMode?: ExitMode }): Promise<void> {
  if (opts.isLocal) return;
  const currentRaw = getAgentVersion();
  const current = toSemver(currentRaw);
  if (!semver.valid(current)) return; // 'not installed' / 'unknown' / unparseable

  const track = getSolidctlAgentTrack();
  const spinner = ora(`Checking for ${track} agent updates...`).start();
  const latestRaw = await getLatestAgentRelease(track);
  spinner.stop();
  if (!latestRaw) return;
  const latest = toSemver(latestRaw);
  if (!semver.valid(latest)) return;
  if (!semver.gt(latest, current)) return;

  console.log(
    chalk.yellow(
      `\n⚠️  A newer version of ${AGENT_PACKAGE} is available: ${latestRaw} (you have ${currentRaw})`,
    ),
  );

  let upgrade = false;
  if (isInteractiveSession()) {
    try {
      const answer = await inquirer.prompt<{ upgrade: boolean }>([
        {
          type: 'confirm',
          name: 'upgrade',
          message: `Would you like to upgrade to ${latestRaw}?`,
          default: false,
        },
      ]);
      upgrade = answer.upgrade;
    } catch {
      // Prompt cancelled (e.g. Ctrl+C) → don't upgrade
    }
  }
  // Non-interactive (no TTY, or CI) → skip the prompt entirely and fall
  // through to the "upgrade later" message below, using the prompt's own
  // default of false. Never call inquirer here: with piped/ignored stdin
  // (every solidctl child process) it can hang indefinitely instead of
  // rejecting, which is what caused release-validation to time out waiting
  // for services that never got a chance to start.

  const preFlag = track === 'beta' ? ['--pre'] : [];
  const manual = `pip install ${preFlag.length ? '--pre ' : ''}--upgrade ${AGENT_PACKAGE}`;

  if (!upgrade) {
    console.log(chalk.dim(`  You can upgrade later with: ${manual}\n`));
    return;
  }

  const uvCmd = findUv();
  const venvPython = path.join(VENV_BIN, process.platform === 'win32' ? 'python.exe' : 'python');
  const pipBin = path.join(VENV_BIN, process.platform === 'win32' ? 'pip.exe' : 'pip');

  console.log(chalk.cyan(`\n▶ Upgrading ${AGENT_PACKAGE}...\n`));
  let ok = false;
  if (uvCmd) {
    const result = spawnSync(
      uvCmd,
      ['pip', 'install', ...preFlag, '--upgrade', AGENT_PACKAGE, '--python', venvPython],
      { stdio: 'inherit' },
    );
    ok = result.status === 0;
    if (!ok) console.warn('⚠ uv install failed, falling back to pip');
  }
  if (!ok) {
    const pipCmd = fs.existsSync(pipBin) ? pipBin : venvPython;
    const pipArgs = fs.existsSync(pipBin)
      ? ['install', ...preFlag, '--upgrade', AGENT_PACKAGE]
      : ['-m', 'pip', 'install', ...preFlag, '--upgrade', AGENT_PACKAGE];
    const result = spawnSync(pipCmd, pipArgs, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    ok = result.status === 0;
  }

  if (ok) {
    console.log(chalk.green(`\n✔ Upgraded to ${latestRaw}. Please re-run your command.\n`));
    exitCommand(0, opts.exitMode ?? 'exit', `Upgraded to ${latestRaw}. Please re-run your command.`);
  } else {
    console.error(chalk.red(`\n❌ Upgrade failed. You can manually run: ${manual}\n`));
  }
}

/**
 * Install solidx-ai-agent into the dedicated venv.
 * Prefers uv (faster) but falls back to pip.
 */
function installAgent(pythonCmd: string, uvCmd: string | null): boolean {
  const venvPython = path.join(
    VENV_BIN,
    process.platform === 'win32' ? 'python.exe' : 'python',
  );
  const pipBin = path.join(
    VENV_BIN,
    process.platform === 'win32' ? 'pip.exe' : 'pip',
  );

  // Install the agent on the same track as the installed solidctl: a beta
  // solidctl pulls the latest beta from PyPI (via --pre), a stable solidctl
  // pulls the latest stable.
  const track = getSolidctlAgentTrack();
  const preFlag = track === 'beta' ? ['--pre'] : [];

  console.log(`📦 Installing ${AGENT_PACKAGE}${track === 'beta' ? ' (beta)' : ''}...`);

  if (uvCmd) {
    // Pass the venv's Python interpreter to uv so it targets the correct environment.
    // Using --python <interpreter> is the correct uv flag (not the pip binary).
    const result = spawnSync(
      uvCmd,
      ['pip', 'install', ...preFlag, AGENT_PACKAGE, '--python', venvPython],
      {
        stdio: 'inherit',
      },
    );
    if (result.status === 0) return true;
    console.warn('⚠ uv pip install failed, falling back to pip');
  }

  // uv venv does not include pip by default, so fall back to python -m pip
  // which works as long as the venv itself is functional.
  const pipCmd = fs.existsSync(pipBin) ? pipBin : venvPython;
  const pipArgs = fs.existsSync(pipBin)
    ? ['install', ...preFlag, AGENT_PACKAGE]
    : ['-m', 'pip', 'install', ...preFlag, AGENT_PACKAGE];

  const result = spawnSync(pipCmd, pipArgs, {
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
export function ensureAgentInstalled(exitMode: ExitMode = 'exit'): string {
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
    exitCommand(1, exitMode, 'Python 3.11+ is required but not found.');
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
    exitCommand(1, exitMode, `Failed to create virtual environment at ${VENV_DIR}`);
  }

  if (!installAgent(pythonCmd, uvCmd)) {
    console.error(
      '❌ Failed to install ' + AGENT_PACKAGE + '\n' +
      '   Try installing manually:\n' +
      `   ${VENV_BIN}/pip install ${AGENT_PACKAGE}`,
    );
    exitCommand(1, exitMode, `Failed to install ${AGENT_PACKAGE}`);
  }

  // Verify the binary is now available
  if (!fs.existsSync(VENV_AGENT_BIN)) {
    console.error(
      '❌ Package installed but solidx-agent binary not found at ' + VENV_AGENT_BIN + '\n' +
      '   The package may not have installed correctly. Try:\n' +
      `   ${VENV_BIN}/pip install --force-reinstall ${AGENT_PACKAGE}`,
    );
    exitCommand(1, exitMode, `Package installed but solidx-agent binary not found at ${VENV_AGENT_BIN}`);
  }

  console.log(`✔ ${AGENT_PACKAGE} installed successfully`);
  return VENV_AGENT_BIN;
}

/**
 * Detect local solidx-ai-agent source directory.
 * Checks SOLIDX_AI_AGENT_PATH env var; errors if not set or not valid.
 * Returns the directory path if a valid agent repo is found.
 */
function resolveLocalAgentSource(exitMode: ExitMode = 'exit'): string {
  const envPath = process.env.SOLIDX_AI_AGENT_PATH;

  if (!envPath) {
    console.error(
      '❌ --local requires SOLIDX_AI_AGENT_PATH to be set.\n' +
      '   Example: SOLIDX_AI_AGENT_PATH=/path/to/solidx-ai-agent solidctl agent start --local',
    );
    exitCommand(1, exitMode, '--local requires SOLIDX_AI_AGENT_PATH to be set.');
  }

  const resolved = path.resolve(envPath);
  if (!fs.existsSync(path.join(resolved, 'pyproject.toml'))) {
    console.error(
      `❌ SOLIDX_AI_AGENT_PATH points to an invalid directory: ${resolved}\n` +
      '   Expected pyproject.toml to exist in that directory.',
    );
    exitCommand(1, exitMode, `SOLIDX_AI_AGENT_PATH points to an invalid directory: ${resolved}`);
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
export function ensureAgentInstalledLocal(exitMode: ExitMode = 'exit'): string {
  const agentSourceDir = resolveLocalAgentSource(exitMode);
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
    exitCommand(1, exitMode, 'Python 3.11+ is required but not found.');
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
      // --seed ensures pip and setuptools are included in the venv.
      const uvResult = spawnSync(uvCmd, ['venv', localVenvDir, '--python', pythonCmd, '--seed'], {
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
        exitCommand(1, exitMode, `Failed to create virtual environment at ${localVenvDir}`);
      }
    }
  }

  if (!installLocalAgent(agentSourceDir)) {
    console.error(
      '❌ Failed to install local ' + AGENT_PACKAGE + '\n' +
      '   Try installing manually:\n' +
      `   ${localPythonBin} -m pip install -e ${agentSourceDir}[full]`,
    );
    exitCommand(1, exitMode, `Failed to install local ${AGENT_PACKAGE}`);
  }

  // Verify the binary is now available
  if (!fs.existsSync(localAgentBin)) {
    console.error(
      '❌ Package installed but solidx-agent binary not found at ' + localAgentBin + '\n' +
      '   The package may not have installed correctly. Try:\n' +
      `   ${localPythonBin} -m pip install --force-reinstall -e ${agentSourceDir}[full]`,
    );
    exitCommand(1, exitMode, `Package installed but solidx-agent binary not found at ${localAgentBin}`);
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
