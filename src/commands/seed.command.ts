import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from 'src/helper';

interface SeedOptions {
  conf?: string;
  seeder: string;
}

export function registerSeedCommand(program: Command) {
  program
    .command('seed')
    .description('Bootstrap SolidX metadata, settings, and the system user')
    .option('-c, --conf [configuration json]', 'A configuration json, pass a valid json string.')
    .option('-s, --seeder [seeder name]', 'The seeder to run.', 'ModuleMetadataSeederService')
    .action((options: SeedOptions) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const args = ['seed'];
      if (options.seeder) {
        args.push('-s', options.seeder);
      }
      if (options.conf) {
        args.push('-c', options.conf);
      }

      console.log('▶ Running solid seed');
      const result = spawnSync('solid', args, {
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
