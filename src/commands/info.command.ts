import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from 'src/helper';

interface InfoOptions {
  detailed?: boolean;
}

export function registerInfoCommand(program: Command) {
  program
    .command('info')
    .description('Prints information about the consuming project')
    .option('-d, --detailed', 'Print more details about the consuming project')
    .action((options: InfoOptions) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const args = ['info'];
      if (options.detailed) {
        args.push('-d');
      }

      console.log('▶ Running solid info');
      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, args, {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32' ? true : false, 
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