import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from '../helper';

export function registerTestCommand(program: Command) {
  program
    .command('test')
    .description('Proxy to solid test')
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((_options, command) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const rawArgs = command.parent ? command.parent.rawArgs : process.argv;
      const cmdIndex = rawArgs.lastIndexOf('test');
      const passthroughArgs = cmdIndex >= 0 ? rawArgs.slice(cmdIndex + 1) : [];
      const args = ['test', ...passthroughArgs];

      console.log('▶ Running solid test');
      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, args, {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32' ? true : false,
      });

      if (result.error) {
        console.error('❌ Failed to run solid test:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ solid test exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      console.log('✔ solid test completed');
    });
}
