import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import semver from 'semver';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { AgentCommandExit, ensureVenv, findPython, findUv, getSolidctlAgentTrack } from './agent-helper';
import { isInteractiveSession } from '../utils/interactive';

const RUNTIME_PACKAGE = 'solidx-agenthub-runtime';
const SOURCE_ENV = 'SOLIDX_AGENTHUB_RUNTIME_PATH';
const MANAGED_VENV = path.join(os.homedir(), '.solidx', 'agenthub-venv');
const PYPI_URL = `https://pypi.org/pypi/${RUNTIME_PACKAGE}/json`;

function venvPaths(venvDir: string) {
  const bin = path.join(venvDir, process.platform === 'win32' ? 'Scripts' : 'bin');
  return {
    python: path.join(bin, process.platform === 'win32' ? 'python.exe' : 'python'),
    command: path.join(bin, process.platform === 'win32' ? 'agenthub-runtime.exe' : 'agenthub-runtime'),
  };
}

function findRuntimeBinary(): string | null {
  const managed = venvPaths(MANAGED_VENV).command;
  if (fs.existsSync(managed)) return managed;

  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['agenthub-runtime'], {
    stdio: 'pipe',
  });
  if (result.status !== 0) return null;
  const binary = result.stdout?.toString().trim().split(/\r?\n/)[0];
  if (!binary) return null;
  // The runtime has no --version option. --help also rejects broken PATH shims.
  const probe = spawnSync(binary, ['--help'], { stdio: 'pipe', timeout: 15_000 });
  return probe.status === 0 ? binary : null;
}

export function getAgentHubVersion(command = findRuntimeBinary() || ''): string {
  if (!command) return 'not installed';
  const python = path.join(path.dirname(command), process.platform === 'win32' ? 'python.exe' : 'python');
  if (!fs.existsSync(python)) return 'unknown';
  const result = spawnSync(python, [
    '-c', `import importlib.metadata; print(importlib.metadata.version('${RUNTIME_PACKAGE}'))`,
  ], { stdio: 'pipe' });
  return result.status === 0 ? result.stdout.toString().trim() : 'unknown';
}

function toSemver(version: string): string {
  return version.replace(/^(\d+\.\d+\.\d+)(a|b|rc)(\d+)$/, '$1-$2$3');
}

async function getLatestRuntimeRelease(track: 'stable' | 'beta'): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(PYPI_URL, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json() as { releases?: Record<string, unknown> };
    const candidates = Object.keys(data.releases || {})
      .map(toSemver)
      .filter((version) => semver.valid(version) &&
        (track === 'beta' ? Boolean(semver.prerelease(version)) : !semver.prerelease(version)));
    candidates.sort((a, b) => semver.rcompare(a, b));
    return candidates[0] || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Match agent startup: same release track, optional TTY upgrade, and rerun after success. */
export async function checkAgentHubUpdate(options: { isLocal: boolean }): Promise<void> {
  if (options.isLocal) return;
  const currentRaw = getAgentHubVersion();
  const current = toSemver(currentRaw);
  if (!semver.valid(current)) return;
  const track = getSolidctlAgentTrack();
  const spinner = ora(`Checking for ${track} AgentHub runtime updates...`).start();
  const latest = await getLatestRuntimeRelease(track);
  spinner.stop();
  if (!latest || !semver.gt(latest, current)) return;
  const latestRaw = latest.replace(/-(a|b|rc)(\d+)$/, '$1$2');
  console.log(chalk.yellow(`\n⚠️  A newer version of ${RUNTIME_PACKAGE} is available: ${latestRaw} (you have ${currentRaw})`));

  let upgrade = false;
  if (isInteractiveSession()) {
    try {
      const answer = await inquirer.prompt<{ upgrade: boolean }>([{
        type: 'confirm', name: 'upgrade', message: `Would you like to upgrade to ${latestRaw}?`, default: false,
      }]);
      upgrade = answer.upgrade;
    } catch {
      // Cancelled prompts leave the installed package unchanged.
    }
  }
  const manual = `${venvPaths(MANAGED_VENV).python} -m pip install ${track === 'beta' ? '--pre ' : ''}--upgrade ${RUNTIME_PACKAGE}`;
  if (!upgrade) {
    console.log(chalk.dim(`  You can upgrade later with: ${manual}\n`));
    return;
  }
  console.log(chalk.cyan(`\n▶ Upgrading ${RUNTIME_PACKAGE}...\n`));
  try {
    ensureAgentHubInstalled({ upgrade: true });
  } catch {
    console.error(chalk.red(`\n❌ Upgrade failed. You can manually run: ${manual}\n`));
    return;
  }
  console.log(chalk.green(`\n✔ Upgraded to ${latestRaw}. Please re-run your command.\n`));
  throw new AgentCommandExit(0, `Upgraded to ${latestRaw}. Please re-run your command.`);
}

export function ensureAgentHubInstalled(options: { local?: boolean; upgrade?: boolean }): string {
  let sourceDir: string | undefined;
  if (options.local) {
    const sourcePath = process.env[SOURCE_ENV];
    if (!sourcePath) {
      throw new Error(`--local requires ${SOURCE_ENV} to be set to your AgentHub runtime checkout.`);
    }
    sourceDir = path.resolve(sourcePath);
    if (!fs.existsSync(path.join(sourceDir, 'pyproject.toml'))) {
      throw new Error(`${SOURCE_ENV} points to an invalid directory: ${sourceDir} (expected pyproject.toml).`);
    }
  } else if (!options.upgrade) {
    const existing = findRuntimeBinary();
    if (existing) return existing;
  }

  const venvDir = sourceDir ? path.join(sourceDir, '.venv') : MANAGED_VENV;
  const { python, command } = venvPaths(venvDir);
  if (sourceDir && !options.upgrade && fs.existsSync(command)) {
    console.log(`Using local AgentHub runtime from ${command}`);
    return command;
  }

  const pythonCmd = fs.existsSync(python) ? python : findPython();
  if (!pythonCmd) throw new Error('Python 3.11+ is required but not found.');
  const uv = findUv();
  if (!ensureVenv(pythonCmd, uv, venvDir)) {
    throw new Error(`Failed to create virtual environment at ${venvDir}.`);
  }

  const installArgs = [
    'install',
    ...(options.upgrade ? ['--upgrade'] : []),
    ...(sourceDir ? ['-e', sourceDir] : [
      ...(getSolidctlAgentTrack() === 'beta' ? ['--pre'] : []),
      RUNTIME_PACKAGE,
    ]),
  ];
  console.log(`Installing ${RUNTIME_PACKAGE}${sourceDir ? ` from ${sourceDir}` : ' from PyPI'}...`);

  let installed = false;
  if (uv) {
    installed = spawnSync(uv, ['pip', ...installArgs, '--python', python], { stdio: 'inherit' }).status === 0;
    if (!installed) console.warn('uv install failed; falling back to python -m pip.');
  }
  if (!installed) {
    installed = spawnSync(python, ['-m', 'pip', ...installArgs], { stdio: 'inherit' }).status === 0;
  }
  if (!installed) {
    throw new Error(sourceDir
      ? `Failed to install local ${RUNTIME_PACKAGE} from ${sourceDir}.`
      : `Failed to install ${RUNTIME_PACKAGE} from PyPI. Until it is published, use solidctl start agenthub --local with ${SOURCE_ENV} set.`);
  }
  if (!fs.existsSync(command)) {
    throw new Error(`Package installed but agenthub-runtime binary not found at ${command}.`);
  }
  return command;
}
