import { Command } from 'commander';
import { execSync } from 'child_process';
import { validateProjectRoot } from '../helper';

export function registerUpgradeCommand(program: Command) {
  program
    .command('upgrade')
    .description('Upgrade Solid API and UI dependencies')
    .option('--dry-run', 'Show commands without executing')
    .option('--tag <tag>', 'Install a pre-release tag instead of latest stable (e.g. beta, alpha, rc)')
    .addHelpText('after', `
Examples:
  $ solidctl upgrade              # upgrade to latest stable
  $ solidctl upgrade --tag beta   # upgrade to latest beta pre-release
  $ solidctl upgrade --tag alpha  # upgrade to latest alpha pre-release
`)
    .action((options) => {
      validateProjectRoot();

      const tag = options.tag as string | undefined;

      function installCmd(pkg: string): string {
        return tag ? `npm install ${pkg}@${tag}` : `npm upgrade ${pkg}`;
      }

      const commands = [
        {
          label: `Upgrade solid-api core${tag ? ` (${tag})` : ''}`,
          cmd: installCmd('@solidxai/core'),
          cwd: 'solid-api',
        },
        {
          label: `Upgrade solid-api code-builder${tag ? ` (${tag})` : ''}`,
          cmd: installCmd('@solidxai/code-builder'),
          cwd: 'solid-api',
        },
        {
          label: `Upgrade solid-ui core-ui${tag ? ` (${tag})` : ''}`,
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

        execSync(cmd, {
          cwd,
          stdio: 'inherit',
        });
      }

      console.log('\n✅ Solid upgrade completed successfully');
    });
}