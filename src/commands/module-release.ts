import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import {
  exportModulePackage,
  ResolvedSolidModuleConfig,
  SolidModulePublishConfig,
  resolveSolidModuleConfig,
} from '../module-package';
import { generateChangelog, getChangelogEntry } from './release-changelog';

export interface ModuleReleaseOptions {
  preid?: string;
  dryRun?: boolean;
  force?: boolean;
  skipTests?: boolean;
  testsOnly?: boolean;
  mainBranch?: string;
  devBranch?: string;
  enhanceChangelog?: boolean;
  merge?: boolean;
}

interface GitHubRelease {
  url: string;
  assets: Array<{ name: string }>;
}

function capture(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function run(
  command: string,
  args: string[],
  cwd: string,
  dryRun: boolean,
): void {
  if (dryRun) {
    console.log(`[dry-run] ${[command, ...args].join(' ')}`);
    return;
  }
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function readVersion(projectRoot: string): string {
  const packagePath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packagePath)) {
    throw new Error('SolidX module releases require a root package.json.');
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as {
    version?: string;
    private?: boolean;
  };
  if (!packageJson.version || !semver.valid(packageJson.version)) {
    throw new Error(
      'The root package.json must contain a valid SemVer version.',
    );
  }
  if (packageJson.private !== true) {
    throw new Error(
      'The root package.json must set private to true for a SolidX module release.',
    );
  }
  return packageJson.version;
}

export function planSolidModuleVersion(
  currentVersion: string,
  versionType: string,
  preid?: string,
): string {
  if (
    !['patch', 'minor', 'major', 'prerelease', 'preminor', 'premajor'].includes(
      versionType,
    )
  ) {
    throw new Error(`Unsupported release version type: ${versionType}`);
  }

  let releaseType: semver.ReleaseType;
  if (!preid) {
    releaseType = versionType as semver.ReleaseType;
  } else if (versionType === 'minor' || versionType === 'preminor') {
    releaseType = 'preminor';
  } else if (versionType === 'major' || versionType === 'premajor') {
    releaseType = 'premajor';
  } else {
    releaseType = semver.prerelease(currentVersion) ? 'prerelease' : 'prepatch';
  }

  const plannedVersion = preid
    ? semver.inc(currentVersion, releaseType, preid)
    : semver.inc(currentVersion, releaseType);
  if (!plannedVersion) {
    throw new Error(`Could not calculate a version after ${currentVersion}.`);
  }
  return plannedVersion;
}

function getTagCommit(projectRoot: string, tag: string): string | undefined {
  try {
    return (
      capture('git', ['rev-list', '-n', '1', tag], projectRoot) || undefined
    );
  } catch {
    return undefined;
  }
}

function getRemoteTagCommit(
  projectRoot: string,
  tag: string,
): string | undefined {
  try {
    const output = capture(
      'git',
      ['ls-remote', '--tags', 'origin', `refs/tags/${tag}^{}`],
      projectRoot,
    );
    if (output) {
      return output.split(/\s+/)[0];
    }
    const lightweight = capture(
      'git',
      ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`],
      projectRoot,
    );
    return lightweight ? lightweight.split(/\s+/)[0] : undefined;
  } catch {
    return undefined;
  }
}

function readGitHubRelease(
  projectRoot: string,
  tag: string,
): GitHubRelease | undefined {
  try {
    return JSON.parse(
      capture(
        'gh',
        ['release', 'view', tag, '--json', 'url,assets'],
        projectRoot,
      ),
    ) as GitHubRelease;
  } catch {
    return undefined;
  }
}

function ensureCleanTree(projectRoot: string, dryRun: boolean): void {
  const status = capture('git', ['status', '--porcelain'], projectRoot);
  if (status) {
    if (dryRun) {
      console.log(
        '[dry-run] Working tree is not clean; a real release would stop.',
      );
      return;
    }
    throw new Error('The working tree must be clean before releasing.');
  }
}

function validateBranchAndRemote(
  projectRoot: string,
  branch: string,
  force: boolean,
  dryRun: boolean,
  allowAhead: boolean,
): void {
  const currentBranch = capture(
    'git',
    ['branch', '--show-current'],
    projectRoot,
  );
  if (currentBranch !== branch && !force) {
    throw new Error(
      `SolidX module releases must run from ${branch}; current branch is ${currentBranch}.`,
    );
  }

  if (dryRun) {
    console.log(
      `[dry-run] Would fetch origin/${branch} and verify it matches HEAD.`,
    );
    return;
  }

  run('git', ['fetch', 'origin', branch, '--tags'], projectRoot, false);
  const divergence = capture(
    'git',
    ['rev-list', '--left-right', '--count', `HEAD...origin/${branch}`],
    projectRoot,
  )
    .split(/\s+/)
    .map(Number);
  const isInvalidDivergence =
    divergence[1] !== 0 || (!allowAhead && divergence[0] !== 0);
  if (!force && isInvalidDivergence) {
    throw new Error(
      `HEAD and origin/${branch} must be synchronized before releasing.`,
    );
  }
}

function ensureGitHubAccess(projectRoot: string, dryRun: boolean): void {
  if (dryRun) {
    console.log('[dry-run] Would verify GitHub CLI authentication.');
    return;
  }
  run('gh', ['auth', 'status'], projectRoot, false);
}

function runValidationCommands(
  projectRoot: string,
  commands: string[],
  dryRun: boolean,
): void {
  for (const command of commands) {
    if (dryRun) {
      console.log(`[dry-run] ${command}`);
    } else {
      execSync(command, { cwd: projectRoot, stdio: 'inherit' });
    }
  }
}

function ensureModuleSourcesAreCommitted(
  projectRoot: string,
  config: ResolvedSolidModuleConfig,
): void {
  const sourcePaths = [config.apiModulePath, config.uiModulePath].map(
    (sourcePath) => path.relative(projectRoot, sourcePath),
  );
  const untracked = capture(
    'git',
    ['ls-files', '--others', '--exclude-standard', '--', ...sourcePaths],
    projectRoot,
  );
  const ignored = capture(
    'git',
    [
      'ls-files',
      '--others',
      '--ignored',
      '--exclude-standard',
      '--',
      ...sourcePaths,
    ],
    projectRoot,
  );

  if (untracked || ignored) {
    const paths = [untracked, ignored].filter(Boolean).join('\n');
    throw new Error(
      `Module source trees contain untracked or ignored files that would not be part of the release commit:\n${paths}`,
    );
  }
}

function ensureOutputDirectoryIsIgnored(
  projectRoot: string,
  config: ResolvedSolidModuleConfig,
): void {
  const relativeOutputDir = path
    .relative(projectRoot, config.outputDir)
    .split(path.sep)
    .join('/');
  const ignoredProbe = `${relativeOutputDir}/.solidctl-release-output`;

  try {
    capture('git', ['check-ignore', '--no-index', ignoredProbe], projectRoot);
  } catch {
    throw new Error(
      `Module release output directory must be gitignored: ${relativeOutputDir}`,
    );
  }
}

function updatePackageVersion(projectRoot: string, version: string): void {
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(
    fs.readFileSync(packagePath, 'utf-8'),
  ) as Record<string, unknown>;
  packageJson.version = version;
  fs.writeFileSync(
    packagePath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    'utf-8',
  );
}

function writeChecksumFile(filePath: string, sha256: string): string {
  const checksumPath = `${filePath}.sha256`;
  fs.writeFileSync(
    checksumPath,
    `${sha256}  ${path.basename(filePath)}\n`,
    'utf-8',
  );
  return checksumPath;
}

function publishGitHubRelease(
  projectRoot: string,
  tag: string,
  version: string,
  artifactPath: string,
  checksumPath: string,
  prerelease: boolean,
): string {
  const existing = readGitHubRelease(projectRoot, tag);

  if (!existing) {
    const args = [
      'release',
      'create',
      tag,
      artifactPath,
      checksumPath,
      '--title',
      tag,
      '--notes',
      getChangelogEntry(projectRoot, version),
    ];
    if (prerelease) {
      args.push('--prerelease');
    }
    run('gh', args, projectRoot, false);
  } else {
    run(
      'gh',
      ['release', 'upload', tag, artifactPath, checksumPath, '--clobber'],
      projectRoot,
      false,
    );
  }

  return readGitHubRelease(projectRoot, tag)?.url || '';
}

function pushReleaseRefs(
  projectRoot: string,
  branch: string,
  tag: string,
): void {
  run(
    'git',
    [
      'push',
      '--atomic',
      'origin',
      `HEAD:refs/heads/${branch}`,
      `refs/tags/${tag}:refs/tags/${tag}`,
    ],
    projectRoot,
    false,
  );

  const head = capture('git', ['rev-parse', 'HEAD'], projectRoot);
  const remoteBranch = capture(
    'git',
    ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`],
    projectRoot,
  ).split(/\s+/)[0];
  if (remoteBranch !== head || getRemoteTagCommit(projectRoot, tag) !== head) {
    throw new Error(
      'Remote release branch and tag were not updated to the release commit.',
    );
  }
}

function isResumeRelease(projectRoot: string, currentVersion: string): boolean {
  const tag = `v${currentVersion}`;
  const head = capture('git', ['rev-parse', 'HEAD'], projectRoot);
  const localTagCommit = getTagCommit(projectRoot, tag);
  const remoteTagCommit = getRemoteTagCommit(projectRoot, tag);
  if (remoteTagCommit && remoteTagCommit !== head) {
    throw new Error(
      `Remote tag ${tag} does not point to the local release commit.`,
    );
  }
  return localTagCommit === head || remoteTagCommit === head;
}

async function generateReleaseAssets(
  projectRoot: string,
  config: ResolvedSolidModuleConfig,
  version: string,
): Promise<{ artifactPath: string; checksumPath: string }> {
  const tag = `v${version}`;
  const head = capture('git', ['rev-parse', 'HEAD'], projectRoot);
  const sourceRef =
    getTagCommit(projectRoot, tag) === head ? `${tag}^` : 'HEAD';
  const result = await exportModulePackage({
    projectRoot,
    config,
    version,
    exportedAt: capture(
      'git',
      ['show', '-s', '--format=%cI', sourceRef],
      projectRoot,
    ),
  });
  const checksumPath = writeChecksumFile(result.filePath, result.sha256);
  console.log(`Validated module package: ${result.filePath}`);
  return { artifactPath: result.filePath, checksumPath };
}

export async function runSolidModuleRelease(
  versionType: string,
  options: ModuleReleaseOptions,
  publishConfig: SolidModulePublishConfig,
): Promise<void> {
  const projectRoot = process.cwd();
  const config = resolveSolidModuleConfig(projectRoot, publishConfig);
  const mainBranch = options.mainBranch || config.mainBranch || 'main';
  const devBranch = options.devBranch || config.devBranch || mainBranch;
  const dryRun = options.dryRun || false;
  const force = options.force || false;
  const reverseMerge = options.merge !== false && (config.reverseMerge ?? true);

  if (options.skipTests && options.testsOnly) {
    throw new Error('Cannot use --skip-tests and --tests-only together.');
  }

  const currentVersion = readVersion(projectRoot);
  const currentTag = `v${currentVersion}`;
  const head = capture('git', ['rev-parse', 'HEAD'], projectRoot);
  const remoteCurrentTag = dryRun
    ? undefined
    : getRemoteTagCommit(projectRoot, currentTag);
  const resumeCandidate =
    !dryRun &&
    (getTagCommit(projectRoot, currentTag) === head ||
      remoteCurrentTag === head);
  const resume =
    resumeCandidate && isResumeRelease(projectRoot, currentVersion);
  const version = resume
    ? currentVersion
    : planSolidModuleVersion(currentVersion, versionType, options.preid);
  const isPrerelease = semver.prerelease(version) !== null;
  const releaseBranch = isPrerelease ? devBranch : mainBranch;
  const tag = `v${version}`;

  ensureCleanTree(projectRoot, dryRun);
  validateBranchAndRemote(
    projectRoot,
    releaseBranch,
    force,
    dryRun,
    resumeCandidate,
  );
  ensureGitHubAccess(projectRoot, dryRun);

  if (!resume) {
    if (
      getTagCommit(projectRoot, tag) ||
      getRemoteTagCommit(projectRoot, tag)
    ) {
      throw new Error(`Tag ${tag} already exists.`);
    }
    if (readGitHubRelease(projectRoot, tag)) {
      throw new Error(`GitHub Release ${tag} already exists.`);
    }
  }

  console.log(
    `${resume ? 'Resuming' : 'Preparing'} ${config.moduleName} ${version}.`,
  );

  if (!options.skipTests) {
    runValidationCommands(projectRoot, config.validationCommands, dryRun);
  }
  if (options.testsOnly) {
    console.log('Release validation completed successfully.');
    return;
  }
  if (dryRun) {
    console.log(
      `[dry-run] Would export and validate ${config.artifactName}-v${version}.sldx.`,
    );
    console.log(
      `[dry-run] Would commit, tag ${tag}, push, and publish the GitHub Release.`,
    );
    return;
  }

  ensureCleanTree(projectRoot, false);
  ensureModuleSourcesAreCommitted(projectRoot, config);
  ensureOutputDirectoryIsIgnored(projectRoot, config);
  const assets = await generateReleaseAssets(projectRoot, config, version);

  if (!resume) {
    generateChangelog(version, options.enhanceChangelog || false, false);
    updatePackageVersion(projectRoot, version);
    run('git', ['add', 'package.json', 'CHANGELOG.md'], projectRoot, false);
    run(
      'git',
      ['commit', '-m', `chore: release ${version}`],
      projectRoot,
      false,
    );
    run('git', ['tag', '-a', tag, '-m', tag], projectRoot, false);
  }
  pushReleaseRefs(projectRoot, releaseBranch, tag);

  const url = publishGitHubRelease(
    projectRoot,
    tag,
    version,
    assets.artifactPath,
    assets.checksumPath,
    isPrerelease,
  );

  if (!isPrerelease && reverseMerge && devBranch !== mainBranch) {
    run('git', ['checkout', devBranch], projectRoot, false);
    run('git', ['pull', '--ff-only', 'origin', devBranch], projectRoot, false);
    run(
      'git',
      ['merge', mainBranch, '-m', `chore: merge ${mainBranch} after release`],
      projectRoot,
      false,
    );
    run('git', ['push', 'origin', devBranch], projectRoot, false);
    run('git', ['checkout', mainBranch], projectRoot, false);
  }

  console.log(`Published ${tag}${url ? `: ${url}` : ''}`);
}
