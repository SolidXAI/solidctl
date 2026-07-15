import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SECTION_ORDER = [
  'Breaking Changes',
  'Added',
  'Fixed',
  'Performance',
  'Changed',
  'Documentation',
  'Maintenance',
  'Other',
] as const;

type Section = (typeof SECTION_ORDER)[number];

const TYPE_TO_SECTION: Array<{ pattern: RegExp; section: Section }> = [
  { pattern: /^(\w+)!:|BREAKING CHANGE/i, section: 'Breaking Changes' },
  { pattern: /^feat(\(.+\))?:/, section: 'Added' },
  { pattern: /^fix(\(.+\))?:/, section: 'Fixed' },
  { pattern: /^perf(\(.+\))?:/, section: 'Performance' },
  { pattern: /^refactor(\(.+\))?:/, section: 'Changed' },
  { pattern: /^docs(\(.+\))?:/, section: 'Documentation' },
  { pattern: /^(chore|build|ci)(\(.+\))?:/, section: 'Maintenance' },
];

const NOISE_PATTERNS = [
  /^\d+\.\d+\.\d+/,                          // bare version bump commits
  /^(chore|docs): (merge|update changelog)/,  // reverse-merge and changelog commits
];

function capture(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run(cmd: string, dryRun: boolean): void {
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return;
  }
  execSync(cmd, { stdio: 'inherit' });
}

function getPreviousStableTag(): string | undefined {
  try {
    const tag = capture("git tag --sort=-version:refname | grep -v -- '-' | head -1");
    return tag || undefined;
  } catch {
    return undefined;
  }
}

function getCommitsSinceTag(tag?: string): string[] {
  try {
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const raw = capture(`git log ${range} --format="%s" --no-merges`);
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !NOISE_PATTERNS.some((p) => p.test(l)));
  } catch {
    return [];
  }
}

function classifyCommit(commit: string): Section {
  for (const { pattern, section } of TYPE_TO_SECTION) {
    if (pattern.test(commit)) return section;
  }
  return 'Other';
}

function stripConventionalPrefix(commit: string): string {
  return commit.replace(/^\w+(\(.+\))?!?:\s*/, '');
}

function groupCommits(commits: string[]): Map<Section, string[]> {
  const groups = new Map<Section, string[]>();
  for (const commit of commits) {
    const section = classifyCommit(commit);
    const body = stripConventionalPrefix(commit);
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push(body);
  }
  return groups;
}

function buildEntry(version: string, date: string, groups: Map<Section, string[]>): string {
  const lines: string[] = [`## [${version}] - ${date}`, ''];

  for (const section of SECTION_ORDER) {
    const items = groups.get(section);
    if (!items || items.length === 0) continue;
    lines.push(`### ${section}`, '');
    for (const item of items) lines.push(`- ${item}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function enhanceWithAi(draft: string, version: string): string {
  const prompt = [
    'You are a technical writer. Expand this changelog entry into clear, useful descriptions.',
    `Version: ${version}`,
    'Keep the exact same markdown structure and section headings.',
    'Return only the markdown, no code fences.',
    '',
    draft,
  ].join('\n');

  const aiCmd = process.env.SOLIDCTL_AI_CMD;
  if (!aiCmd) {
    console.warn('SOLIDCTL_AI_CMD is not set — skipping AI enhancement. Set it to your AI CLI command (e.g. SOLIDCTL_AI_CMD=claude).');
    return draft;
  }
  const result = spawnSync(aiCmd, ['-p', prompt], { encoding: 'utf-8', timeout: 120_000 });

  if (result.status !== 0 || !result.stdout?.trim()) {
    console.warn('AI enhancement failed — using generated changelog as-is.');
    return draft;
  }

  return result.stdout.trim();
}

function writeChangelog(entry: string, changelogPath: string): void {
  if (!fs.existsSync(changelogPath)) {
    fs.writeFileSync(changelogPath, `# Changelog\n\n${entry}\n`, 'utf-8');
    return;
  }

  const existing = fs.readFileSync(changelogPath, 'utf-8');
  const insertAt = existing.indexOf('\n## [');

  if (insertAt === -1) {
    fs.writeFileSync(changelogPath, existing.trimEnd() + '\n\n' + entry + '\n', 'utf-8');
  } else {
    const before = existing.slice(0, insertAt + 1);
    const after = existing.slice(insertAt + 1);
    fs.writeFileSync(changelogPath, before + entry + '\n\n' + after, 'utf-8');
  }
}

export function generateChangelog(
  plannedVersion: string,
  enhanceChangelog: boolean,
  dryRun: boolean,
): void {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const today = new Date().toISOString().slice(0, 10);

  const prevTag = getPreviousStableTag();
  const commits = getCommitsSinceTag(prevTag);
  console.log(`Generating changelog (${commits.length} commits since ${prevTag ?? 'beginning'})...`);

  const groups = groupCommits(commits);
  let entry = buildEntry(plannedVersion, today, groups);

  if (enhanceChangelog) {
    console.log('Enhancing changelog with AI...');
    entry = enhanceWithAi(entry, plannedVersion);
  }

  if (dryRun) {
    console.log(`[dry-run] Would write changelog entry to ${path.basename(changelogPath)}`);
  } else {
    writeChangelog(entry, changelogPath);
  }
}

export async function generateAndCommitChangelog(
  plannedVersion: string,
  enhanceChangelog: boolean,
  dryRun: boolean,
): Promise<void> {
  generateChangelog(plannedVersion, enhanceChangelog, dryRun);
  run('git add CHANGELOG.md', dryRun);
  run(`git commit -m "docs: update changelog for ${plannedVersion}"`, dryRun);
}

export function getChangelogEntry(projectRoot: string, version: string): string {
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    throw new Error(`CHANGELOG.md does not exist at ${projectRoot}`);
  }

  const changelog = fs.readFileSync(changelogPath, 'utf-8');
  const heading = `## [${version}]`;
  const start = changelog.indexOf(heading);
  if (start === -1) {
    throw new Error(`CHANGELOG.md does not contain an entry for ${version}.`);
  }

  const nextEntry = changelog.indexOf('\n## [', start + heading.length);
  return changelog.slice(start, nextEntry === -1 ? undefined : nextEntry).trim();
}