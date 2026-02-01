import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from 'src/helper';

export function registerInfoCommand(program: Command) {
  program
    .command('info')
    .description('Prints information about the consuming project')
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((_options, command) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const rawArgs = command.parent ? command.parent.rawArgs : process.argv;
      const infoIndex = rawArgs.lastIndexOf('info');
      const passthroughArgs = infoIndex >= 0 ? rawArgs.slice(infoIndex + 1) : [];
      const args = ['info', ...passthroughArgs];

      console.log('▶ Running solid info');
      const result = spawnSync('solid', args, {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
      });

      if (result.error) {
        console.error('❌ Failed to run solid info:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ solid info exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      console.log('✔ solid info completed');
    });
}
