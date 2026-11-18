import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { getSolidCommandEnv, validateProjectRoot } from '../helper';
import { getCoreModeEnv } from '../core-mode';

/**
 * Run `solid seed` inside the project's solid-api directory.
 *
 * Exported so other commands (e.g. `solidctl setup-app`) can seed in-process
 * instead of shelling out to `solidctl seed`.
 */
export function runSeed(projectRoot: string, passthroughArgs: string[] = [], extraEnv: Record<string, string> = {}) {
  const solidApiDir = `${projectRoot}/solid-api`;
  const args = ['seed', ...passthroughArgs];

  const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
  const result = spawnSync(solidCommand, args, {
    cwd: solidApiDir,
    stdio: 'inherit',
    env: { ...getSolidCommandEnv(), ...extraEnv },
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
}

export function registerSeedCommand(program: Command) {
  program
    .command('seed')
    .description('Bootstrap SolidX metadata, settings, and the system user')
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .addHelpText(
      'after',
      '\nOptions forwarded to the Solid CLI:\n' +
        '  -v, --verbose  Show detailed Nest/Winston logs during seeding\n' +
        '  --core         Seed solid-core metadata from $SOLID_CORE_MODULE_PATH (core developers)\n',
    )
    .action((_options, command) => {
      validateProjectRoot();

      const rawArgs = command.parent ? command.parent.rawArgs : process.argv;
      const seedIndex = rawArgs.lastIndexOf('seed');
      const passthroughArgs = seedIndex >= 0 ? rawArgs.slice(seedIndex + 1) : [];

      const coreMode = passthroughArgs.includes('--core');
      const forwarded = passthroughArgs.filter((arg) => arg !== '--core');
      const coreEnv = coreMode ? getCoreModeEnv(process.cwd()) : {};
      runSeed(process.cwd(), forwarded, coreEnv);
    });
}
