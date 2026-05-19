import { Command } from 'commander';
import { ChildProcess, spawn, execSync } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import net from 'net';
import os from 'os';
import path from 'path';

interface PublishConfig {
  mainBranch: string;
  devBranch: string;
  reverseMerge: boolean;
}

interface PackageJson {
  name?: string;
  version?: string;
}

interface PublishOptions {
  preid?: string;
  dryRun?: boolean;
  force?: boolean;
  merge?: boolean;
  mainBranch?: string;
  devBranch?: string;
}

const DEFAULT_CONFIG: PublishConfig = {
  mainBranch: 'main',
  devBranch: 'dev',
  reverseMerge: true,
};

const LOCAL_RELEASE_TEST_PROJECTS = new Set<ReleaseProjectType>(['solid-core-module', 'solid-core-ui']);
const RELEASE_TEST_PROJECT_PATH_ENV = 'SOLIDX_RELEASE_TEST_CONSUMING_PRJ_PATH';
const DEFAULT_RELEASE_VALIDATION_API_PORT = 8080;
const DEFAULT_RELEASE_VALIDATION_UI_PORT = 5173;
const RELEASE_VALIDATION_READY_TIMEOUT_MS = 5 * 60 * 1000;
const RELEASE_VALIDATION_READY_POLL_INTERVAL_MS = 2_000;
const RELEASE_VALIDATION_POST_READY_DELAY_MS = 10_000;
const RELEASE_VALIDATION_POST_STOP_DELAY_MS = 3_000;
const RELEASE_VALIDATION_TEARDOWN_RETRY_COUNT = 3;
const RELEASE_VALIDATION_TEARDOWN_RETRY_DELAY_MS = 3_000;

type ReleaseProjectType = 'solidctl' | 'solid-core-module' | 'solid-core-ui' | 'solid-library-management';

interface ResolvedReleaseProject {
  type: ReleaseProjectType;
  cwdName: string;
  packageName?: string;
  versionSourcePath?: string;
}

interface RunningConsumingProject {
  child: ChildProcess | null;
  logPath: string | null;
  logStream: fs.WriteStream | null;
}

interface ReleaseValidationTargets {
  apiPort: number;
  uiPort: number;
  apiBaseUrl: string;
  uiBaseUrl: string;
}

let activeReleaseValidationProject: RunningConsumingProject | null = null;
let activeReleaseValidationCleanup: Promise<void> | null = null;

function loadConfig(): PublishConfig {
  const configPaths = [
    path.join(process.cwd(), 'solidctl.config.json'),
    path.join(process.cwd(), 'package.json'),
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const config = configPath.endsWith('package.json')
          ? content.solidctl?.publish
          : content.publish;

        if (config) {
          return { ...DEFAULT_CONFIG, ...config };
        }
      } catch {
        // Ignore parse errors, use defaults
      }
    }
  }

  return DEFAULT_CONFIG;
}

function readPackageJson(packageJsonPath = path.join(process.cwd(), 'package.json')): PackageJson | undefined {
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  } catch {
    return undefined;
  }
}

function readTextFileIfExists(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  return fs.readFileSync(filePath, 'utf-8');
}

function readRequiredPackageJson(packageJsonPath: string): PackageJson {
  const packageJson = readPackageJson(packageJsonPath);

  if (!packageJson) {
        console.error(`Could not read package.json at ${packageJsonPath}`);
    process.exit(1);
  }

  return packageJson;
}

function resolveReleaseProject(): ResolvedReleaseProject {
  const cwdName = path.basename(process.cwd());
  const packageJson = readPackageJson();
  const packageName = packageJson?.name;
  const solidApiPackageJsonPath = path.join(process.cwd(), 'solid-api', 'package.json');
  const solidApiPackageName = readPackageJson(solidApiPackageJsonPath)?.name;

  switch (cwdName) {
    case 'solidctl':
      if (packageName === '@solidxai/solidctl') {
        console.log(`Release project resolved: solidctl (${packageName})`);
        return { type: 'solidctl', cwdName, packageName, versionSourcePath: path.join(process.cwd(), 'package.json') };
      }
      break;
    case 'solid-core-module':
      if (packageName === '@solidxai/core') {
        console.log(`Release project resolved: solid-core-module (${packageName})`);
        return { type: 'solid-core-module', cwdName, packageName, versionSourcePath: path.join(process.cwd(), 'package.json') };
      }
      break;
    case 'solid-core-ui':
      if (packageName === '@solidxai/core-ui') {
        console.log(`Release project resolved: solid-core-ui (${packageName})`);
        return { type: 'solid-core-ui', cwdName, packageName, versionSourcePath: path.join(process.cwd(), 'package.json') };
      }
      break;
    case 'solid-library-management':
      if (solidApiPackageName === '@library-management/solid-api') {
        console.log(`Release project resolved: solid-library-management (${solidApiPackageName})`);
        return {
          type: 'solid-library-management',
          cwdName,
          packageName: solidApiPackageName,
          versionSourcePath: solidApiPackageJsonPath,
        };
      }

      break;
  }

  console.error(
    `❌ Could not resolve release project from folder "${cwdName}" and package name "${packageName || solidApiPackageName || 'unknown'}".`,
  );
  console.error('   Supported release folders are solidctl, solid-core-module, solid-core-ui, and solid-library-management.');
  process.exit(1);
}

function getCurrentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
}

function getRequiredBranch(preid: string | undefined, mainBranch: string, devBranch: string): string {
  if (preid) {
    return devBranch;
  }

  return mainBranch;
}

function exec(cmd: string, dryRun: boolean): string {
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return '';
  }
  execSync(cmd, { stdio: 'inherit' });
  return '';
}

function execCapture(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatLogTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function parseEnvFile(filePath: string): Record<string, string> {
  const content = readTextFileIfExists(filePath);
  if (!content) {
    return {};
  }

  const env: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function extractPortFromUrl(urlValue: string | undefined): number | undefined {
  if (!urlValue) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(urlValue);
    if (parsedUrl.port) {
      return Number(parsedUrl.port);
    }

    return parsedUrl.protocol === 'https:' ? 443 : 80;
  } catch {
    return undefined;
  }
}

function parsePortValue(rawValue: string | undefined): number | undefined {
  if (!rawValue) {
    return undefined;
  }

  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function inferApiPort(projectRoot: string): number {
  const envPath = path.join(projectRoot, 'solid-api', '.env');
  const env = parseEnvFile(envPath);

  return (
    parsePortValue(env.PORT) ??
    extractPortFromUrl(env.TEST_API_BASE_URL) ??
    extractPortFromUrl(env.BASE_URL) ??
    DEFAULT_RELEASE_VALIDATION_API_PORT
  );
}

function inferUiPort(projectRoot: string): number {
  const packageJsonPath = path.join(projectRoot, 'solid-ui', 'package.json');
  const packageJsonContent = readTextFileIfExists(packageJsonPath);

  if (!packageJsonContent) {
    return DEFAULT_RELEASE_VALIDATION_UI_PORT;
  }

  try {
    const packageJson = JSON.parse(packageJsonContent) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts || {};
    const candidateScripts = [scripts.dev, scripts['solidx:dev']].filter(Boolean) as string[];

    for (const script of candidateScripts) {
      const match = script.match(/(?:^|\s)--port(?:=|\s+)(\d+)/);
      if (match) {
        return Number(match[1]);
      }
    }
  } catch {
    return DEFAULT_RELEASE_VALIDATION_UI_PORT;
  }

  return DEFAULT_RELEASE_VALIDATION_UI_PORT;
}

function resolveReleaseValidationTargets(projectRoot: string): ReleaseValidationTargets {
  const apiPort = inferApiPort(projectRoot);
  const uiPort = inferUiPort(projectRoot);

  return {
    apiPort,
    uiPort,
    apiBaseUrl: `http://localhost:${apiPort}`,
    uiBaseUrl: `http://localhost:${uiPort}`,
  };
}

function getExpectedVersion(project: ResolvedReleaseProject, versionType: string, preid?: string): string | undefined {
  if (!project.versionSourcePath) {
    return undefined;
  }

  const packageJson = readRequiredPackageJson(project.versionSourcePath);
  if (!packageJson.version) {
    console.error(`package.json is missing a version at ${project.versionSourcePath}`);
    process.exit(1);
  }

  return planNextVersion(packageJson.version, versionType, preid);
}

function shouldRunLocalReleaseValidation(project: ResolvedReleaseProject): boolean {
  return LOCAL_RELEASE_TEST_PROJECTS.has(project.type);
}

function validateConsumingProjectRoot(projectRoot: string): void {
  const requiredPaths = ['solid-api/package.json', 'solid-ui/package.json'];

  for (const requiredPath of requiredPaths) {
    const absolutePath = path.join(projectRoot, requiredPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Release test consuming project is missing ${requiredPath}: ${projectRoot}`);
    }
  }
}

async function resolveReleaseTestConsumingProjectPath(): Promise<string> {
  const configuredPath = process.env[RELEASE_TEST_PROJECT_PATH_ENV]?.trim();

  if (configuredPath) {
    const resolvedPath = path.resolve(configuredPath);
    validateConsumingProjectRoot(resolvedPath);
    return resolvedPath;
  }

  const answers = await inquirer.prompt<{ projectPath: string }>([
    {
      type: 'input',
      name: 'projectPath',
      prefix: '',
      message: `Path to the SolidX release test consuming project (${RELEASE_TEST_PROJECT_PATH_ENV}):`,
      validate: (value: string) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
          return 'Project path is required.';
        }

        const resolvedPath = path.resolve(trimmedValue);
        try {
          validateConsumingProjectRoot(resolvedPath);
          return true;
        } catch (error) {
          return error instanceof Error ? error.message : 'Invalid project path.';
        }
      },
    },
  ]);

  return path.resolve(answers.projectPath.trim());
}

function runReleaseValidationCommand(
  command: string,
  dryRun: boolean,
  cwd: string,
  failureMessage: string,
): boolean {
  console.log(`▶ ${command}`);

  if (dryRun) {
    console.log(`[dry-run] (${cwd}) ${command}`);
    return true;
  }

  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
    return true;
  } catch (error) {
    const details =
      error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
    console.error(`${failureMessage} ${details}`);
    return false;
  }
}

function getNpxCommand(): string {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function getReleaseValidationLogPath(cwd: string): string {
  const logsDir = path.join(cwd, 'logs', 'solidctl', 'release-validation');
  fs.mkdirSync(logsDir, { recursive: true });
  return path.join(logsDir, `start-dev-${formatLogTimestamp(new Date())}.log`);
}

function startConsumingProject(cwd: string, dryRun: boolean): RunningConsumingProject {
  const commandText = 'npx @solidxai/solidctl@beta start:dev --plain';

  if (dryRun) {
    console.log(`[dry-run] (${cwd}) ${commandText}`);
    return { child: null, logPath: null, logStream: null };
  }

  const logPath = getReleaseValidationLogPath(cwd);
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  console.log(`Starting consuming project from ${cwd}`);
  console.log(`Consuming project logs: ${logPath}`);

  const child = spawn(getNpxCommand(), ['@solidxai/solidctl@beta', 'start:dev', '--plain'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    detached: process.platform !== 'win32',
    shell: process.platform === 'win32',
  });

  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);

  return { child, logPath, logStream };
}

function waitForChildExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);

    child.once('exit', () => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        resolve(true);
      }
    });
  });
}

async function stopConsumingProject(runningProject: RunningConsumingProject | null): Promise<void> {
  if (!runningProject?.child) {
    return;
  }

  const { child, logStream } = runningProject;

  if (child.exitCode !== null || child.killed) {
    logStream?.end();
    return;
  }

  console.log('Stopping consuming project...');

  if (process.platform !== 'win32' && child.pid) {
    process.kill(-child.pid, 'SIGINT');
  } else {
    child.kill('SIGINT');
  }

  if (await waitForChildExit(child, 10_000)) {
    logStream?.end();
    return;
  }

  if (process.platform !== 'win32' && child.pid) {
    process.kill(-child.pid, 'SIGTERM');
  } else {
    child.kill('SIGTERM');
  }

  if (await waitForChildExit(child, 10_000)) {
    logStream?.end();
    return;
  }

  if (process.platform !== 'win32' && child.pid) {
    process.kill(-child.pid, 'SIGKILL');
  } else {
    child.kill('SIGKILL');
  }

  await waitForChildExit(child, 5_000);
  logStream?.end();
}

function getListeningProcesses(port: number): string[] {
  try {
    const output = execCapture(`lsof -iTCP:${port} -sTCP:LISTEN -n -P`);
    return output ? output.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function ensureReleaseValidationPortsAreFree(targets: ReleaseValidationTargets): void {
  const apiListeners = getListeningProcesses(targets.apiPort);
  const uiListeners = getListeningProcesses(targets.uiPort);
  const occupiedPorts: string[] = [];

  if (apiListeners.length > 1) {
    occupiedPorts.push(`Port ${targets.apiPort} is already in use:\n${apiListeners.join('\n')}`);
  }

  if (uiListeners.length > 1) {
    occupiedPorts.push(`Port ${targets.uiPort} is already in use:\n${uiListeners.join('\n')}`);
  }

  if (occupiedPorts.length) {
    throw new Error(
      `Release validation ports must be free before start:dev launches.\n${occupiedPorts.join('\n\n')}`,
    );
  }
}

async function cleanupActiveReleaseValidationProject(): Promise<void> {
  if (!activeReleaseValidationProject) {
    return;
  }

  if (!activeReleaseValidationCleanup) {
    const runningProject = activeReleaseValidationProject;
    activeReleaseValidationCleanup = stopConsumingProject(runningProject).finally(() => {
      activeReleaseValidationProject = null;
      activeReleaseValidationCleanup = null;
    });
  }

  await activeReleaseValidationCleanup;
}

function registerReleaseValidationSignalHandlers(): () => void {
  const handleSignal = (signal: NodeJS.Signals) => {
    void cleanupActiveReleaseValidationProject()
      .catch((error) => {
        console.error(`Failed to clean up consuming project after ${signal}:`, error instanceof Error ? error.message : error);
      })
      .finally(() => {
        process.exit(signal === 'SIGINT' ? 130 : 143);
      });
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  return () => {
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
  };
}

function isPortOpen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });

    const finalize = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(2_000);
    socket.once('connect', () => finalize(true));
    socket.once('timeout', () => finalize(false));
    socket.once('error', () => finalize(false));
  });
}

async function isLocalPortOpen(port: number): Promise<boolean> {
  const hosts = ['127.0.0.1', '::1', 'localhost'];

  for (const host of hosts) {
    if (await isPortOpen(port, host)) {
      return true;
    }
  }

  return false;
}

async function waitForReleaseValidationServices(
  runningProject: RunningConsumingProject | null,
  targets: ReleaseValidationTargets,
): Promise<void> {
  const startedAt = Date.now();
  console.log(
    `Waiting for consuming project services on ports ${targets.apiPort} and ${targets.uiPort}...`,
  );

  while (Date.now() - startedAt < RELEASE_VALIDATION_READY_TIMEOUT_MS) {
    const child = runningProject?.child;
    if (child && child.exitCode !== null) {
      const logSuffix = runningProject?.logPath ? ` Check logs at ${runningProject.logPath}.` : '';
      throw new Error(`Consuming project start:dev exited early with code ${child.exitCode}.${logSuffix}`);
    }

    const [apiReady, uiReady] = await Promise.all([
      isLocalPortOpen(targets.apiPort),
      isLocalPortOpen(targets.uiPort),
    ]);

    if (apiReady && uiReady) {
      console.log(`Validation services are ready on ports ${targets.apiPort} and ${targets.uiPort}.`);
      console.log(`Waiting ${Math.floor(RELEASE_VALIDATION_POST_READY_DELAY_MS / 1000)}s for services to stabilize...`);
      await sleep(RELEASE_VALIDATION_POST_READY_DELAY_MS);
      return;
    }

    console.log(
      `Still waiting for services... api:${apiReady ? 'up' : 'down'} ui:${uiReady ? 'up' : 'down'}`,
    );

    await sleep(RELEASE_VALIDATION_READY_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for consuming project services on ports ${targets.apiPort} and ${targets.uiPort}.${runningProject?.logPath ? ` Check logs at ${runningProject.logPath}.` : ''}`,
  );
}

async function runReleaseValidationTeardown(cwd: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    runReleaseValidationCommand(
      'npx @solidxai/solidctl@latest test data --teardown',
      true,
      cwd,
      'Warning: release test data teardown failed.',
    );
    return;
  }

  for (let attempt = 1; attempt <= RELEASE_VALIDATION_TEARDOWN_RETRY_COUNT; attempt += 1) {
    const succeeded = runReleaseValidationCommand(
      'npx @solidxai/solidctl@latest test data --teardown',
      false,
      cwd,
      `Warning: release test data teardown failed on attempt ${attempt}.`,
    );

    if (succeeded) {
      return;
    }

    if (attempt < RELEASE_VALIDATION_TEARDOWN_RETRY_COUNT) {
      console.log(
        `Waiting ${Math.floor(RELEASE_VALIDATION_TEARDOWN_RETRY_DELAY_MS / 1000)}s before retrying teardown...`,
      );
      await sleep(RELEASE_VALIDATION_TEARDOWN_RETRY_DELAY_MS);
    }
  }
}

async function runLocalReleaseValidation(project: ResolvedReleaseProject, dryRun: boolean): Promise<void> {
  if (!shouldRunLocalReleaseValidation(project)) {
    return;
  }

  const consumingProjectRoot = await resolveReleaseTestConsumingProjectPath();
  const validationTargets = resolveReleaseValidationTargets(consumingProjectRoot);
  console.log(`Running local release validation from ${consumingProjectRoot}`);
  console.log(`Validation targets: api=${validationTargets.apiBaseUrl} ui=${validationTargets.uiBaseUrl}`);
  const unregisterSignalHandlers = registerReleaseValidationSignalHandlers();

  const commands: Array<{ command: string; failureMessage: string }> = [
    {
      command: 'npx @solidxai/solidctl@latest local-upgrade',
      failureMessage: 'Warning: local-upgrade failed.',
    },
    {
      command: 'npx @solidxai/solidctl@latest build',
      failureMessage: 'Warning: consuming project build failed.',
    },
    {
      command: 'npx @solidxai/solidctl@latest test data --setup',
      failureMessage: 'Warning: release test data setup failed.',
    },
    {
      command: 'npx @solidxai/solidctl@latest seed',
      failureMessage: 'Warning: release seed failed.',
    },
    {
      command: 'npx @solidxai/solidctl@latest test data --load',
      failureMessage: 'Warning: release test data load failed.',
    },
  ];

  const testCommands: Array<{ command: string; failureMessage: string }> = [];

  if (project.type === 'solid-core-module') {
    testCommands.push({
      command: `npx --yes @solidxai/solidctl@beta test run --module library-management --include-tags api-all-flows --api-base-url ${validationTargets.apiBaseUrl} --ui-base-url ${validationTargets.uiBaseUrl} --headless false`,
      failureMessage: 'Warning: solid-core-module local release tests failed. Continuing with release.',
    });
  } else if (project.type === 'solid-core-ui') {
    console.log('Skipping local release UI tests for solid-core-ui for now.');
  }

  let consumingProjectProcess: RunningConsumingProject | null = null;

  try {
    for (const item of commands) {
      runReleaseValidationCommand(item.command, dryRun, consumingProjectRoot, item.failureMessage);
    }

    if (testCommands.length > 0) {
      if (!dryRun) {
        ensureReleaseValidationPortsAreFree(validationTargets);
      }

      consumingProjectProcess = startConsumingProject(consumingProjectRoot, dryRun);
      activeReleaseValidationProject = consumingProjectProcess;

      if (!dryRun) {
        await waitForReleaseValidationServices(consumingProjectProcess, validationTargets);
      }

      for (const item of testCommands) {
        runReleaseValidationCommand(item.command, dryRun, consumingProjectRoot, item.failureMessage);
      }
    }
  } finally {
    await cleanupActiveReleaseValidationProject();

    if (!dryRun && consumingProjectProcess?.child) {
      console.log(`Waiting ${Math.floor(RELEASE_VALIDATION_POST_STOP_DELAY_MS / 1000)}s after shutdown before teardown...`);
      await sleep(RELEASE_VALIDATION_POST_STOP_DELAY_MS);
    }

    await runReleaseValidationTeardown(consumingProjectRoot, dryRun);
    unregisterSignalHandlers();
  }
}

function getReleaseOptions(options: PublishOptions) {
  const config = loadConfig();

  return {
    mainBranch: options.mainBranch || config.mainBranch,
    devBranch: options.devBranch || config.devBranch,
    reverseMerge: options.merge !== false && config.reverseMerge,
    dryRun: options.dryRun || false,
    force: options.force || false,
    preid: options.preid,
    isPrerelease: !!options.preid,
  };
}

function validateReleaseBranch(preid: string | undefined, mainBranch: string, devBranch: string, force: boolean): string {
  const currentBranch = getCurrentBranch();
  const requiredBranch = preid ? getRequiredBranch(preid, mainBranch, devBranch) : mainBranch;

  if (currentBranch !== requiredBranch) {
    if (force) {
      console.log(`Not on ${requiredBranch} branch (on ${currentBranch}), but --force flag set. Continuing...`);
      return currentBranch;
    }

    if (preid === 'alpha') {
      console.error(`Must be on ${devBranch} branch to publish alpha pre-releases. Currently on: ${currentBranch}`);
    } else if (preid) {
      console.error(`Must be on ${devBranch} branch to publish ${preid} pre-releases. Currently on: ${currentBranch}`);
    } else {
      console.error(`Must be on ${mainBranch} branch to publish stable releases. Currently on: ${currentBranch}`);
    }
    console.error('   Use --force to override this check.');
    process.exit(1);
  }

  return currentBranch;
}

function getVersionCommand(versionType: string, preid?: string): string {
  if (preid) {
    if (versionType === 'patch' || versionType === 'prerelease') {
      return `npm version prerelease --preid=${preid}`;
    }
    if (versionType === 'preminor' || versionType === 'minor') {
      return `npm version preminor --preid=${preid}`;
    }
    if (versionType === 'premajor' || versionType === 'major') {
      return `npm version premajor --preid=${preid}`;
    }
    return `npm version prerelease --preid=${preid}`;
  }

  return `npm version ${versionType}`;
}

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prereleaseId?: string;
  prereleaseNumber?: number;
}

function parseVersion(version: string): ParsedVersion {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+)\.(\d+))?$/);

  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prereleaseId: match[4],
    prereleaseNumber: match[5] === undefined ? undefined : Number(match[5]),
  };
}

function formatVersion(parsed: ParsedVersion): string {
  const base = `${parsed.major}.${parsed.minor}.${parsed.patch}`;

  if (parsed.prereleaseId === undefined || parsed.prereleaseNumber === undefined) {
    return base;
  }

  return `${base}-${parsed.prereleaseId}.${parsed.prereleaseNumber}`;
}

function planNextVersion(currentVersion: string, versionType: string, preid?: string): string {
  const parsed = parseVersion(currentVersion);

  if (!preid) {
    if (versionType === 'minor') {
      return formatVersion({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
    }
    if (versionType === 'major') {
      return formatVersion({ major: parsed.major + 1, minor: 0, patch: 0 });
    }
    return formatVersion({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 });
  }

  if (versionType === 'minor' || versionType === 'preminor') {
    return formatVersion({
      major: parsed.major,
      minor: parsed.minor + 1,
      patch: 0,
      prereleaseId: preid,
      prereleaseNumber: 0,
    });
  }

  if (versionType === 'major' || versionType === 'premajor') {
    return formatVersion({
      major: parsed.major + 1,
      minor: 0,
      patch: 0,
      prereleaseId: preid,
      prereleaseNumber: 0,
    });
  }

  if (parsed.prereleaseId) {
    return formatVersion({
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      prereleaseId: preid,
      prereleaseNumber: parsed.prereleaseId === preid ? (parsed.prereleaseNumber ?? 0) + 1 : 0,
    });
  }

  return formatVersion({
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch + 1,
    prereleaseId: preid,
    prereleaseNumber: 0,
  });
}

function getMovingDockerTag(preid?: string): string {
  if (preid) {
    return preid;
  }

  return 'latest';
}

function copyDirectoryForDockerBuild(sourcePath: string, destinationPath: string) {
  fs.cpSync(sourcePath, destinationPath, {
    recursive: true,
    filter: (currentPath) => {
      const baseName = path.basename(currentPath);
      return !['.git', 'node_modules', 'dist', 'coverage', '.DS_Store', 'logs', '.venv', '.pytest_cache'].includes(baseName);
    },
  });
}

function createSolidLibraryManagementDockerfile(): string {
  return `FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /workspace/agent

RUN apt-get update \\
  && apt-get install -y python3 python3-pip python3-venv supervisor \\
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g @angular-devkit/schematics-cli

COPY agent /workspace/agent

RUN python3 -m venv /opt/agent-venv
RUN /bin/sh -lc ". /opt/agent-venv/bin/activate && cd /workspace/agent && pip install --no-cache-dir -e /workspace/agent/vendor/mini-swe-agent && pip install --no-cache-dir -e '.[full]'"
RUN mkdir -p /opt/prebuilt/agent-ui-dist
RUN cd /workspace/agent/agent-ui && npm i --legacy-peer-deps && npm run build -- --outDir /opt/prebuilt/agent-ui-dist --emptyOutDir
`;
}

async function runSharedReleaseFlow(versionType: string, options: PublishOptions, project: ResolvedReleaseProject) {
  const { mainBranch, devBranch, reverseMerge, dryRun, force, preid, isPrerelease } = getReleaseOptions(options);
  const releaseStartedAt = new Date();

  try {
    console.log(`Release started at: ${formatTimestamp(releaseStartedAt)}`);
    const currentBranch = validateReleaseBranch(preid, mainBranch, devBranch, force);
    const plannedVersion = getExpectedVersion(project, versionType, preid);

    if (dryRun) {
      console.log('Dry run mode - no changes will be made\n');
    }

    if (plannedVersion) {
      console.log(`Planned version: ${plannedVersion}`);
    }

    await runLocalReleaseValidation(project, dryRun);

    const versionCmd = getVersionCommand(versionType, preid);
    if (isPrerelease) {
      console.log(`Updating package version (pre-release: ${preid})...`);
    } else {
      console.log(`Updating package version (${versionType})...`);
    }
    exec(versionCmd, dryRun);

    console.log('Pushing to git (with tags)...');
    exec('git push --follow-tags', dryRun);

    console.log('Publishing package...');
    if (isPrerelease) {
      exec(`npm publish --tag ${preid}`, dryRun);
    } else {
      exec('npm publish', dryRun);
    }

    console.log('Published successfully!\n');

    if (!isPrerelease && reverseMerge) {
      console.log(`Merging ${mainBranch} into ${devBranch}...`);
      exec(`git checkout ${devBranch}`, dryRun);
      exec(`git pull origin ${devBranch}`, dryRun);

      try {
        exec(`git merge ${mainBranch} -m "chore: merge ${mainBranch} after publish"`, dryRun);
        exec(`git push origin ${devBranch}`, dryRun);
        console.log(`Successfully merged ${mainBranch} into ${devBranch}\n`);
      } catch {
        console.error('\nMerge conflict detected. Please resolve manually.');
        console.error(`   You are now on the ${devBranch} branch.`);
        process.exit(1);
      }

      exec(`git checkout ${mainBranch}`, dryRun);
      console.log(`Back on ${mainBranch} branch`);
    } else if (!isPrerelease && !reverseMerge) {
      console.log('Skipping reverse merge (--no-merge)');
    } else {
      console.log(`Staying on ${currentBranch} branch`);
    }

    const releaseEndedAt = new Date();
    console.log(`Release finished at: ${formatTimestamp(releaseEndedAt)}`);
    console.log(`Total release duration: ${formatDuration(releaseEndedAt.getTime() - releaseStartedAt.getTime())}`);
    console.log('\nAll done!');
  } catch (error) {
    const releaseEndedAt = new Date();
    console.error(`Release finished at: ${formatTimestamp(releaseEndedAt)}`);
    console.error(`Total release duration: ${formatDuration(releaseEndedAt.getTime() - releaseStartedAt.getTime())}`);
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function runSolidLibraryManagementReleaseFlow(versionType: string, options: PublishOptions, project: ResolvedReleaseProject) {
  const { mainBranch, devBranch, dryRun, force, preid, isPrerelease } = getReleaseOptions(options);
  const solidApiPackageJsonPath = project.versionSourcePath || path.join(process.cwd(), 'solid-api', 'package.json');
  const solidApiPackageJson = readRequiredPackageJson(solidApiPackageJsonPath);
  const currentVersion = solidApiPackageJson.version;
  const agentRepoPath = process.env.SOLIDX_AI_AGENT_PATH;
  const imageRepository = 'solidxaiorg/solid-library-management-sandbox-base-image';

  if (!currentVersion) {
    console.error(`solid-api package.json is missing a version at ${solidApiPackageJsonPath}`);
    process.exit(1);
  }

  if (!agentRepoPath) {
    console.error('SOLIDX_AI_AGENT_PATH is not set. This release flow needs the local agent checkout.');
    process.exit(1);
  }

  if (!fs.existsSync(agentRepoPath)) {
    console.error(`SOLIDX_AI_AGENT_PATH does not exist: ${agentRepoPath}`);
    process.exit(1);
  }

  const currentBranch = validateReleaseBranch(preid, mainBranch, devBranch, force);
  const plannedVersion = planNextVersion(currentVersion, versionType, preid);
  const movingDockerTag = getMovingDockerTag(preid);
  const versionCmd = getVersionCommand(versionType, preid);
  const buildContextRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'solid-library-management-release-'));
  const dockerfilePath = path.join(buildContextRoot, 'Dockerfile');
  const agentCopyPath = path.join(buildContextRoot, 'agent');
  const versionImageTag = `${imageRepository}:${plannedVersion}`;
  const movingImageTag = `${imageRepository}:${movingDockerTag}`;

  try {
    console.log(`Preparing solid-library-management sandbox base image release (${plannedVersion})...`);
    console.log(`Docker image repository: ${imageRepository}`);
    console.log(`Docker base image: node:20-bookworm`);
    console.log(`Docker tags to publish: ${plannedVersion}, ${movingDockerTag}`);
    console.log(`Agent source path: ${agentRepoPath}`);

    if (dryRun) {
      console.log('Dry run mode - no changes will be made\n');
    }

    console.log(`Updating solid-api version (${isPrerelease ? `pre-release: ${preid}` : versionType})...`);
    exec(`cd solid-api && ${versionCmd}`, dryRun);

    if (!dryRun) {
      const actualVersion = readRequiredPackageJson(solidApiPackageJsonPath).version;
      if (!actualVersion) {
        throw new Error('Failed to determine solid-api version after npm version.');
      }
      if (actualVersion !== plannedVersion) {
        throw new Error(`Expected solid-api version ${plannedVersion}, but found ${actualVersion} after npm version.`);
      }
    }

    console.log('Creating Docker build context...');
    if (!dryRun) {
      copyDirectoryForDockerBuild(agentRepoPath, agentCopyPath);
      fs.writeFileSync(dockerfilePath, createSolidLibraryManagementDockerfile(), 'utf-8');
    }

    console.log('Building sandbox base image...');
    exec(`docker build --progress=plain -t ${versionImageTag} -t ${movingImageTag} ${buildContextRoot}`, dryRun);

    console.log('Pushing git commit and tags...');
    exec('git push --follow-tags', dryRun);

    console.log('Publishing Docker image...');
    exec(`docker push ${versionImageTag}`, dryRun);
    exec(`docker push ${movingImageTag}`, dryRun);

    console.log(`Staying on ${currentBranch} branch`);
    console.log('\nDocker image release completed!');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (!dryRun) {
      fs.rmSync(buildContextRoot, { recursive: true, force: true });
    }
  }
}

export function registerReleaseCommand(program: Command) {
  program
    .command('release [version-type]')
    .description('Release package with version bump and git tagging')
    .option('--preid <id>', 'Pre-release identifier (alpha, beta, rc)')
    .option('--dry-run', 'Preview changes without executing')
    .option('--force', 'Override branch checks')
    .option('--no-merge', 'Skip reverse merge to dev after stable release')
    .option('--main-branch <name>', 'Override main branch name')
    .option('--dev-branch <name>', 'Override dev branch name')
    .addHelpText('after', `
Examples:
  Stable releases (from main branch):
    $ solidctl release              # patch: 0.0.12 → 0.0.13
    $ solidctl release minor        # minor: 0.0.12 → 0.1.0
    $ solidctl release major        # major: 0.0.12 → 1.0.0

  Pre-releases:
    $ solidctl release --preid=alpha           # from dev: 0.0.12 → 0.0.13-alpha.0
    $ solidctl release --preid=alpha           # 0.0.13-alpha.0 → 0.0.13-alpha.1
    $ solidctl release minor --preid=alpha     # from dev: 0.0.12 → 0.1.0-alpha.0
    $ solidctl release --preid=beta            # from dev: 0.0.13-alpha.1 → 0.0.13-beta.0
    $ solidctl release --preid=rc              # from dev: 0.0.13-beta.1 → 0.0.13-rc.0

  Options:
    $ solidctl release --dry-run    # Preview without making changes
    $ solidctl release --force      # Override branch checks
    $ solidctl release --no-merge   # Skip main → dev merge after stable release

Local release validation:
  For solid-core-module and solid-core-ui releases, solidctl now runs local validation commands
  from the consuming project pointed to by ${RELEASE_TEST_PROJECT_PATH_ENV}. If that env var is
  missing, the release command will prompt for the consuming project path.

Configuration:
  Add to package.json or solidctl.config.json:
    {
      "solidctl": {
        "publish": {
          "mainBranch": "main",
          "devBranch": "dev",
          "reverseMerge": true
        }
      }
    }
`)
    .action(async (versionType: string = 'patch', options: PublishOptions) => {
      const project = resolveReleaseProject();

      switch (project.type) {
        case 'solidctl':
          await runSharedReleaseFlow(versionType, options, project);
          break;
        case 'solid-core-module':
          await runSharedReleaseFlow(versionType, options, project);
          break;
        case 'solid-core-ui':
          await runSharedReleaseFlow(versionType, options, project);
          break;
        case 'solid-library-management':
          runSolidLibraryManagementReleaseFlow(versionType, options, project);
          break;
      }
    });
}
