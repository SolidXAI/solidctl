import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from '../helper';

export function registerGenerateCommand(program: Command) {
  const generate = program
    .command('generate')
    .description('Generate code boilerplate from model metadata configurations');

  generate
    .command('model')
    .description('Generate code for a single model and its related models. Use this if you want to target a specific model, which may be slightly faster than generating the full module.')
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((_options, command) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const rawArgs = command.parent?.parent?.rawArgs ?? process.argv;
      const subIndex = rawArgs.lastIndexOf('model');
      const passthroughArgs = subIndex >= 0 ? rawArgs.slice(subIndex + 1) : [];

      console.log('▶ Running solidctl generate model');
      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, ['refresh-model', ...passthroughArgs], {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
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
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((_options, command) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const rawArgs = command.parent?.parent?.rawArgs ?? process.argv;
      const subIndex = rawArgs.lastIndexOf('module');
      const passthroughArgs = subIndex >= 0 ? rawArgs.slice(subIndex + 1) : [];

      console.log('▶ Running solidctl generate module');
      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, ['refresh-module', ...passthroughArgs], {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
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

      console.log('✔ solidctl generate module completed');
    });
}
