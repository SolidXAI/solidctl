import { createHash } from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import yauzl from 'yauzl';
import { ZipFile } from 'yazl';

const SCHEMA_VERSION = '1.0';
// A package that declares userData or dependencies is 1.1, so an older core (which replaces the whole
// module folder on an update) refuses it instead of overwriting the user's data.
const SCHEMA_VERSION_WITH_MODULE_PACKAGE = '1.1';
const SUPPORTED_SCHEMA_VERSIONS = [SCHEMA_VERSION, SCHEMA_VERSION_WITH_MODULE_PACKAGE];
const INSTALL_RECORD_FILE = '.sldx-installed.json';
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

/** What an update must leave alone: paths relative to the module folder, and top-level metadata keys. */
export interface ModulePackageUserData {
  solidApiPaths: string[];
  solidUiPaths: string[];
  metadataKeys: string[];
}

export interface ModulePackageDependencies {
  solidApi: Record<string, string>;
  solidUi: Record<string, string>;
  prerequisites: Array<Record<string, unknown>>;
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
  userData?: ModulePackageUserData;
  dependencies?: ModulePackageDependencies;
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
  /** When set, this is archived instead of the file's own bytes. */
  content?: Buffer;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter(
          (entry): entry is string =>
            typeof entry === 'string' && entry.trim().length > 0,
        )
        .map((entry) => entry.trim())
    : [];
}

export function normalizeUserData(raw: unknown): ModulePackageUserData {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const safePaths = (value: unknown) =>
    stringList(value)
      .map((entry) =>
        entry.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, ''),
      )
      .filter(
        (entry) =>
          entry && !entry.startsWith('/') && !entry.split('/').includes('..'),
      );
  return {
    solidApiPaths: safePaths(source.solidApiPaths),
    solidUiPaths: safePaths(source.solidUiPaths),
    metadataKeys: stringList(source.metadataKeys),
  };
}

export function normalizeDependencies(
  raw: unknown,
): ModulePackageDependencies | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const source = raw as Record<string, unknown>;
  const ranges = (value: unknown): Record<string, string> =>
    Object.fromEntries(
      Object.entries(
        value && typeof value === 'object' ? (value as object) : {},
      ).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0].trim().length > 0,
      ),
    );
  const dependencies: ModulePackageDependencies = {
    solidApi: ranges(source.solidApi),
    solidUi: ranges(source.solidUi),
    prerequisites: Array.isArray(source.prerequisites)
      ? source.prerequisites.filter(
          (entry): entry is Record<string, unknown> =>
            !!entry && typeof entry === 'object',
        )
      : [],
  };
  const empty =
    Object.keys(dependencies.solidApi).length +
      Object.keys(dependencies.solidUi).length +
      dependencies.prerequisites.length ===
    0;
  return empty ? undefined : dependencies;
}

function hasUserData(userData: ModulePackageUserData): boolean {
  return (
    userData.solidApiPaths.length +
      userData.solidUiPaths.length +
      userData.metadataKeys.length >
    0
  );
}

function isUnderUserDataPath(
  archivePath: string,
  archiveRoot: string,
  paths: string[],
): boolean {
  return paths.some(
    (entry) =>
      archivePath === `${archiveRoot}/${entry}` ||
      archivePath.startsWith(`${archiveRoot}/${entry}/`),
  );
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
      const options = {
        compressionLevel: 9,
        mtime: archiveMtime,
        mode: 0o100644,
      };
      if (file.content) {
        archive.addBuffer(file.content, file.archivePath, options);
      } else {
        archive.addFile(file.sourcePath, file.archivePath, options);
      }
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
  const modulePackageSection = (
    metadata as { modulePackage?: Record<string, unknown> }
  ).modulePackage;
  const userData = normalizeUserData(modulePackageSection?.userData);
  const dependencies = normalizeDependencies(
    modulePackageSection?.packageDependencies,
  );
  let files: ArchiveSourceFile[] = [];
  await collectSourceFiles(config.apiModulePath, apiArchiveRoot, files);
  await collectSourceFiles(config.uiModulePath, uiArchiveRoot, files);
  // The package never carries the developer's own user data or this project's install record.
  files = files.filter(
    (file) =>
      file.archivePath !== `${apiArchiveRoot}/${INSTALL_RECORD_FILE}` &&
      !isUnderUserDataPath(
        file.archivePath,
        apiArchiveRoot,
        userData.solidApiPaths,
      ) &&
      !isUnderUserDataPath(
        file.archivePath,
        uiArchiveRoot,
        userData.solidUiPaths,
      ),
  );

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
  const packagedMetadata: Record<string, unknown> = {
    ...(metadata as Record<string, unknown>),
  };
  for (const key of userData.metadataKeys) {
    if (key in packagedMetadata) {
      const value = packagedMetadata[key];
      packagedMetadata[key] = Array.isArray(value)
        ? []
        : value && typeof value === 'object'
          ? {}
          : null;
    }
  }
  files.push({
    sourcePath: config.metadataPath,
    archivePath: metadataArchivePath,
    // Rewritten only when something in it is user data; otherwise the file goes in as it is.
    content: userData.metadataKeys.some((key) => key in packagedMetadata)
      ? Buffer.from(`${JSON.stringify(packagedMetadata, null, 2)}\n`, 'utf-8')
      : undefined,
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
    checksums[file.archivePath] = file.content
      ? createHash('sha256').update(file.content).digest('hex')
      : await sha256File(file.sourcePath);
  }

  const manifest: ModulePackageManifest = {
    schemaVersion:
      hasUserData(userData) || dependencies
        ? SCHEMA_VERSION_WITH_MODULE_PACKAGE
        : SCHEMA_VERSION,
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
    ...(hasUserData(userData) ? { userData } : {}),
    ...(dependencies ? { dependencies } : {}),
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
    !SUPPORTED_SCHEMA_VERSIONS.includes(manifest.schemaVersion) ||
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
