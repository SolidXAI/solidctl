import { execSync } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import { extractEntry, writeChangelog } from './release-changelog';

/**
 * Helpers for the `solidctl release` command (see release.command.ts). Two groups:
 * version arithmetic used by every release, and the `--from <ref>` flow for cutting
 * a stable release from a ref other than HEAD. Registers no commands of its own.
 */

// ---------------------------------------------------------------------------
// Version arithmetic
// ---------------------------------------------------------------------------

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prereleaseId?: string;
  prereleaseNumber?: number;
}

export function parseVersion(version: string): ParsedVersion {
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

export function formatVersion(parsed: ParsedVersion): string {
  const base = `${parsed.major}.${parsed.minor}.${parsed.patch}`;

  if (parsed.prereleaseId === undefined || parsed.prereleaseNumber === undefined) {
    return base;
  }

  return `${base}-${parsed.prereleaseId}.${parsed.prereleaseNumber}`;
}

export function planNextVersion(currentVersion: string, versionType: string, preid?: string): string {
  const parsed = parseVersion(currentVersion);

  if (!preid) {
    if (versionType === 'minor') {
      return formatVersion({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
    }
    if (versionType === 'major') {
      return formatVersion({ major: parsed.major + 1, minor: 0, patch: 0 });
    }
    // patch on a prerelease promotes to stable without incrementing (matches npm version behaviour)
    if (parsed.prereleaseId) {
      return formatVersion({ major: parsed.major, minor: parsed.minor, patch: parsed.patch });
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

/** Semver ordering: a stable sorts above its own pre-releases. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);

  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  if (left.patch !== right.patch) return left.patch - right.patch;

  const leftPre = left.prereleaseId !== undefined;
  const rightPre = right.prereleaseId !== undefined;

  if (!leftPre && !rightPre) return 0;
  if (!leftPre) return 1;
  if (!rightPre) return -1;
  if (left.prereleaseId !== right.prereleaseId) {
    return left.prereleaseId! < right.prereleaseId! ? -1 : 1;
  }

  return (left.prereleaseNumber ?? 0) - (right.prereleaseNumber ?? 0);
}

/**
 * Published pre-releases that the new stable leaves behind: same major.minor.patch,
 * but newer than the ref being released. They sort below the stable while containing
 * more code, so their line cannot be continued and upgrading to the stable would
 * silently drop work. Empty whenever the release comes from the tip of dev.
 */
export function selectStrandedPrereleases(
  publishedVersions: string[],
  stableVersion: string,
  fromVersion: string,
): string[] {
  const stable = parseVersion(stableVersion);

  return publishedVersions.filter((published) => {
    let parsed: ParsedVersion;

    try {
      parsed = parseVersion(published);
    } catch {
      return false;
    }

    if (parsed.prereleaseId === undefined) return false;
    if (parsed.major !== stable.major || parsed.minor !== stable.minor || parsed.patch !== stable.patch) return false;

    return compareVersions(published, fromVersion) > 0;
  });
}

// ---------------------------------------------------------------------------
// `--from <ref>` release flow
// ---------------------------------------------------------------------------

interface PackageJsonVersion {
  version?: string;
}

/** The only files a release commit legitimately touches. */
const MERGE_RESOLVABLE_PATHS = new Set([
  'package.json',
  'package-lock.json',
  'CHANGELOG.md',
]);

const MANIFEST_EXCLUDES = ['package.json', 'package-lock.json', 'CHANGELOG.md']
  .map((file) => `":(exclude)${file}"`)
  .join(' ');

function capture(cmd: string): string | undefined {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return undefined;
  }
}

function succeeds(cmd: string): boolean {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function run(cmd: string): void {
  execSync(cmd, { stdio: 'inherit' });
}

/** Prefer the remote-tracking branch so a stale local dev cannot skew the checks. */
function preferRemote(devBranch: string): string {
  return succeeds(`git rev-parse --verify --quiet origin/${devBranch}`)
    ? `origin/${devBranch}`
    : devBranch;
}

export async function confirm(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.log(`${message} — no TTY, continuing.`);
    return true;
  }

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    { type: 'confirm', name: 'confirmed', message, default: true },
  ]);

  return confirmed;
}

export async function confirmOrExit(message: string): Promise<void> {
  if (!(await confirm(message))) {
    console.log('Aborted.');
    process.exit(1);
  }
}

/**
 * Resolves the ref the release branch should be cut from. `--from-dev` is sugar for
 * `--from <devBranch>` so the branch name stays configurable via --dev-branch rather
 * than hardcoded.
 */
export function resolveFromRef(
  from: string | undefined,
  fromDev: boolean | undefined,
  preid: string | undefined,
  devBranch: string,
): string | undefined {
  if (from && fromDev) {
    console.error('Use either --from <ref> or --from-dev, not both.');
    process.exit(1);
  }

  // Pre-releases publish the tip of dev by definition: they have no release branch,
  // no PR and no merge to main, so there is nothing for --from to act on.
  if ((from || fromDev) && preid) {
    const flag = from ? '--from' : '--from-dev';
    console.error(`${flag} cannot be combined with --preid. Pre-releases always publish the tip of the dev branch.`);
    process.exit(1);
  }

  return fromDev ? devBranch : from;
}

function repoRelativePath(absolutePath: string): string {
  const repoRoot = capture('git rev-parse --show-toplevel') ?? process.cwd();
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

/**
 * Reads a package.json as it exists at `ref` rather than on disk. Keeps the planned
 * version correct when the release branch is cut from somewhere other than HEAD, and
 * stays correct under --dry-run where the checkout never happens.
 */
export function readVersionAtRef(ref: string, packageJsonPath: string): string | undefined {
  const raw = capture(`git show ${ref}:${repoRelativePath(packageJsonPath)}`);

  if (!raw) {
    return undefined;
  }

  try {
    return (JSON.parse(raw) as PackageJsonVersion).version;
  } catch {
    return undefined;
  }
}

export function assertCleanWorkingTree(): void {
  const status = capture('git status --porcelain');

  if (status) {
    console.error('Working tree is not clean. Commit, stash or ignore these before releasing:');
    console.error(`\n${status}\n`);
    console.error('   npm publish packs the working directory, so untracked files can end up');
    console.error('   in the published tarball, and npm version would commit modified ones.');
    process.exit(1);
  }
}

export function resolveToSha(fromRef: string): string {
  // Pin the ref once. dev is shared, so re-resolving it at each step could validate
  // one tree and publish another.
  const sha = capture(`git rev-parse --verify ${fromRef}^{commit}`);

  if (!sha) {
    console.error(`Could not resolve ${fromRef} to a commit.`);
    process.exit(1);
  }

  return sha;
}

export function assertRefIsReleasable(fromRef: string, fromSha: string, devBranch: string): void {
  const devRef = preferRemote(devBranch);

  if (!succeeds(`git merge-base --is-ancestor ${fromSha} ${devRef}`)) {
    console.error(`${fromRef} is not an ancestor of ${devRef}.`);
    console.error('   Only refs that are part of the mainline can be released.');
    process.exit(1);
  }
}

/**
 * The whole risk of releasing from an older ref is silently dropping work, so the
 * excluded commits are listed before anything happens.
 */
export function printExcludedCommits(fromRef: string, fromSha: string, devBranch: string): number {
  const devRef = preferRemote(devBranch);
  const log = capture(`git log --oneline ${fromSha}..${devRef}`) ?? '';
  const commits = log ? log.split('\n') : [];

  if (commits.length === 0) {
    console.log(`${fromRef} is at the tip of ${devRef} — nothing is being left behind.\n`);
    return 0;
  }

  console.log(`\nReleasing from ${fromRef}, which EXCLUDES ${commits.length} commit(s) on ${devRef}:`);
  for (const commit of commits) {
    console.log(`   ${commit}`);
  }
  console.log('');

  return commits.length;
}

/**
 * Asserts the release branch contains exactly the source of `fromSha`. Runs before
 * npm publish because a published version can never be replaced.
 */
export function assertReleaseTreeMatchesRef(fromRef: string, fromSha: string, dryRun: boolean): void {
  if (dryRun) {
    console.log(`[dry-run] would verify the release tree is identical to ${fromRef} (excluding manifests and CHANGELOG.md)`);
    return;
  }

  if (!succeeds(`git diff --quiet ${fromSha} HEAD -- . ${MANIFEST_EXCLUDES}`)) {
    console.error(`Release branch does not match ${fromRef}.`);
    console.error('   Unexpected changes outside package.json, package-lock.json and CHANGELOG.md:');
    console.error(capture(`git diff --name-only ${fromSha} HEAD -- . ${MANIFEST_EXCLUDES}`) ?? '');
    console.error('\n   Nothing has been published. Aborting.');
    process.exit(1);
  }

  console.log(`Verified: release tree is identical to ${fromRef}`);
}

/**
 * Splits `git diff --diff-filter=U` output into the files this tool knows how to
 * resolve and everything else. Anything unexpected means an assumption broke, so the
 * caller hands back to manual resolution rather than guessing.
 */
export function classifyMergeConflicts(diffOutput: string): {
  conflicted: string[];
  unexpected: string[];
} {
  const conflicted = diffOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    conflicted,
    unexpected: conflicted.filter((file) => !MERGE_RESOLVABLE_PATHS.has(file)),
  };
}

function setLockfileVersion(lockfilePath: string, version: string): void {
  const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf-8'));
  lockfile.version = version;

  if (lockfile.packages?.['']) {
    lockfile.packages[''].version = version;
  }

  fs.writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`, 'utf-8');
}

/**
 * Resolves the reverse-merge conflict that a --from <older-ref> release always
 * produces. The manifests take main's side so the branch lands on the stable version
 * (which is what makes the follow-up --preid=beta bump the patch instead of
 * continuing the abandoned pre-release line), while the lockfile keeps dev's
 * dependency tree. Returns false when anything unexpected conflicted, leaving the
 * caller to fall back to manual resolution.
 */
export function resolveReverseMergeConflict(
  mainBranch: string,
  stableVersion: string,
  dryRun: boolean,
): boolean {
  if (dryRun) {
    console.log('[dry-run] would resolve the reverse-merge conflict automatically');
    return true;
  }

  const { conflicted, unexpected } = classifyMergeConflicts(
    capture('git diff --name-only --diff-filter=U') ?? '',
  );

  if (conflicted.length === 0) {
    return false;
  }

  if (unexpected.length > 0) {
    console.error(`Cannot resolve automatically — unexpected conflicts in: ${unexpected.join(', ')}`);
    return false;
  }

  console.log(`Resolving reverse-merge conflict in: ${conflicted.join(', ')}`);

  if (conflicted.includes('package.json')) {
    run('git checkout --theirs package.json');
    const merged = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
    ) as PackageJsonVersion;

    if (merged.version !== stableVersion) {
      console.error(`Expected package.json to resolve to ${stableVersion}, got ${merged.version ?? 'nothing'}.`);
      return false;
    }
  }

  if (conflicted.includes('package-lock.json')) {
    // Keep dev's dependency tree; only the version fields need to follow package.json.
    run('git checkout --ours package-lock.json');
    setLockfileVersion(path.join(process.cwd(), 'package-lock.json'), stableVersion);
  }

  if (conflicted.includes('CHANGELOG.md')) {
    // Keep dev's entries and re-insert the stable entry above them. writeChangelog
    // inserts before the first "## [", which is the correct semver position.
    run('git checkout --ours CHANGELOG.md');

    const mainChangelog = capture(`git show ${mainBranch}:CHANGELOG.md`);
    const stableEntry = mainChangelog ? extractEntry(mainChangelog, stableVersion) : undefined;

    if (!stableEntry) {
      console.error(`Could not find the ${stableVersion} entry in ${mainBranch}:CHANGELOG.md`);
      return false;
    }

    writeChangelog(stableEntry, path.join(process.cwd(), 'CHANGELOG.md'));
  }

  run(`git add ${conflicted.join(' ')}`);
  run(`git commit -m "chore: merge ${mainBranch} after publish"`);

  console.log('Reverse-merge conflict resolved.');
  return true;
}

function getPublishedVersions(packageName: string): string[] {
  const raw = capture(`npm view ${packageName} versions --json`);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

export interface FinishStrandedReleaseArgs {
  packageName: string;
  stableVersion: string;
  fromVersion: string;
  devBranch: string;
  dryRun: boolean;
  /**
   * Cuts and publishes the next pre-release from dev. Injected so this module does
   * not need to import the release flow that calls it.
   */
  rollDevForward: (nextBeta: string) => Promise<void>;
}

/**
 * A release cut from an older ref strands every pre-release published after that
 * ref: they sort below the new stable while containing more code, so their line
 * cannot be continued and anyone upgrading to the stable silently loses that work.
 * Finishing the release means moving dev onto a fresh pre-release line and marking
 * the stranded versions. Triggered by detecting stranded versions rather than by a
 * flag, so releasing from the tip of dev — where nothing is stranded — is untouched.
 */
export async function finishStrandedRelease(args: FinishStrandedReleaseArgs): Promise<void> {
  const { packageName, stableVersion, fromVersion, devBranch, dryRun, rollDevForward } = args;

  const stranded = selectStrandedPrereleases(
    getPublishedVersions(packageName),
    stableVersion,
    fromVersion,
  );

  if (stranded.length === 0) {
    return;
  }

  const nextBeta = planNextVersion(stableVersion, 'patch', 'beta');

  console.log(`\nReleasing ${stableVersion} stranded ${stranded.length} published pre-release(s):`);
  for (const version of stranded) {
    console.log(`   ${packageName}@${version}`);
  }
  console.log(`   Their work is ahead of ${stableVersion} but sorts below it, so ${devBranch} moves to ${nextBeta}.\n`);

  const message = `Not included in ${stableVersion}; this work ships in ${nextBeta}`;

  if (dryRun) {
    console.log(`[dry-run] would cut ${nextBeta} from ${devBranch} and publish it under the beta tag`);
    for (const version of stranded) {
      console.log(`[dry-run] npm deprecate ${packageName}@${version} "${message}"`);
    }
    return;
  }

  console.log(`Rolling ${devBranch} forward to ${nextBeta}...`);
  await rollDevForward(nextBeta);

  // Declining skips deprecation rather than aborting: the stable is already
  // published by this point, so failing here would leave a worse state than
  // simply not deprecating.
  if (!(await confirm(`Deprecate ${stranded.length} stranded pre-release(s) on npm?`))) {
    console.log('Skipped. Deprecate them later with:');
    for (const version of stranded) {
      console.log(`   npm deprecate ${packageName}@${version} "${message}"`);
    }
    return;
  }

  for (const version of stranded) {
    run(`npm deprecate ${packageName}@${version} "${message}"`);
  }

  console.log('Stranded pre-releases deprecated.\n');
}
