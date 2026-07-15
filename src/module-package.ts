import { createHash } from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import yauzl from 'yauzl';
import { ZipFile } from 'yazl';

const SCHEMA_VERSION = '1.0';
const PACKAGE_TYPE = 'solidx-module';
const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;

export interface SolidModulePublishConfig {
  type: 'solidx-module';
  moduleName: string;
  artifactName?: string;
  apiModulePath?: string;
  uiModulePath?: string;
  metadataPath?: string;
  outputDir?: string;
  validationCommands?: string[];
  mainBranch?: string;
  devBranch?: string;
  reverseMerge?: boolean;
}

export interface ResolvedSolidModuleConfig {
  moduleName: string;
  artifactName: string;
  apiModulePath: string;
  uiModulePath: string;
  metadataPath: string;
  outputDir: string;
  validationCommands: string[];
  mainBranch?: string;
  devBranch?: string;
  reverseMerge?: boolean;
}

export interface ModulePackageManifest {
  schemaVersion: string;
  packageType: string;
  exportedAt: string;
  generatedBy: {
    name: string;
    version?: string;
  };
  module: {
    name: string;
    version?: string;
    displayName?: string;
    description?: string;
  };
  contents: {
    metadataPath: string;
    apiModulePath: string;
    uiModulePath: string;
  };
  postImport: {
    recommendedSteps: string[];
  };
  checksums: Record<string, string>;
}

export interface ExportModulePackageOptions {
  projectRoot: string;
  config: ResolvedSolidModuleConfig;
  version: string;
  outputPath?: string;
  generatedByVersion?: string;
  exportedAt?: string;
}

export interface ExportModulePackageResult {
  filePath: string;
  fileName: string;
  manifest: ModulePackageManifest;
  sha256: string;
}

interface ArchiveSourceFile {
  sourcePath: string;
  archivePath: string;
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
}

export function loadSolidModulePublishConfig(
  projectRoot: string,
): SolidModulePublishConfig | undefined {
  const configPath = path.join(projectRoot, 'solidctl.config.json');
  const packagePath = path.join(projectRoot, 'package.json');
  const candidates: unknown[] = [];

  if (fs.existsSync(configPath)) {
    const document = readJson(configPath) as { publish?: unknown };
    candidates.push(document.publish);
  }
  if (fs.existsSync(packagePath)) {
    const document = readJson(packagePath) as {
      solidctl?: { publish?: unknown };
    };
    candidates.push(document.solidctl?.publish);
  }

  const publish = candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === 'object' &&
      (candidate as { type?: unknown }).type === PACKAGE_TYPE,
  );
  if (!publish) {
    return undefined;
  }

  const config = publish as SolidModulePublishConfig;
  if (!config.moduleName || typeof config.moduleName !== 'string') {
    throw new Error('A SolidX module release requires publish.moduleName.');
  }
  if (config.validationCommands && !Array.isArray(config.validationCommands)) {
    throw new Error(
      'publish.validationCommands must be an array of shell commands.',
    );
  }

  return config;
}

function assertSafeName(value: string, fieldName: string): void {
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(value)) {
    throw new Error(`${fieldName} contains unsupported characters: ${value}`);
  }
}

function resolveConfiguredPath(
  projectRoot: string,
  configuredPath: string,
  fieldName: string,
): string {
  if (path.isAbsolute(configuredPath)) {
    throw new Error(`${fieldName} must be relative to the project root.`);
  }

  const resolvedRoot = path.resolve(projectRoot);
  const resolvedPath = path.resolve(projectRoot, configuredPath);
  const relativePath = path.relative(resolvedRoot, resolvedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`${fieldName} must stay within the project root.`);
  }

  return resolvedPath;
}

export function resolveSolidModuleConfig(
  projectRoot: string,
  config: SolidModulePublishConfig,
): ResolvedSolidModuleConfig {
  const moduleName = config.moduleName.trim();
  const artifactName = (config.artifactName || moduleName).trim();
  assertSafeName(moduleName, 'publish.moduleName');
  assertSafeName(artifactName, 'publish.artifactName');

  const apiModulePath =
    config.apiModulePath || path.join('solid-api', 'src', moduleName);
  const uiModulePath =
    config.uiModulePath || path.join('solid-ui', 'src', moduleName);
  const metadataPath =
    config.metadataPath ||
    path.join(apiModulePath, 'metadata', `${moduleName}-metadata.json`);
  const outputDir = config.outputDir || '.solidx-releases';

  return {
    moduleName,
    artifactName,
    apiModulePath: resolveConfiguredPath(
      projectRoot,
      apiModulePath,
      'publish.apiModulePath',
    ),
    uiModulePath: resolveConfiguredPath(
      projectRoot,
      uiModulePath,
      'publish.uiModulePath',
    ),
    metadataPath: resolveConfiguredPath(
      projectRoot,
      metadataPath,
      'publish.metadataPath',
    ),
    outputDir: resolveConfiguredPath(
      projectRoot,
      outputDir,
      'publish.outputDir',
    ),
    validationCommands: config.validationCommands || [],
    mainBranch: config.mainBranch,
    devBranch: config.devBranch,
    reverseMerge: config.reverseMerge,
  };
}

async function collectSourceFiles(
  sourceRoot: string,
  archiveRoot: string,
  files: ArchiveSourceFile[],
): Promise<void> {
  const entries = await fsp.readdir(sourceRoot, { withFileTypes: true });

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const archivePath = path.posix.join(archiveRoot, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(
        `Module packages cannot contain symbolic links: ${sourcePath}`,
      );
    }
    if (entry.isDirectory()) {
      await collectSourceFiles(sourcePath, archivePath, files);
    } else if (entry.isFile()) {
      files.push({ sourcePath, archivePath });
    } else {
      throw new Error(
        `Unsupported filesystem entry in module package: ${sourcePath}`,
      );
    }
  }
}

async function assertDirectory(
  projectRoot: string,
  directoryPath: string,
  label: string,
): Promise<void> {
  const stat = await fsp.lstat(directoryPath).catch(() => undefined);
  if (!stat?.isDirectory()) {
    throw new Error(
      `${label} does not exist or is not a directory: ${directoryPath}`,
    );
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`${label} cannot be a symbolic link: ${directoryPath}`);
  }

  const realProjectRoot = await fsp.realpath(projectRoot);
  const realDirectoryPath = await fsp.realpath(directoryPath);
  const relativePath = path.relative(realProjectRoot, realDirectoryPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`${label} must stay within the project root.`);
  }
}

async function sha256File(filePath: string): Promise<string> {
  return createHash('sha256')
    .update(await fsp.readFile(filePath))
    .digest('hex');
}

async function createArchive(
  files: ArchiveSourceFile[],
  manifest: ModulePackageManifest,
  outputPath: string,
): Promise<void> {
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = new ZipFile();
    const archiveMtime = new Date(manifest.exportedAt);
    let settled = false;

    const fail = (error: Error) => {
      if (!settled) {
        settled = true;
        output.destroy();
        reject(error);
      }
    };

    output.on('close', () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    });
    output.on('error', fail);
    archive.on('error', fail);
    archive.outputStream.pipe(output);

    for (const file of files) {
      archive.addFile(file.sourcePath, file.archivePath, {
        compressionLevel: 9,
        mtime: archiveMtime,
        mode: 0o100644,
      });
    }
    archive.addBuffer(
      Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf-8'),
      'manifest.json',
      {
        compressionLevel: 9,
        mtime: archiveMtime,
        mode: 0o100644,
      },
    );
    archive.end({
      forceZip64Format: false,
      comment: '',
    });
  });
}

export async function exportModulePackage(
  options: ExportModulePackageOptions,
): Promise<ExportModulePackageResult> {
  const { projectRoot, config, version, generatedByVersion } = options;
  const { moduleName } = config;
  assertSafeName(version, 'version');
  await assertDirectory(projectRoot, config.apiModulePath, 'API module path');
  await assertDirectory(projectRoot, config.uiModulePath, 'UI module path');

  const metadataStat = await fsp
    .lstat(config.metadataPath)
    .catch(() => undefined);
  if (!metadataStat?.isFile() || metadataStat.isSymbolicLink()) {
    throw new Error(`Module metadata does not exist: ${config.metadataPath}`);
  }
  const realApiModulePath = await fsp.realpath(config.apiModulePath);
  const realMetadataPath = await fsp.realpath(config.metadataPath);
  const relativeMetadataPath = path.relative(
    realApiModulePath,
    realMetadataPath,
  );
  if (
    relativeMetadataPath.startsWith('..') ||
    path.isAbsolute(relativeMetadataPath)
  ) {
    throw new Error(
      'publish.metadataPath must be inside publish.apiModulePath.',
    );
  }

  const metadata = readJson(config.metadataPath) as {
    moduleMetadata?: {
      name?: string;
      displayName?: string;
      description?: string;
    };
  };
  if (metadata.moduleMetadata?.name !== moduleName) {
    throw new Error(
      `Metadata module name "${metadata.moduleMetadata?.name || ''}" does not match "${moduleName}".`,
    );
  }

  const apiArchiveRoot = path.posix.join('solid-api', 'src', moduleName);
  const uiArchiveRoot = path.posix.join('solid-ui', 'src', moduleName);
  let files: ArchiveSourceFile[] = [];
  await collectSourceFiles(config.apiModulePath, apiArchiveRoot, files);
  await collectSourceFiles(config.uiModulePath, uiArchiveRoot, files);

  const metadataArchivePath = path.posix.join(
    apiArchiveRoot,
    'metadata',
    `${moduleName}-metadata.json`,
  );
  files = files.filter(
    (file) =>
      path.resolve(file.sourcePath) !== path.resolve(config.metadataPath) &&
      file.archivePath !== metadataArchivePath,
  );
  files.push({
    sourcePath: config.metadataPath,
    archivePath: metadataArchivePath,
  });
  const apiModulePath = path.posix.join(
    apiArchiveRoot,
    `${moduleName}.module.ts`,
  );
  const uiModulePath = path.posix.join(
    uiArchiveRoot,
    `${moduleName}.ui-module.ts`,
  );
  const archivePaths = new Set(files.map((file) => file.archivePath));

  for (const requiredPath of [
    metadataArchivePath,
    apiModulePath,
    uiModulePath,
  ]) {
    if (!archivePaths.has(requiredPath)) {
      throw new Error(
        `Module package is missing required file: ${requiredPath}`,
      );
    }
  }

  const checksums: Record<string, string> = {};
  for (const file of files) {
    checksums[file.archivePath] = await sha256File(file.sourcePath);
  }

  const manifest: ModulePackageManifest = {
    schemaVersion: SCHEMA_VERSION,
    packageType: PACKAGE_TYPE,
    exportedAt: options.exportedAt || new Date().toISOString(),
    generatedBy: {
      name: '@solidxai/solidctl',
      version: generatedByVersion,
    },
    module: {
      name: moduleName,
      version,
      displayName: metadata.moduleMetadata.displayName,
      description: metadata.moduleMetadata.description,
    },
    contents: {
      metadataPath: metadataArchivePath,
      apiModulePath,
      uiModulePath,
    },
    postImport: {
      recommendedSteps: ['restart', 'build', 'seed'],
    },
    checksums,
  };

  const fileName = `${config.artifactName}-v${version}.sldx`;
  const filePath = options.outputPath
    ? path.resolve(projectRoot, options.outputPath)
    : path.join(config.outputDir, fileName);
  await createArchive(files, manifest, filePath);
  const validatedManifest = await validateModulePackage(filePath, {
    expectedModuleName: moduleName,
    expectedVersion: version,
  });

  return {
    filePath,
    fileName: path.basename(filePath),
    manifest: validatedManifest,
    sha256: await sha256File(filePath),
  };
}

function isUnsafeArchivePath(entryPath: string): boolean {
  const normalized = entryPath.replace(/\\/g, '/');
  return (
    normalized.startsWith('/') ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split('/').includes('..')
  );
}

async function readArchive(filePath: string): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.open(
      filePath,
      { lazyEntries: true, decodeStrings: true },
      (openError, zipFile) => {
        if (openError || !zipFile) {
          reject(openError || new Error(`Could not open archive: ${filePath}`));
          return;
        }

        const files = new Map<string, Buffer>();
        let totalBytes = 0;
        let settled = false;
        const fail = (error: Error) => {
          if (!settled) {
            settled = true;
            zipFile.close();
            reject(error);
          }
        };

        zipFile.on('error', fail);
        zipFile.on('end', () => {
          if (!settled) {
            settled = true;
            resolve(files);
          }
        });
        zipFile.on('entry', (entry: yauzl.Entry) => {
          const entryPath = entry.fileName.replace(/\\/g, '/');
          if (isUnsafeArchivePath(entryPath)) {
            fail(
              new Error(`Archive contains an unsafe path: ${entry.fileName}`),
            );
            return;
          }
          if (files.has(entryPath)) {
            fail(new Error(`Archive contains a duplicate path: ${entryPath}`));
            return;
          }

          const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff;
          if ((unixMode & 0xf000) === 0xa000) {
            fail(new Error(`Archive contains a symbolic link: ${entryPath}`));
            return;
          }
          if (entryPath.endsWith('/')) {
            zipFile.readEntry();
            return;
          }

          totalBytes += entry.uncompressedSize;
          if (totalBytes > MAX_ARCHIVE_BYTES) {
            fail(
              new Error(
                `Archive exceeds the ${MAX_ARCHIVE_BYTES} byte validation limit.`,
              ),
            );
            return;
          }

          zipFile.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) {
              fail(
                streamError ||
                  new Error(`Could not read archive entry: ${entryPath}`),
              );
              return;
            }

            const chunks: Buffer[] = [];
            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('error', fail);
            stream.on('end', () => {
              files.set(entryPath, Buffer.concat(chunks));
              zipFile.readEntry();
            });
          });
        });

        zipFile.readEntry();
      },
    );
  });
}

export async function validateModulePackage(
  filePath: string,
  expected?: { expectedModuleName?: string; expectedVersion?: string },
): Promise<ModulePackageManifest> {
  if (path.extname(filePath).toLowerCase() !== '.sldx') {
    throw new Error('Module package must use the .sldx extension.');
  }

  const files = await readArchive(filePath);
  const manifestBuffer = files.get('manifest.json');
  if (!manifestBuffer) {
    throw new Error('Module package is missing manifest.json.');
  }

  let manifest: ModulePackageManifest;
  try {
    manifest = JSON.parse(
      manifestBuffer.toString('utf-8'),
    ) as ModulePackageManifest;
  } catch {
    throw new Error('Module package manifest.json is not valid JSON.');
  }

  if (
    manifest.schemaVersion !== SCHEMA_VERSION ||
    manifest.packageType !== PACKAGE_TYPE
  ) {
    throw new Error(
      `Unsupported module package contract: ${manifest.packageType} ${manifest.schemaVersion}`,
    );
  }
  if (!manifest.module?.name) {
    throw new Error('Module package manifest must include module.name.');
  }
  if (
    expected?.expectedModuleName &&
    manifest.module.name !== expected.expectedModuleName
  ) {
    throw new Error(
      `Expected module "${expected.expectedModuleName}", found "${manifest.module.name}".`,
    );
  }
  if (
    expected?.expectedVersion &&
    manifest.module.version !== expected.expectedVersion
  ) {
    throw new Error(
      `Expected version "${expected.expectedVersion}", found "${manifest.module.version}".`,
    );
  }

  const requiredPaths = [
    manifest.contents?.metadataPath,
    manifest.contents?.apiModulePath,
    manifest.contents?.uiModulePath,
  ];
  if (
    requiredPaths.some(
      (requiredPath) => !requiredPath || !files.has(requiredPath),
    )
  ) {
    throw new Error(
      'Module package is missing one or more required manifest content paths.',
    );
  }

  const checksums = manifest.checksums;
  if (!checksums || Object.keys(checksums).length === 0) {
    throw new Error('Module package manifest does not contain checksums.');
  }

  const packagedPaths = [...files.keys()]
    .filter((entryPath) => entryPath !== 'manifest.json')
    .sort();
  const checksumPaths = Object.keys(checksums).sort();
  if (JSON.stringify(packagedPaths) !== JSON.stringify(checksumPaths)) {
    throw new Error(
      'Module package checksums do not exactly match the packaged files.',
    );
  }

  for (const [entryPath, expectedChecksum] of Object.entries(checksums)) {
    const actualChecksum = createHash('sha256')
      .update(files.get(entryPath)!)
      .digest('hex');
    if (actualChecksum !== expectedChecksum) {
      throw new Error(`Checksum mismatch for ${entryPath}.`);
    }
  }

  const metadata = JSON.parse(
    files.get(manifest.contents.metadataPath)!.toString('utf-8'),
  ) as {
    moduleMetadata?: { name?: string };
  };
  if (metadata.moduleMetadata?.name !== manifest.module.name) {
    throw new Error(
      'Metadata module name does not match manifest.module.name.',
    );
  }

  return manifest;
}
