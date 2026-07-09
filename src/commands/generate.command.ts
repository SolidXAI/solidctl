import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { kebabCase } from 'lodash';
import { getSolidCommandEnv, validateProjectRoot } from '../helper';
import { generateSolidUiModule } from './generate-ui-module';

export function registerGenerateCommand(program: Command) {
  const generate = program
    .command('generate')
    .description('Generate code boilerplate from model metadata configurations');

  generate
    .command('model')
    .description('Generate code for a single model and its related models. Use this if you want to target a specific model, which may be slightly faster than generating the full module.')
    .requiredOption('-n, --name <modelName>', 'Model name (singularName) from the ss_model_metadata table')
    .option('-d, --dryRun', 'Dry run the command')
    .action((options) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const passthroughArgs = [`--name=${options.name}`, ...(options.dryRun ? ['--dryRun=true'] : [])];

      console.log('▶ Running solidctl generate model');
      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, ['refresh-model', ...passthroughArgs], {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: getSolidCommandEnv(),
        shell: process.platform === 'win32' ? true : false,
      });

      if (result.error) {
        console.error('❌ Failed to run solidctl generate model:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ solidctl generate model exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      console.log('✔ solidctl generate model completed');
    });

  generate
    .command('module')
    .description('Generate code for an entire module, including all models within it. This is the recommended way to generate code.')
    .requiredOption('-n, --name <moduleName>', 'Module name from the ss_module_metadata table')
    .option('-d, --dryRun', 'Dry run the command')
    .action((options) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const passthroughArgs = [`--name=${options.name}`, ...(options.dryRun ? ['--dryRun=true'] : [])];

      console.log('▶ Running solidctl generate module');
      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, ['refresh-module', ...passthroughArgs], {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: getSolidCommandEnv(),
        shell: process.platform === 'win32' ? true : false,
      });

      if (result.error) {
        console.error('❌ Failed to run solidctl generate module:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ solidctl generate module exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      generateSolidUiModule(projectRoot, kebabCase(options.name));

      console.log('✔ solidctl generate module completed');
    });

  generate
    .command('ui-module')
    .description('Generate only the solid-ui module scaffold (no database connection required). Useful when API code was generated in-process.')
    .requiredOption('-n, --name <moduleName>', 'Module name')
    .action((options) => {
      validateProjectRoot();
      const projectRoot = process.cwd();

      console.log('▶ Running solidctl generate ui-module');
      generateSolidUiModule(projectRoot, kebabCase(options.name));
      console.log('✔ solidctl generate ui-module completed');
    });
}
