import { Command } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
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
    console.error(`❌ Could not read package.json at ${packageJsonPath}`);
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
        console.log(`📦 Release project resolved: solidctl (${packageName})`);
        return { type: 'solidctl', cwdName, packageName, versionSourcePath: path.join(process.cwd(), 'package.json') };
      }
      break;
    case 'solid-core-module':
      if (packageName === '@solidxai/core') {
        console.log(`📦 Release project resolved: solid-core-module (${packageName})`);
        return { type: 'solid-core-module', cwdName, packageName, versionSourcePath: path.join(process.cwd(), 'package.json') };
      }
      break;
    case 'solid-core-ui':
      if (packageName === '@solidxai/core-ui') {
        console.log(`📦 Release project resolved: solid-core-ui (${packageName})`);
        return { type: 'solid-core-ui', cwdName, packageName, versionSourcePath: path.join(process.cwd(), 'package.json') };
      }
      break;
    case 'solid-library-management':
      if (solidApiPackageName === '@library-management/solid-api') {
        console.log(`📦 Release project resolved: solid-library-management (${solidApiPackageName})`);
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
      console.log(`⚠️  Not on ${requiredBranch} branch (on ${currentBranch}), but --force flag set. Continuing...`);
      return currentBranch;
    }

    if (preid === 'alpha') {
      console.error(`❌ Must be on predev branch to publish alpha pre-releases. Currently on: ${currentBranch}`);
    } else if (preid) {
      console.error(`❌ Must be on ${devBranch} branch to publish ${preid} pre-releases. Currently on: ${currentBranch}`);
    } else {
      console.error(`❌ Must be on ${mainBranch} branch to publish stable releases. Currently on: ${currentBranch}`);
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
  return `FROM node:20-bookworm AS builder

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /workspace/agent

RUN apt-get update \\
  && apt-get install -y python3 python3-pip python3-venv supervisor \\
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g @angular-devkit/schematics-cli

COPY agent /workspace/agent

RUN python3 -m venv /opt/agent-venv
RUN /bin/sh -lc ". /opt/agent-venv/bin/activate && cd /workspace/agent && pip install --no-cache-dir /workspace/agent/vendor/mini-swe-agent && pip install --no-cache-dir '.[full]'"
RUN mkdir -p /opt/prebuilt/agent-ui-dist
RUN cd /workspace/agent/agent-ui && npm i --legacy-peer-deps && npm run build -- --outDir /opt/prebuilt/agent-ui-dist --emptyOutDir

FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /workspace/solid-library-management

RUN apt-get update \\
  && apt-get install -y python3 python3-pip python3-venv supervisor \\
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g @angular-devkit/schematics-cli

COPY --from=builder /opt/agent-venv /opt/agent-venv
COPY --from=builder /opt/prebuilt/agent-ui-dist /opt/prebuilt/agent-ui-dist
`;
}

function runSharedReleaseFlow(versionType: string, options: PublishOptions) {
  const { mainBranch, devBranch, reverseMerge, dryRun, force, preid, isPrerelease } = getReleaseOptions(options);

  try {
    const currentBranch = validateReleaseBranch(preid, mainBranch, devBranch, force);

    if (dryRun) {
      console.log('🧪 Dry run mode - no changes will be made\n');
    }

    const versionCmd = getVersionCommand(versionType, preid);
    if (isPrerelease) {
      console.log(`🔄 Updating package version (pre-release: ${preid})...`);
    } else {
      console.log(`🔄 Updating package version (${versionType})...`);
    }
    exec(versionCmd, dryRun);

    console.log('📦 Pushing to git (with tags)...');
    exec('git push --follow-tags', dryRun);

    console.log('📦 Publishing package...');
    if (isPrerelease) {
      exec(`npm publish --tag ${preid}`, dryRun);
    } else {
      exec('npm publish', dryRun);
    }

    console.log('✅ Published successfully!\n');

    if (!isPrerelease && reverseMerge) {
      console.log(`🔀 Merging ${mainBranch} into ${devBranch}...`);
      exec(`git checkout ${devBranch}`, dryRun);
      exec(`git pull origin ${devBranch}`, dryRun);

      try {
        exec(`git merge ${mainBranch} -m "chore: merge ${mainBranch} after publish"`, dryRun);
        exec(`git push origin ${devBranch}`, dryRun);
        console.log(`✅ Successfully merged ${mainBranch} into ${devBranch}\n`);
      } catch {
        console.error('\n⚠️  Merge conflict detected. Please resolve manually.');
        console.error(`   You are now on the ${devBranch} branch.`);
        process.exit(1);
      }

      exec(`git checkout ${mainBranch}`, dryRun);
      console.log(`📍 Back on ${mainBranch} branch`);
    } else if (!isPrerelease && !reverseMerge) {
      console.log('⏭️  Skipping reverse merge (--no-merge)');
    } else {
      console.log(`📍 Staying on ${currentBranch} branch`);
    }

    console.log('\n🎉 All done!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
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
    console.error(`❌ solid-api package.json is missing a version at ${solidApiPackageJsonPath}`);
    process.exit(1);
  }

  if (!agentRepoPath) {
    console.error('❌ SOLIDX_AI_AGENT_PATH is not set. This release flow needs the local agent checkout.');
    process.exit(1);
  }

  if (!fs.existsSync(agentRepoPath)) {
    console.error(`❌ SOLIDX_AI_AGENT_PATH does not exist: ${agentRepoPath}`);
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
    console.log(`🐳 Preparing solid-library-management sandbox base image release (${plannedVersion})...`);
    console.log(`📦 Docker image repository: ${imageRepository}`);
    console.log(`📦 Docker base image: node:20-bookworm`);
    console.log(`📦 Docker tags to publish: ${plannedVersion}, ${movingDockerTag}`);
    console.log(`📦 Agent source path: ${agentRepoPath}`);

    if (dryRun) {
      console.log('🧪 Dry run mode - no changes will be made\n');
    }

    console.log(`🔄 Updating solid-api version (${isPrerelease ? `pre-release: ${preid}` : versionType})...`);
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

    console.log('📦 Creating Docker build context...');
    if (!dryRun) {
      copyDirectoryForDockerBuild(agentRepoPath, agentCopyPath);
      fs.writeFileSync(dockerfilePath, createSolidLibraryManagementDockerfile(), 'utf-8');
    }

    console.log('🐳 Building sandbox base image...');
    exec(`docker build -t ${versionImageTag} -t ${movingImageTag} ${buildContextRoot}`, dryRun);

    console.log('📦 Pushing git commit and tags...');
    exec('git push --follow-tags', dryRun);

    console.log('📦 Publishing Docker image...');
    exec(`docker push ${versionImageTag}`, dryRun);
    exec(`docker push ${movingImageTag}`, dryRun);

    console.log(`📍 Staying on ${currentBranch} branch`);
    console.log('\n🎉 Docker image release completed!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
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
    .action((versionType: string = 'patch', options: PublishOptions) => {
      const project = resolveReleaseProject();

      switch (project.type) {
        case 'solidctl':
          runSharedReleaseFlow(versionType, options);
          break;
        case 'solid-core-module':
          runSharedReleaseFlow(versionType, options);
          break;
        case 'solid-core-ui':
          runSharedReleaseFlow(versionType, options);
          break;
        case 'solid-library-management':
          runSolidLibraryManagementReleaseFlow(versionType, options, project);
          break;
      }
    });
}
