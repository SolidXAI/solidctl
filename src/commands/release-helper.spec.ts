import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  classifyMergeConflicts,
  compareVersions,
  selectStrandedPrereleases,
} from './release-helper';
import { extractEntry, writeChangelog } from './release-changelog';

describe('compareVersions', () => {
  it.each([
    ['0.1.13-beta.21', '0.1.13-beta.22', -1],
    ['0.1.13-beta.22', '0.1.13', -1],
    ['0.1.13', '0.1.14-beta.0', -1],
    ['0.1.13', '0.1.13', 0],
    ['0.1.14-beta.10', '0.1.14-beta.9', 1],
    ['0.2.0', '0.1.99', 1],
  ])('orders %s before/after %s', (a, b, expected) => {
    expect(Math.sign(compareVersions(a, b))).toBe(expected);
  });

  it('sorts pre-release numbers numerically, not lexically', () => {
    const sorted = ['0.1.14-beta.9', '0.1.14-beta.10', '0.1.14-beta.2'].sort(
      compareVersions,
    );
    expect(sorted).toEqual([
      '0.1.14-beta.2',
      '0.1.14-beta.9',
      '0.1.14-beta.10',
    ]);
  });
});

describe('selectStrandedPrereleases', () => {
  // The core case: 0.1.13 cut from beta.21 leaves beta.22 above it in content but
  // below it in version, so beta.22 is stranded.
  it('finds pre-releases published after the released ref', () => {
    const published = [
      '0.1.12',
      '0.1.13-beta.20',
      '0.1.13-beta.21',
      '0.1.13-beta.22',
    ];

    expect(
      selectStrandedPrereleases(published, '0.1.13', '0.1.13-beta.21'),
    ).toEqual(['0.1.13-beta.22']);
  });

  it('finds a contiguous run of stranded pre-releases', () => {
    const published = [
      '0.1.13',
      '0.1.14-beta.6',
      '0.1.14-beta.9',
      '0.1.14-beta.10',
      '0.1.14-beta.12',
    ];

    expect(
      selectStrandedPrereleases(published, '0.1.14', '0.1.14-beta.6'),
    ).toEqual(['0.1.14-beta.9', '0.1.14-beta.10', '0.1.14-beta.12']);
  });

  // Releasing from the tip of dev strands nothing, which is what keeps --from-dev
  // behaving exactly like the pre-existing release flow.
  it('returns nothing when releasing from the newest pre-release', () => {
    const published = ['0.1.10', '0.1.11-beta.0'];

    expect(
      selectStrandedPrereleases(published, '0.1.11', '0.1.11-beta.0'),
    ).toEqual([]);
  });

  it('ignores pre-releases belonging to a different version', () => {
    const published = ['0.1.13-beta.22', '0.1.15-beta.0', '0.2.0-beta.1'];

    expect(
      selectStrandedPrereleases(published, '0.1.13', '0.1.13-beta.21'),
    ).toEqual(['0.1.13-beta.22']);
  });

  it('ignores stable releases and unparseable versions', () => {
    const published = ['0.1.13', '0.1.13-beta.22', 'nightly', '1.7.0'];

    expect(
      selectStrandedPrereleases(published, '0.1.13', '0.1.13-beta.21'),
    ).toEqual(['0.1.13-beta.22']);
  });
});

describe('classifyMergeConflicts', () => {
  it('accepts the three files a release commit can touch', () => {
    const result = classifyMergeConflicts(
      'package.json\npackage-lock.json\nCHANGELOG.md',
    );

    expect(result.unexpected).toEqual([]);
    expect(result.conflicted).toHaveLength(3);
  });

  it('flags anything outside those files so the caller bails out', () => {
    const result = classifyMergeConflicts('package.json\nsrc/app.module.ts');

    expect(result.unexpected).toEqual(['src/app.module.ts']);
  });

  it('tolerates blank lines and surrounding whitespace', () => {
    const result = classifyMergeConflicts(
      '\n  package.json  \n\nCHANGELOG.md\n',
    );

    expect(result.conflicted).toEqual(['package.json', 'CHANGELOG.md']);
    expect(result.unexpected).toEqual([]);
  });

  it('reports no conflicts for empty output', () => {
    expect(classifyMergeConflicts('').conflicted).toEqual([]);
  });
});

describe('changelog merge', () => {
  let changelogPath: string;

  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'solidctl-changelog-'));
    changelogPath = path.join(dir, 'CHANGELOG.md');
  });

  // Resolving the reverse merge keeps dev's pre-release entry and re-inserts the
  // stable entry above it, which is the correct semver order.
  it('inserts the stable entry above the retained pre-release entry', () => {
    fs.writeFileSync(
      changelogPath,
      [
        '# Changelog',
        '',
        '## [0.1.13-beta.22] - 2026-08-17',
        '',
        '### Added',
        '',
        '- normalization utilities for text fields',
        '',
        '## [0.1.13-beta.21] - 2026-08-14',
        '',
      ].join('\n'),
      'utf-8',
    );

    writeChangelog(
      '## [0.1.13] - 2026-08-20\n\n### Added\n\n- stable release',
      changelogPath,
    );

    const merged = fs.readFileSync(changelogPath, 'utf-8');

    expect(merged).toContain('## [0.1.13]');
    expect(merged).toContain('## [0.1.13-beta.22]');
    expect(merged.indexOf('## [0.1.13]')).toBeLessThan(
      merged.indexOf('## [0.1.13-beta.22]'),
    );
    expect(merged.startsWith('# Changelog')).toBe(true);
  });

  it('extracts a single version entry without bleeding into the next', () => {
    const changelog = [
      '# Changelog',
      '',
      '## [0.1.13] - 2026-08-20',
      '',
      '- stable',
      '',
      '## [0.1.13-beta.22] - 2026-08-17',
      '',
      '- beta only',
    ].join('\n');

    const entry = extractEntry(changelog, '0.1.13');

    expect(entry).toContain('- stable');
    expect(entry).not.toContain('- beta only');
  });

  it('returns undefined for a version with no entry', () => {
    expect(
      extractEntry('# Changelog\n\n## [0.1.13]\n', '0.9.9'),
    ).toBeUndefined();
  });
});
