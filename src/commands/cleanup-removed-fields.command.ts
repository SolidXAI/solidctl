import { spawnSync } from 'child_process';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { validateProjectRoot } from '../helper';

type CleanupRemovedFieldsOptions = {
  name?: string;
  apply?: boolean;
};

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

export function registerCleanupRemovedFieldsCommand(program: Command) {
  program
    .command('cleanup-removed-fields')
    .description('Clean up fields marked for removal by delegating to the solid-api CLI')
    .requiredOption('-n, --name <model>', 'Model singularName to clean up')
    .option('--apply', 'Apply the cleanup instead of running a dry-run preview')
    .addHelpText('after', `
Examples:
  npx @solidxai/solidctl cleanup-removed-fields -n coverageProduct
  npx @solidxai/solidctl cleanup-removed-fields -n coverageProduct --apply`)
    .action((options: CleanupRemovedFieldsOptions) => {
      validateProjectRoot();

      
      const projectRoot = process.cwd();
      const solidApiDir = path.join(projectRoot, 'solid-api');
      const mainCliPath = path.join(solidApiDir, 'dist', 'main-cli.js');

      if (!options.name) {
        fail('Option --name <model> is required.');
      }

      if (!fs.existsSync(mainCliPath)) {
        fail(`solid-api CLI not found at ${mainCliPath}. Run "npx @solidxai/solidctl build" or "cd solid-api && npm run build" first.`);
      }

      const args = [
        path.relative(solidApiDir, mainCliPath),
        'migrate-removed-fields',
        '-n',
        options.name,
      ];

      if (options.apply) {
        args.push('-d', 'false');
      }

      console.log(`▶ Running removed-field cleanup for model "${options.name}"${options.apply ? ' (apply)' : ' (dry-run)'}`);
      const result = spawnSync(process.execPath, args, {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
      });

      if (result.error) {
        fail(`Failed to run cleanup-removed-fields: ${result.error.message}`);
      }

      if (result.status !== 0) {
        fail(`cleanup-removed-fields exited with code ${result.status}`);
      }

      console.log(`✔ cleanup-removed-fields completed for model "${options.name}"`);
    });
}
