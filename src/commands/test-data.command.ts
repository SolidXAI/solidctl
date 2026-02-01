import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from 'src/helper';

export function registerTestDataCommand(program: Command) {
  program
    .command('test-data')
    .description('Proxy to solid test-data')
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((_options, command) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const rawArgs = command.parent ? command.parent.rawArgs : process.argv;
      const cmdIndex = rawArgs.lastIndexOf('test-data');
      const passthroughArgs = cmdIndex >= 0 ? rawArgs.slice(cmdIndex + 1) : [];
      const args = ['test-data', ...passthroughArgs];

      console.log('▶ Running solid test-data');
      const result = spawnSync('solid', args, {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
      });

      if (result.error) {
        console.error('❌ Failed to run solid test-data:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ solid test-data exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      console.log('✔ solid test-data completed');
    });
}
