import { Command } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface PublishConfig {
  mainBranch: string;
  devBranch: string;
  reverseMerge: boolean;
}

interface PackageJson {
  name?: string;
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

function readPackageJson(): PackageJson | undefined {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  } catch {
    return undefined;
  }
}

function resolveReleaseProject(): ResolvedReleaseProject {
  const cwdName = path.basename(process.cwd());
  const packageJson = readPackageJson();
  const packageName = packageJson?.name;

  switch (cwdName) {
    case 'solidctl':
      if (packageName === '@solidxai/solidctl') {
        console.log(`📦 Release project resolved: solidctl (${packageName})`);
        return { type: 'solidctl', cwdName, packageName };
      }
      break;
    case 'solid-core-module':
      if (packageName === '@solidxai/core') {
        console.log(`📦 Release project resolved: solid-core-module (${packageName})`);
        return { type: 'solid-core-module', cwdName, packageName };
      }
      break;
    case 'solid-core-ui':
      if (packageName === '@solidxai/core-ui') {
        console.log(`📦 Release project resolved: solid-core-ui (${packageName})`);
        return { type: 'solid-core-ui', cwdName, packageName };
      }
      break;
    case 'solid-library-management':
      if (packageName === '@solidxai/solid-library-management') {
        console.log(`📦 Release project resolved: solid-library-management (${packageName})`);
        return { type: 'solid-library-management', cwdName, packageName };
      }

      console.log('📦 Release project resolved: solid-library-management (package.json pending)');
      return { type: 'solid-library-management', cwdName, packageName };
  }

  console.error(`❌ Could not resolve release project from folder "${cwdName}" and package name "${packageName || 'unknown'}".`);
  console.error('   Supported release folders are solidctl, solid-core-module, solid-core-ui, and solid-library-management.');
  process.exit(1);
}

function getCurrentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
}

function getRequiredBranch(preid: string | undefined, devBranch: string): string {
  if (preid === 'alpha') {
    return 'predev';
  }

  if (preid) {
    return devBranch;
  }

  return 'main';
}

function exec(cmd: string, dryRun: boolean): string {
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return '';
  }
  execSync(cmd, { stdio: 'inherit' });
  return '';
}

function runSharedReleaseFlow(versionType: string, options: PublishOptions) {
  const config = loadConfig();

  const mainBranch = options.mainBranch || config.mainBranch;
  const devBranch = options.devBranch || config.devBranch;
  const reverseMerge = options.merge !== false && config.reverseMerge;
  const dryRun = options.dryRun || false;
  const force = options.force || false;
  const preid = options.preid;
  const isPrerelease = !!preid;

  try {
    const currentBranch = getCurrentBranch();
    const requiredBranch = isPrerelease ? getRequiredBranch(preid, devBranch) : mainBranch;

    if (currentBranch !== requiredBranch) {
      if (force) {
        console.log(`⚠️  Not on ${requiredBranch} branch (on ${currentBranch}), but --force flag set. Continuing...`);
      } else {
        if (preid === 'alpha') {
          console.error(`❌ Must be on predev branch to publish alpha pre-releases. Currently on: ${currentBranch}`);
        } else if (isPrerelease) {
          console.error(`❌ Must be on ${devBranch} branch to publish ${preid} pre-releases. Currently on: ${currentBranch}`);
        } else {
          console.error(`❌ Must be on ${mainBranch} branch to publish stable releases. Currently on: ${currentBranch}`);
        }
        console.error('   Use --force to override this check.');
        process.exit(1);
      }
    }

    if (dryRun) {
      console.log('🧪 Dry run mode - no changes will be made\n');
    }

    let versionCmd: string;
    if (isPrerelease) {
      if (versionType === 'patch' || versionType === 'prerelease') {
        versionCmd = `npm version prerelease --preid=${preid}`;
      } else if (versionType === 'preminor' || versionType === 'minor') {
        versionCmd = `npm version preminor --preid=${preid}`;
      } else if (versionType === 'premajor' || versionType === 'major') {
        versionCmd = `npm version premajor --preid=${preid}`;
      } else {
        versionCmd = `npm version prerelease --preid=${preid}`;
      }
      console.log(`🔄 Updating package version (pre-release: ${preid})...`);
    } else {
      versionCmd = `npm version ${versionType}`;
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
          console.log('🚧 Release flow for solid-library-management is not implemented yet.');
          console.log('   Project resolution is in place and ready for the next step.');
          break;
      }
    });
}
