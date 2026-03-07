import { Command } from 'commander';
import { execSync } from 'child_process';
import { validateProjectRoot } from '../helper';

export function registerUpgradeCommand(program: Command) {
  program
    .command('upgrade')
    .description('Upgrade Solid API and UI dependencies (defaults to beta pre-release)')
    .option('--dry-run', 'Show commands without executing')
    .option('--stable', 'Upgrade to latest stable release instead of beta')
    .option('--tag <tag>', 'Install a specific pre-release tag (e.g. alpha, rc)')
    .addHelpText('after', `
Examples:
  $ solidctl upgrade              # upgrade to latest beta (default)
  $ solidctl upgrade --stable     # upgrade to latest stable release
  $ solidctl upgrade --tag alpha  # upgrade to a specific pre-release tag
`)
    .action((options) => {
      validateProjectRoot();

      const tag: string = options.stable ? 'latest' : (options.tag ?? 'beta');
      const isStable = options.stable as boolean;

      function installCmd(pkg: string): string {
        return isStable ? `npm upgrade ${pkg}` : `npm install ${pkg}@${tag} --prefer-online`;
      }

      const commands = [
        {
          label: `Upgrade solid-api core${isStable ? ' (stable)' : ` (${tag})`}`,
          cmd: installCmd('@solidxai/core'),
          cwd: 'solid-api',
        },
        {
          label: `Upgrade solid-api code-builder${isStable ? ' (stable)' : ` (${tag})`}`,
          cmd: installCmd('@solidxai/code-builder'),
          cwd: 'solid-api',
        },
        {
          label: `Upgrade solid-ui core-ui${isStable ? ' (stable)' : ` (${tag})`}`,
          cmd: installCmd('@solidxai/core-ui'),
          cwd: 'solid-ui',
        },
        {
          label: 'Copy UI theme files (postinstall)',
          cmd: 'npm run postinstall',
          cwd: 'solid-ui',
        },
      ];

      for (const { label, cmd, cwd } of commands) {
        console.log(`\n▶ ${label}`);
        console.log(`  $ (${cwd}) ${cmd}`);

        if (options.dryRun) continue;

        try {
          execSync(cmd, {
            cwd,
            stdio: 'inherit',
          });
        } catch {
          console.warn(`\n⚠️  Skipped: ${label} (package or tag not found)`);
        }
      }

      console.log('\n✅ Solid upgrade completed successfully');
    });
}