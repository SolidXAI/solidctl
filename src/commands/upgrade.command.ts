import { Command } from 'commander';
import { execSync } from 'child_process';
import { validateProjectRoot } from '../helper';
import { syncCoreModuleIcon } from './create-app/helpers';

type UpgradeCommandStep = {
  label: string;
  cmd: string;
  cwd: 'solid-api' | 'solid-ui';
};

export function registerUpgradeCommand(program: Command) {
  program
    .command('upgrade')
    .description('Upgrade Solid API and UI dependencies (defaults to beta pre-release)')
    .option('--core', 'Upgrade solid-core')
    .option('--ui', 'Upgrade solid-ui')
    .option('--code-builder', 'Upgrade solid-code-builder')
    .option('--dry-run', 'Show commands without executing')
    .option('--stable', 'Upgrade to latest stable release instead of beta')
    .option('--alpha', 'Upgrade to latest alpha pre-release instead of beta')
    .option('--tag <tag>', 'Install a specific pre-release tag (e.g. alpha, rc)')
    .addHelpText('after', `
Examples:
  $ solidctl upgrade              # upgrade to latest beta (default)
  $ solidctl upgrade --alpha      # upgrade to latest alpha
  $ solidctl upgrade --core       # upgrade only solid-core
  $ solidctl upgrade --ui         # upgrade only solid-ui
  $ solidctl upgrade --code-builder  # upgrade only solid-code-builder
  $ solidctl upgrade --stable     # upgrade to latest stable release
  $ solidctl upgrade --tag alpha  # upgrade to a specific pre-release tag
`)
    .action((options) => {
      validateProjectRoot();

      const resolvedTag = options.stable ? 'latest' : options.alpha ? 'alpha' : (options.tag ?? 'beta');
      const tag: string = resolvedTag;
      const isStable = options.stable as boolean;
      const upgradeCore = Boolean(options.core);
      const upgradeUi = Boolean(options.ui);
      const upgradeCodeBuilder = Boolean(options.codeBuilder);
      const nothingSelected = !upgradeCore && !upgradeUi && !upgradeCodeBuilder;

      const doCore = upgradeCore || nothingSelected;
      const doUi = upgradeUi || nothingSelected;
      const doCodeBuilder = upgradeCodeBuilder || nothingSelected;

      function installCmd(pkg: string): string {
        return isStable ? `npm upgrade ${pkg}` : `npm install ${pkg}@${tag} --prefer-online`;
      }

      const commands: UpgradeCommandStep[] = [];

      if (doCore) {
        commands.push({
          label: `Upgrade solid-api core${isStable ? ' (stable)' : ` (${tag})`}`,
          cmd: installCmd('@solidxai/core'),
          cwd: 'solid-api',
        });
      }

      if (doCodeBuilder) {
        commands.push({
          label: `Upgrade solid-api code-builder${isStable ? ' (stable)' : ` (${tag})`}`,
          cmd: installCmd('@solidxai/code-builder'),
          cwd: 'solid-api',
        });
      }

      if (doUi) {
        commands.push(
          {
            label: `Upgrade solid-ui core-ui${isStable ? ' (stable)' : ` (${tag})`}`,
            cmd: installCmd('@solidxai/core-ui'),
            cwd: 'solid-ui',
          },
          {
            label: 'Copy UI theme files (postinstall)',
            cmd: 'npm run postinstall',
            cwd: 'solid-ui',
          }
        );
      }

      if (!options.dryRun) {
        if (doCore || doCodeBuilder) {
          execSync('rm -f package-lock.json && rm -rf node_modules/@solidxai', { cwd: 'solid-api' });
        }

        if (doUi) {
          execSync('rm -f package-lock.json && rm -rf node_modules/@solidxai', { cwd: 'solid-ui' });
        }
      }

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

      if (!options.dryRun && doCore) {
        try {
          const installed = syncCoreModuleIcon();
          console.log(installed
            ? '\n▶ Installed Core Module icon in solid-api/media-files-storage'
            : '\n▶ Core Module icon already exists; left it unchanged');
        } catch (error) {
          console.warn(`\n⚠️  Core Module icon sync skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log('\n✅ Solid upgrade completed successfully');
    });
}
