import { Command } from 'commander';
import { execSync } from 'child_process';
import { validateProjectRoot } from '../helper';

export function registerUpgradeCommand(program: Command) {
  program
    .command('upgrade')
    .description('Upgrade Solid API and UI dependencies')
    .option('--dry-run', 'Show commands without executing')
    .action((options) => {
      validateProjectRoot();
      const commands = [
        {
          label: 'Upgrade solid-api core',
          cmd: 'npm upgrade @solidxai/core',
          cwd: 'solid-api',
        },
        {
          label: 'Upgrade solid-api code-builder',
          cmd: 'npm upgrade @solidxai/code-builder',
          cwd: 'solid-api',
        },
        {
          label: 'Upgrade solid-ui core-ui',
          cmd: 'npm upgrade @solidxai/core-ui',
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