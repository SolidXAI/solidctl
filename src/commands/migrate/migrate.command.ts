import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { validateProjectRoot } from '../../helper';
import { runMigrations } from './migration-runner';

export function registerMigrateCommand(program: Command) {
  program
    .command('migrate')
    .description('Apply boilerplate migrations to keep your SolidX project up to date')
    .option('--dry-run', 'Preview migrations without making any changes')
    .option('--list', 'Show the status of all available migrations and exit')
    .option('--id <migrationId>', 'Apply only the migration matching this ID')
    .option(
      '--force',
      'Re-apply migrations even if already recorded as applied',
    )
    .option(
      '-p, --project <path>',
      'Path to the SolidX project root (default: current directory)',
    )
    .action(async (options: {
      dryRun?: boolean;
      list?: boolean;
      id?: string;
      force?: boolean;
      project?: string;
    }) => {
      const projectPath = options.project
        ? path.resolve(options.project)
        : process.cwd();

      if (options.project) {
        const required = ['solid-api/package.json', 'solid-ui/package.json'];
        for (const file of required) {
          if (!fs.existsSync(path.join(projectPath, file))) {
            console.error(
              chalk.red(
                `Not a valid SolidX project root: ${projectPath}\nMissing: ${file}`,
              ),
            );
            process.exit(1);
          }
        }
      } else {
        validateProjectRoot();
      }

      await runMigrations(projectPath, {
        dryRun: options.dryRun,
        list: options.list,
        id: options.id,
        force: options.force,
      });
    });
}
