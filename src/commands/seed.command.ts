import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from '../helper';

export function registerSeedCommand(program: Command) {
  program
    .command('seed')
    .description('Bootstrap SolidX metadata, settings, and the system user')
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((_options, command) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const rawArgs = command.parent ? command.parent.rawArgs : process.argv;
      const seedIndex = rawArgs.lastIndexOf('seed');
      const passthroughArgs = seedIndex >= 0 ? rawArgs.slice(seedIndex + 1) : [];
      const args = ['seed', ...passthroughArgs];

      // console.log('▶ Running solid seed');
      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, args, {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32' ? true : false, 
        });

      if (result.error) {
        console.error('❌ Failed to run solid seed:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ solid seed exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      // console.log('✔ solid seed completed');
    });
}
