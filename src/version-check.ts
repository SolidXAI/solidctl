import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { isInteractiveSession } from './utils/interactive';

const PACKAGE_NAME = '@solidxai/solidctl';
const NPM_TIMEOUT_MS = 10_000;

export function getCurrentVersion(): string {
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf-8'),
    ) as { version?: string };
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function getDistTag(version: string): string {
  const prerelease = semver.prerelease(version);
  if (prerelease && prerelease.length > 0) {
    return String(prerelease[0]);
  }
  return 'latest';
}

function getLatestPublishedVersion(distTag: string): string | null {
  try {
    const result = execSync(`npm view ${PACKAGE_NAME} dist-tags --json`, {
      encoding: 'utf-8',
      timeout: NPM_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const distTags = JSON.parse(result) as Record<string, string>;
    const version = distTags[distTag];
    return version || null;
  } catch {
    return null;
  }
}

export async function checkForUpdates(): Promise<void> {
  let spinner: ReturnType<typeof ora> | null = null;

  try {
    const currentVersion = getCurrentVersion();
    if (!semver.valid(currentVersion)) {
      return;
    }

    const distTag = getDistTag(currentVersion);

    spinner = ora(`Checking for ${distTag} updates...`).start();

    const latestVersion = getLatestPublishedVersion(distTag);
    if (!latestVersion) {
      spinner.stop();
      return;
    }

    if (
      !semver.valid(latestVersion) ||
      !semver.gt(latestVersion, currentVersion)
    ) {
      spinner.stop();
      return;
    }

    spinner.stop();

    console.log(
      chalk.yellow(
        `\n⚠️  A newer version of ${PACKAGE_NAME} is available: ${latestVersion} (you have ${currentVersion})`,
      ),
    );

    // Skip the prompt entirely when not attached to a real TTY (e.g. this
    // process's stdin is piped or ignored, as it is for every solidctl
    // child process). inquirer can hang indefinitely on non-interactive
    // stdin instead of rejecting, so default to "no" without ever asking.
    const upgrade = isInteractiveSession()
      ? (
          await inquirer.prompt<{ upgrade: boolean }>([
            {
              type: 'confirm',
              name: 'upgrade',
              message: `Would you like to upgrade to ${latestVersion}?`,
              default: false,
            },
          ])
        ).upgrade
      : false;

    if (!upgrade) {
      console.log(
        chalk.dim('  You can upgrade later with: npm install -g ') +
          chalk.cyan(`${PACKAGE_NAME}@${distTag}`) +
          '\n',
      );
      return;
    }

    console.log(chalk.cyan(`\n▶ Upgrading ${PACKAGE_NAME}@${distTag}...\n`));
    try {
      execSync(`npm install -g ${PACKAGE_NAME}@${distTag}`, {
        stdio: 'inherit',
      });
      console.log(
        chalk.green(
          `\n✔ Upgraded to ${latestVersion}. Please re-run your command.\n`,
        ),
      );
      process.exit(0);
    } catch {
      console.error(
        chalk.red(
          `\n❌ Upgrade failed. You can manually run: npm install -g ${PACKAGE_NAME}@${distTag}\n`,
        ),
      );
    }
  } catch {
    // Silently continue on any unexpected error
  }
}
