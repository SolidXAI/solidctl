import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { getSolidCommandEnv, validateProjectRoot } from '../helper';
import {
  EmbeddedServerHandle,
  getEmbeddedConfig,
  isEmbeddedProject,
  isEmbeddedServerRunning,
  startEmbeddedServer,
  stopEmbeddedServer,
} from '../db/embedded';

export function registerSeedCommand(program: Command) {
  program
    .command('seed')
    .description('Bootstrap SolidX metadata, settings, and the system user')
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(async (_options, command) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const rawArgs = command.parent ? command.parent.rawArgs : process.argv;
      const seedIndex = rawArgs.lastIndexOf('seed');
      const passthroughArgs = seedIndex >= 0 ? rawArgs.slice(seedIndex + 1) : [];
      const args = ['seed', ...passthroughArgs];

      // For embedded projects, ensure the database is running. If it is not
      // already up (e.g. via `start:dev`), start it just for the seed run.
      let embeddedServer: EmbeddedServerHandle | null = null;
      if (isEmbeddedProject(projectRoot)) {
        const config = getEmbeddedConfig(projectRoot);
        const alreadyRunning = await isEmbeddedServerRunning(config);
        if (!alreadyRunning) {
          console.log('▶ Starting embedded database for seed...');
          try {
            embeddedServer = startEmbeddedServer(config);
            await embeddedServer.ready;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('❌ Failed to start embedded database:', message);
            process.exit(1);
          }
        }
      }

      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, args, {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: getSolidCommandEnv(),
        shell: process.platform === 'win32' ? true : false,
      });

      if (embeddedServer) {
        await stopEmbeddedServer(embeddedServer.child);
      }

      if (result.error) {
        console.error('❌ Failed to run solid seed:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ solid seed exited with code', result.status);
        process.exit(result.status ?? 1);
      }
    });
}
