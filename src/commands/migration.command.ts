import { spawnSync } from 'child_process';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { validateProjectRoot } from '../helper';

type MigrationOptions = {
  datasource?: string;
  module?: string;
};

function getNpxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function ensureDatasourceFile(solidApiDir: string, datasource: string) {
  const datasourceFile = path.join(solidApiDir, 'src', `typeorm-${datasource}-datasource.ts`);

  if (!fs.existsSync(datasourceFile)) {
    fail(`Datasource file not found: ${datasourceFile}`);
  }

  return datasourceFile;
}

function validateGenerateInputs(solidApiDir: string, datasource: string, moduleName: string | undefined, migrationName: string | undefined) {
  if (!moduleName) {
    fail('Option --module <module> is required for generate.');
  }

  if (!migrationName) {
    fail('Migration name is required for generate.');
  }

  const moduleDir = path.join(solidApiDir, 'src', moduleName);
  const entitiesDir = path.join(moduleDir, 'entities');
  const migrationsDir = path.join(moduleDir, 'migrations', datasource);

  if (!fs.existsSync(moduleDir) || !fs.statSync(moduleDir).isDirectory()) {
    fail(`Module directory not found: src/${moduleName}`);
  }

  if (!fs.existsSync(entitiesDir) || !fs.statSync(entitiesDir).isDirectory()) {
    fail(`Entities directory not found for module "${moduleName}": src/${moduleName}/entities`);
  }

  const entityFiles = fs.readdirSync(entitiesDir).filter((file) => file.endsWith('.entity.ts'));

  if (entityFiles.length === 0) {
    fail(`No *.entity.ts files found in src/${moduleName}/entities`);
  }

  fs.mkdirSync(migrationsDir, { recursive: true });

  console.log(`✅ Using datasource: src/typeorm-${datasource}-datasource.ts`);
  console.log(`✅ Module: ${moduleName}`);
  console.log(`✅ Entities found: ${entityFiles.length}`);
  console.log(`✅ Migrations directory: src/${moduleName}/migrations/${datasource}`);
  console.log(`➡ Generating migration: src/${moduleName}/migrations/${datasource}/${migrationName}`);

  return {
    migrationTargetPath: path.posix.join('src', moduleName, 'migrations', datasource, migrationName),
  };
}

function runTypeormCli(args: string[], solidApiDir: string, failureLabel: string) {
  const result = spawnSync(getNpxCommand(), args, {
    cwd: solidApiDir,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.error) {
    fail(`Failed to ${failureLabel}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${failureLabel} exited with code ${result.status}`);
  }
}

export function registerMigrationCommand(program: Command) {
  program
    .command('migration <action> [migrationName]')
    .description('Generate, run, or revert TypeORM migrations for a datasource')
    .option('-d, --datasource <datasource>', 'Datasource name (maps to src/typeorm-<datasource>-datasource.ts), required for generate/run/revert')
    .option('-m, --module <module>', 'Module name, required for generate')
    .addHelpText('after', `
Examples:
  solidctl migration -d default -m onboarding generate AddPreApplicationMaster
  solidctl migration -d default run
  solidctl migration -d default revert`)
    .action((action: string, migrationName: string | undefined, options: MigrationOptions) => {
      validateProjectRoot();

      const normalizedAction = action.trim().toLowerCase();
      const projectRoot = process.cwd();
      const solidApiDir = path.join(projectRoot, 'solid-api');

      if (normalizedAction === 'generate') {
        if (!options.datasource) {
          fail('Option --datasource <datasource> is required for generate.');
        }

        ensureDatasourceFile(solidApiDir, options.datasource);

        const { migrationTargetPath } = validateGenerateInputs(
          solidApiDir,
          options.datasource,
          options.module,
          migrationName,
        );

        runTypeormCli(
          [
            'typeorm-ts-node-commonjs',
            'migration:generate',
            '-d',
            `src/typeorm-${options.datasource}-datasource.ts`,
            migrationTargetPath,
          ],
          solidApiDir,
          'generate migration',
        );
        return;
      }

      if (normalizedAction === 'run') {
        if (!options.datasource) {
          fail('Option --datasource <datasource> is required for run.');
        }

        ensureDatasourceFile(solidApiDir, options.datasource);

        console.log(`✅ Using datasource: src/typeorm-${options.datasource}-datasource.ts`);
        console.log('➡ Running migrations...');
        runTypeormCli(
          ['typeorm-ts-node-commonjs', 'migration:run', '-d', `src/typeorm-${options.datasource}-datasource.ts`],
          solidApiDir,
          'run migrations',
        );
        return;
      }

      if (normalizedAction === 'revert') {
        if (!options.datasource) {
          fail('Option --datasource <datasource> is required for revert.');
        }

        ensureDatasourceFile(solidApiDir, options.datasource);

        console.log(`✅ Using datasource: src/typeorm-${options.datasource}-datasource.ts`);
        console.log('➡ Reverting last migration...');
        runTypeormCli(
          ['typeorm-ts-node-commonjs', 'migration:revert', '-d', `src/typeorm-${options.datasource}-datasource.ts`],
          solidApiDir,
          'revert migration',
        );
        return;
      }

      fail(`Unknown action "${action}". Expected generate, run, or revert.`);
    });
}