import { Command } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
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

interface WrappedApiResponse<T> {
  statusCode: number;
  message: string[];
  error: string;
  data: T;
}

interface AuthenticatedUser {
  email?: string;
  username?: string;
}

interface AuthenticationResponseData {
  user?: AuthenticatedUser;
  accessToken: string;
  refreshToken?: string;
}

interface SandboxRecord {
  id: number;
  slug?: string;
  displayName?: string;
  status?: string;
  failureReason?: string | null;
}

interface SandboxReleaseCredentials {
  releaserName: string;
  releaserEmail: string;
  releaserMobile: string;
  username: string;
  password: string;
}

const DEFAULT_CONFIG: PublishConfig = {
  mainBranch: 'main',
  devBranch: 'dev',
  reverseMerge: true,
};

const SANDBOX_GATED_RELEASE_PROJECTS = new Set<ReleaseProjectType>(['solid-core-module', 'solid-core-ui']);
const SANDBOX_BASE_API_URL = 'https://api.demo.solidxai.com';
const SANDBOX_TEST_REQUEST_COMPANY_NAME = 'Logicloop Ventures Ltd';
const SANDBOX_STATUS_PAGE_BASE_URL = 'https://demo.solidxai.com/admin/core/sandbox-builder/sandbox/form';
const SANDBOX_POLL_INTERVAL_MS = 15_000;
const SANDBOX_POLL_TIMEOUT_MS = 90 * 60 * 1000;
const SANDBOX_PENDING_STATUSES = new Set([
  'PENDING',
  'VERIFYING',
  'PROVISIONING',
  'ACTIVE',
  'TESTING',
  'EXPIRING',
  'DELETING',
]);
const SANDBOX_SUCCESS_STATUSES = new Set(['TEST_PASSED']);
const SANDBOX_FAILURE_STATUSES = new Set([
  'VERIFICATION_FAILED',
  'TEST_FAILED',
  'STOPPED',
  'FAILED',
  'DELETED',
]);

type ReleaseProjectType = 'solidctl' | 'solid-core-module' | 'solid-core-ui' | 'solid-library-management';

interface ResolvedReleaseProject {
  type: ReleaseProjectType;
  cwdName: string;
  packageName?: string;
  versionSourcePath?: string;
}

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
  if (preid === 'alpha') {
    return 'predev';
  }

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRunSandboxReleaseGate(project: ResolvedReleaseProject, preid?: string): boolean {
  if (!SANDBOX_GATED_RELEASE_PROJECTS.has(project.type)) {
    return false;
  }

  return preid === undefined || preid === 'beta';
}

function buildSandboxStatusPageUrl(sandboxId: number): string {
  return `${SANDBOX_STATUS_PAGE_BASE_URL}/${sandboxId}?viewMode=view&activeTab=page-provisioning-logs`;
}

function buildSandboxTestRunsPageUrl(sandboxId: number): string {
  return `${SANDBOX_STATUS_PAGE_BASE_URL}/${sandboxId}?viewMode=view&activeTab=page-test-runs`;
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

function formatSandboxReleaseName(project: ResolvedReleaseProject, plannedVersion?: string): string {
  const label = project.packageName || project.type;
  return plannedVersion ? `Release validation for ${label} ${plannedVersion}` : `Release validation for ${label}`;
}

function extractApiErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  const candidate = payload as {
    error?: string;
    message?: string | string[];
  };

  if (typeof candidate.error === 'string' && candidate.error.trim().length > 0) {
    return candidate.error;
  }

  if (Array.isArray(candidate.message) && candidate.message.length > 0) {
    return candidate.message.join(', ');
  }

  if (typeof candidate.message === 'string' && candidate.message.trim().length > 0) {
    return candidate.message;
  }

  return fallbackMessage;
}

async function requestJson<T>(url: string, init: RequestInit, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, init);
  const rawBody = await response.text();
  const parsedBody = rawBody ? JSON.parse(rawBody) : undefined;

  if (!response.ok) {
    throw new Error(extractApiErrorMessage(parsedBody, fallbackMessage));
  }

  return parsedBody as T;
}

async function promptSandboxReleaseCredentials(): Promise<SandboxReleaseCredentials> {
  const answers = await inquirer.prompt<{
    releaserName: string;
    releaserEmail: string;
    releaserMobile: string;
    username: string;
    password: string;
  }>([
    {
      type: 'input',
      name: 'releaserName',
      prefix: '',
      message: 'Your full name:',
      validate: (value: string) => (value.trim().length > 0 ? true : 'Name is required.'),
    },
    {
      type: 'input',
      name: 'releaserEmail',
      prefix: '',
      message: 'Your email address:',
      validate: (value: string) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
          return 'Email is required.';
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue) ? true : 'Enter a valid email address.';
      },
    },
    {
      type: 'input',
      name: 'releaserMobile',
      prefix: '',
      message: 'Your mobile number:',
      validate: (value: string) => (value.trim().length > 0 ? true : 'Mobile number is required.'),
    },
    {
      type: 'input',
      name: 'username',
      prefix: '',
      message: 'Sandbox microservice username:',
      validate: (value: string) => (value.trim().length > 0 ? true : 'Username is required.'),
    },
    {
      type: 'password',
      name: 'password',
      prefix: '',
      message: 'Sandbox microservice password:',
      mask: '*',
      validate: (value: string) => (value.trim().length > 0 ? true : 'Password is required.'),
    },
  ]);

  return {
    releaserName: answers.releaserName.trim(),
    releaserEmail: answers.releaserEmail.trim(),
    releaserMobile: answers.releaserMobile.trim(),
    username: answers.username.trim(),
    password: answers.password,
  };
}

async function authenticateSandboxReleaseUser(credentials: SandboxReleaseCredentials): Promise<string> {
  const response = await requestJson<WrappedApiResponse<AuthenticationResponseData>>(
    `${SANDBOX_BASE_API_URL}/api/iam/authenticate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    },
    'Failed to authenticate with the sandbox microservice.',
  );

  const accessToken = response.data?.accessToken;
  if (!accessToken) {
    throw new Error('Sandbox microservice authentication did not return an access token.');
  }

  return accessToken;
}

async function launchReleaseValidationSandbox(
  project: ResolvedReleaseProject,
  accessToken: string,
  credentials: SandboxReleaseCredentials,
  plannedVersion?: string,
): Promise<SandboxRecord> {
  const response = await requestJson<WrappedApiResponse<SandboxRecord>>(
    `${SANDBOX_BASE_API_URL}/api/sandbox/test-request`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: credentials.releaserName,
        emailAddress: credentials.releaserEmail,
        companyName: SANDBOX_TEST_REQUEST_COMPANY_NAME,
        mobile: credentials.releaserMobile,
      }),
    },
    'Failed to create the sandbox test request.',
  );

  if (!response.data?.id) {
    throw new Error('Sandbox test request did not return a sandbox id.');
  }

  return response.data;
}

async function fetchSandboxStatus(sandboxId: number): Promise<SandboxRecord> {
  const response = await requestJson<WrappedApiResponse<SandboxRecord>>(
    `${SANDBOX_BASE_API_URL}/api/sandbox/${sandboxId}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
    `Failed to fetch sandbox status for sandbox ${sandboxId}.`,
  );

  return response.data;
}

async function teardownSandbox(sandboxId: number, accessToken: string): Promise<void> {
  await requestJson<WrappedApiResponse<SandboxRecord>>(
    `${SANDBOX_BASE_API_URL}/api/sandbox/${sandboxId}`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    },
    `Failed to initiate teardown for sandbox ${sandboxId}.`,
  );
}

function printSandboxLaunchMessage(sandbox: SandboxRecord): void {
  const sandboxName = sandbox.displayName || sandbox.slug || `sandbox-${sandbox.id}`;
  const sandboxStatus = sandbox.status || 'UNKNOWN';
  const statusPageUrl = buildSandboxStatusPageUrl(sandbox.id);

  console.log(`Test sandbox launched: ${sandboxName}`);
  console.log(`Provisioning logs: ${statusPageUrl}`);
  console.log(
    `The test sandbox has been provisioned and we will wait for the automated test cases to finish before continuing with the release. In the meantime, you can open the sandbox microservice status page above to monitor provisioning progress and review details.`,
  );
  console.log(`Current sandbox status: ${sandboxStatus}`);
}

async function waitForSandboxTerminalStatus(sandboxId: number): Promise<SandboxRecord> {
  const startedAt = Date.now();
  let lastLoggedStatus: string | undefined;

  while (Date.now() - startedAt < SANDBOX_POLL_TIMEOUT_MS) {
    const sandbox = await fetchSandboxStatus(sandboxId);
    const currentStatus = sandbox.status || 'UNKNOWN';

    if (currentStatus !== lastLoggedStatus) {
      console.log(`Sandbox ${sandbox.id} status: ${currentStatus}`);
      lastLoggedStatus = currentStatus;
    }

    if (SANDBOX_SUCCESS_STATUSES.has(currentStatus) || SANDBOX_FAILURE_STATUSES.has(currentStatus)) {
      return sandbox;
    }

    if (!SANDBOX_PENDING_STATUSES.has(currentStatus)) {
      return sandbox;
    }

    await sleep(SANDBOX_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for sandbox ${sandboxId} to reach a terminal status after ${Math.floor(
      SANDBOX_POLL_TIMEOUT_MS / 1000,
    )} seconds.`,
  );
}

async function runSandboxReleaseGate(
  project: ResolvedReleaseProject,
  dryRun: boolean,
  preid: string | undefined,
  plannedVersion?: string,
): Promise<void> {
  if (!shouldRunSandboxReleaseGate(project, preid)) {
    return;
  }

  if (dryRun) {
    console.log('[dry-run] Would prompt for sandbox microservice credentials, launch a validation sandbox, and wait for TEST_PASSED before publishing.');
    return;
  }

  console.log(`${project.type} releases require sandbox validation before publishing.`);

  const credentials = await promptSandboxReleaseCredentials();
  const accessToken = await authenticateSandboxReleaseUser(credentials);
  const sandbox = await launchReleaseValidationSandbox(project, accessToken, credentials, plannedVersion);
  printSandboxLaunchMessage(sandbox);

  const finalSandbox = await waitForSandboxTerminalStatus(sandbox.id);
  const finalStatus = finalSandbox.status || 'UNKNOWN';
  console.log('Teardown initiated...');

  try {
    await teardownSandbox(finalSandbox.id, accessToken);
  } catch (error) {
    console.error(
      `Warning: teardown could not be initiated for sandbox ${finalSandbox.id}.`,
      error instanceof Error ? error.message : error,
    );
  }

  if (SANDBOX_SUCCESS_STATUSES.has(finalStatus)) {
    console.log(`Sandbox validation passed with status ${finalStatus}. Continuing with release...`);
    return;
  }

  const testRunsPageUrl = buildSandboxTestRunsPageUrl(finalSandbox.id);
  const failureReason = finalSandbox.failureReason ? ` Reason: ${finalSandbox.failureReason}` : '';
  throw new Error(
    `Sandbox validation failed with status ${finalStatus}. Cancelling release.${failureReason} Review the failed test runs here: ${testRunsPageUrl}`,
  );
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
      console.error(`Must be on predev branch to publish alpha pre-releases. Currently on: ${currentBranch}`);
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

    await runSandboxReleaseGate(project, dryRun, preid, plannedVersion);

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
    $ solidctl release --preid=alpha           # from predev: 0.0.12 → 0.0.13-alpha.0
    $ solidctl release --preid=alpha           # 0.0.13-alpha.0 → 0.0.13-alpha.1
    $ solidctl release minor --preid=alpha     # from predev: 0.0.12 → 0.1.0-alpha.0
    $ solidctl release --preid=beta            # from dev: 0.0.13-alpha.1 → 0.0.13-beta.0
    $ solidctl release --preid=rc              # from dev: 0.0.13-beta.1 → 0.0.13-rc.0

  Options:
    $ solidctl release --dry-run    # Preview without making changes
    $ solidctl release --force      # Override branch checks
    $ solidctl release --no-merge   # Skip main → dev merge after stable release

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
