import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  exportModulePackage,
  loadSolidModulePublishConfig,
  resolveSolidModuleConfig,
  validateModulePackage,
} from './module-package';

async function createModule(
  root: string,
  moduleName: string,
  apiPath = path.join('solid-api', 'src', moduleName),
  uiPath = path.join('solid-ui', 'src', moduleName),
): Promise<void> {
  const absoluteApiPath = path.join(root, apiPath);
  const absoluteUiPath = path.join(root, uiPath);
  await fs.mkdir(path.join(absoluteApiPath, 'metadata'), { recursive: true });
  await fs.mkdir(absoluteUiPath, { recursive: true });
  await fs.writeFile(
    path.join(absoluteApiPath, `${moduleName}.module.ts`),
    `export class ${moduleName.replace(/-/g, '')}Module {}\n`,
  );
  await fs.writeFile(
    path.join(absoluteApiPath, 'metadata', `${moduleName}-metadata.json`),
    JSON.stringify({
      moduleMetadata: {
        name: moduleName,
        displayName: moduleName,
      },
    }),
  );
  await fs.writeFile(
    path.join(absoluteUiPath, `${moduleName}.ui-module.ts`),
    `export const moduleName = '${moduleName}';\n`,
  );
}

describe('module packages', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'solidctl-module-package-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('exports and validates a convention-based module', async () => {
    await createModule(root, 'testing-hub');
    const config = resolveSolidModuleConfig(root, {
      type: 'solidx-module',
      moduleName: 'testing-hub',
    });

    const result = await exportModulePackage({
      projectRoot: root,
      config,
      version: '1.2.3',
    });
    const manifest = await validateModulePackage(result.filePath, {
      expectedModuleName: 'testing-hub',
      expectedVersion: '1.2.3',
    });

    expect(manifest.module).toMatchObject({
      name: 'testing-hub',
      version: '1.2.3',
    });
    expect(Object.keys(manifest.checksums)).toEqual(
      expect.arrayContaining([
        'solid-api/src/testing-hub/testing-hub.module.ts',
        'solid-ui/src/testing-hub/testing-hub.ui-module.ts',
      ]),
    );
  });

  it('supports another module name and custom source paths', async () => {
    await createModule(root, 'agent-hub', 'backend/agent', 'frontend/agent');
    const canonicalMetadataPath = path.join(
      root,
      'backend/agent/metadata/agent-hub-metadata.json',
    );
    const customMetadataPath = path.join(
      root,
      'backend/agent/release-metadata.json',
    );
    await fs.rename(canonicalMetadataPath, customMetadataPath);
    const config = resolveSolidModuleConfig(root, {
      type: 'solidx-module',
      moduleName: 'agent-hub',
      artifactName: 'agenthub',
      apiModulePath: 'backend/agent',
      uiModulePath: 'frontend/agent',
      metadataPath: 'backend/agent/release-metadata.json',
      outputDir: 'release-output',
    });

    const result = await exportModulePackage({
      projectRoot: root,
      config,
      version: '0.1.0-beta.0',
    });

    expect(result.fileName).toBe('agenthub-v0.1.0-beta.0.sldx');
    expect(result.filePath).toBe(
      path.join(root, 'release-output', 'agenthub-v0.1.0-beta.0.sldx'),
    );
    expect(result.manifest.contents.metadataPath).toBe(
      'solid-api/src/agent-hub/metadata/agent-hub-metadata.json',
    );
    await expect(
      validateModulePackage(result.filePath, {
        expectedModuleName: 'agent-hub',
        expectedVersion: '0.1.0-beta.0',
      }),
    ).resolves.toMatchObject({
      module: { name: 'agent-hub', version: '0.1.0-beta.0' },
    });
  });

  it('rejects metadata for a different module', async () => {
    await createModule(root, 'data-hub');
    const metadataPath = path.join(
      root,
      'solid-api',
      'src',
      'data-hub',
      'metadata',
      'data-hub-metadata.json',
    );
    await fs.writeFile(
      metadataPath,
      JSON.stringify({ moduleMetadata: { name: 'other-module' } }),
    );

    await expect(
      exportModulePackage({
        projectRoot: root,
        config: resolveSolidModuleConfig(root, {
          type: 'solidx-module',
          moduleName: 'data-hub',
        }),
        version: '1.0.0',
      }),
    ).rejects.toThrow('does not match');
  });

  it('falls back to package.json module release configuration', async () => {
    await fs.writeFile(
      path.join(root, 'solidctl.config.json'),
      JSON.stringify({ publish: { mainBranch: 'main' } }),
    );
    await fs.writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({
        solidctl: {
          publish: {
            type: 'solidx-module',
            moduleName: 'data-hub',
          },
        },
      }),
    );

    expect(loadSolidModulePublishConfig(root)).toMatchObject({
      type: 'solidx-module',
      moduleName: 'data-hub',
    });
  });

  it('rejects a symlinked module source root', async () => {
    await createModule(root, 'data-hub');
    await fs.rename(
      path.join(root, 'solid-api/src/data-hub'),
      path.join(root, 'real-data-hub'),
    );
    await fs.symlink(
      path.join(root, 'real-data-hub'),
      path.join(root, 'solid-api/src/data-hub'),
    );

    await expect(
      exportModulePackage({
        projectRoot: root,
        config: resolveSolidModuleConfig(root, {
          type: 'solidx-module',
          moduleName: 'data-hub',
        }),
        version: '1.0.0',
      }),
    ).rejects.toThrow('does not exist or is not a directory');
  });

  describe('user data and dependencies', () => {
    const unzip = (archive: string, entry: string) =>
      execFileSync('unzip', ['-p', archive, entry], { encoding: 'utf-8' });

    async function createModuleWithUserData(moduleName: string) {
      await createModule(root, moduleName);
      const api = path.join(root, 'solid-api', 'src', moduleName);
      await fs.writeFile(
        path.join(api, 'metadata', `${moduleName}-metadata.json`),
        JSON.stringify({
          moduleMetadata: { name: moduleName, displayName: moduleName },
          apps: [{ name: 'developers app' }],
          modulePackage: {
            userData: {
              solidApiPaths: ['metadata/test-scenarios'],
              metadataKeys: ['apps'],
            },
            packageDependencies: {
              solidApi: { webdriverio: '^10.0.1' },
              prerequisites: [{ name: 'Java', check: 'java -version' }],
            },
          },
        }),
      );
      await fs.mkdir(path.join(api, 'metadata', 'test-scenarios'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(api, 'metadata', 'test-scenarios', 'mine.json'),
        '{}',
      );
      await fs.writeFile(path.join(api, '.sldx-installed.json'), '{}');
      return resolveSolidModuleConfig(root, {
        type: 'solidx-module',
        moduleName,
      });
    }

    it('leaves user data and the install record out and records what to protect', async () => {
      const config = await createModuleWithUserData('testing-hub');

      const result = await exportModulePackage({
        projectRoot: root,
        config,
        version: '1.0.0',
      });

      const manifest = await validateModulePackage(result.filePath, {
        expectedModuleName: 'testing-hub',
        expectedVersion: '1.0.0',
      });
      expect(manifest.schemaVersion).toBe('1.1');
      expect(manifest.userData).toEqual({
        solidApiPaths: ['metadata/test-scenarios'],
        solidUiPaths: [],
        metadataKeys: ['apps'],
      });
      expect(manifest.dependencies?.solidApi).toEqual({
        webdriverio: '^10.0.1',
      });
      const paths = Object.keys(manifest.checksums);
      expect(paths.some((entry) => entry.includes('test-scenarios'))).toBe(
        false,
      );
      expect(paths.some((entry) => entry.endsWith('.sldx-installed.json'))).toBe(
        false,
      );

      const packaged = JSON.parse(
        unzip(
          result.filePath,
          'solid-api/src/testing-hub/metadata/testing-hub-metadata.json',
        ),
      );
      expect(packaged.apps).toEqual([]);
      expect(packaged.modulePackage.userData.metadataKeys).toEqual(['apps']);
      // The developer's own file is untouched.
      const source = JSON.parse(
        await fs.readFile(config.metadataPath, 'utf-8'),
      );
      expect(source.apps).toEqual([{ name: 'developers app' }]);
    });

    it('keeps schema 1.0 for a module that declares nothing', async () => {
      await createModule(root, 'plain-module');
      const config = resolveSolidModuleConfig(root, {
        type: 'solidx-module',
        moduleName: 'plain-module',
      });

      const result = await exportModulePackage({
        projectRoot: root,
        config,
        version: '1.0.0',
      });

      const manifest = await validateModulePackage(result.filePath, {
        expectedModuleName: 'plain-module',
        expectedVersion: '1.0.0',
      });
      expect(manifest.schemaVersion).toBe('1.0');
      expect(manifest.userData).toBeUndefined();
      expect(manifest.dependencies).toBeUndefined();
    });
  });
});
