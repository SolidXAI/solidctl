import { planSolidModuleVersion } from './module-release';

describe('SolidX module release versions', () => {
  it.each([
    ['1.2.3', 'patch', undefined, '1.2.4'],
    ['1.2.3', 'minor', undefined, '1.3.0'],
    ['1.2.3', 'major', undefined, '2.0.0'],
    ['1.2.3', 'patch', 'beta', '1.2.4-beta.0'],
    ['1.2.4-beta.0', 'patch', 'beta', '1.2.4-beta.1'],
    ['1.2.4-beta.1', 'patch', undefined, '1.2.4'],
    ['1.2.3', 'minor', 'rc', '1.3.0-rc.0'],
    ['1.2.3', 'preminor', undefined, '1.3.0-0'],
    ['1.2.3', 'prerelease', undefined, '1.2.4-0'],
  ])(
    'plans %s %s %s as %s',
    (currentVersion, versionType, preid, expectedVersion) => {
      expect(planSolidModuleVersion(currentVersion, versionType, preid)).toBe(
        expectedVersion,
      );
    },
  );

  it('rejects unsupported version types', () => {
    expect(() => planSolidModuleVersion('1.2.3', 'banana')).toThrow(
      'Unsupported release version type',
    );
  });
});
