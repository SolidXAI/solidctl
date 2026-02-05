import { Command } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface PublishConfig {
  mainBranch: string;
  devBranch: string;
  reverseMerge: boolean;
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

function getCurrentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
}

function exec(cmd: string, dryRun: boolean): string {
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return '';
  }
  execSync(cmd, { stdio: 'inherit' });
  return '';
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

  Pre-releases (from dev branch):
    $ solidctl release --preid=alpha           # 0.0.12 → 0.0.13-alpha.0
    $ solidctl release --preid=alpha           # 0.0.13-alpha.0 → 0.0.13-alpha.1
    $ solidctl release minor --preid=alpha     # 0.0.12 → 0.1.0-alpha.0
    $ solidctl release --preid=beta            # 0.0.13-alpha.1 → 0.0.13-beta.0
    $ solidctl release --preid=rc              # 0.0.13-beta.1 → 0.0.13-rc.0

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
      const config = loadConfig();

      const mainBranch = options.mainBranch || config.mainBranch;
      const devBranch = options.devBranch || config.devBranch;
      const reverseMerge = options.merge !== false && config.reverseMerge;
      const dryRun = options.dryRun || false;
      const force = options.force || false;
      const preid = options.preid;
      const isPrerelease = !!preid;

      try {
        // Check we're on the correct branch
        const currentBranch = getCurrentBranch();
        const requiredBranch = isPrerelease ? devBranch : mainBranch;

        if (currentBranch !== requiredBranch) {
          if (force) {
            console.log(`⚠️  Not on ${requiredBranch} branch (on ${currentBranch}), but --force flag set. Continuing...`);
          } else {
            if (isPrerelease) {
              console.error(`❌ Must be on ${devBranch} branch to publish pre-releases. Currently on: ${currentBranch}`);
            } else {
              console.error(`❌ Must be on ${mainBranch} branch to publish stable releases. Currently on: ${currentBranch}`);
            }
            console.error(`   Use --force to override this check.`);
            process.exit(1);
          }
        }

        if (dryRun) {
          console.log('🧪 Dry run mode - no changes will be made\n');
        }

        // Build version command
        let versionCmd: string;
        if (isPrerelease) {
          if (versionType === 'patch' || versionType === 'prerelease') {
            // Increment pre-release: 0.0.12 → 0.0.13-alpha.0, or 0.0.13-alpha.0 → 0.0.13-alpha.1
            versionCmd = `npm version prerelease --preid=${preid}`;
          } else if (versionType === 'preminor' || versionType === 'minor') {
            // Start new minor pre-release: 0.0.12 → 0.1.0-alpha.0
            versionCmd = `npm version preminor --preid=${preid}`;
          } else if (versionType === 'premajor' || versionType === 'major') {
            // Start new major pre-release: 0.0.12 → 1.0.0-alpha.0
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

        // Reverse merge to dev (only for stable releases from main)
        if (!isPrerelease && reverseMerge) {
          console.log(`🔀 Merging ${mainBranch} into ${devBranch}...`);
          exec(`git checkout ${devBranch}`, dryRun);
          exec(`git pull origin ${devBranch}`, dryRun);

          try {
            exec(`git merge ${mainBranch} -m "chore: merge ${mainBranch} after publish"`, dryRun);
            exec(`git push origin ${devBranch}`, dryRun);
            console.log(`✅ Successfully merged ${mainBranch} into ${devBranch}\n`);
          } catch {
            console.error(`\n⚠️  Merge conflict detected. Please resolve manually.`);
            console.error(`   You are now on the ${devBranch} branch.`);
            process.exit(1);
          }

          // Return to main branch
          exec(`git checkout ${mainBranch}`, dryRun);
          console.log(`📍 Back on ${mainBranch} branch`);
        } else if (!isPrerelease && !reverseMerge) {
          console.log(`⏭️  Skipping reverse merge (--no-merge)`);
        } else {
          // For pre-releases, just stay on current branch
          console.log(`📍 Staying on ${currentBranch} branch`);
        }

        console.log('\n🎉 All done!');
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
