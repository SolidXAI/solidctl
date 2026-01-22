import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from 'src/helper';

export function registerSeedCommand(program: Command) {
  program
    .command('seed')
    .description('Bootstrap SolidX metadata, settings, and the system user')
    .action(() => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      console.log('▶ Running solid seed');
      const result = spawnSync('solid', ['seed'], {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
      });

      if (result.error) {
        console.error('❌ Failed to run solid seed:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ solid seed exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      console.log('✔ solid seed completed');
    });
}
