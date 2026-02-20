import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from '../helper';

export function registerMcpCommand(program: Command) {
  program
    .command('mcp')
    .description('Used to run the SolidX MCP server')
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((_options, command) => {
      validateProjectRoot();
      const projectRoot = process.cwd();
      const solidApiDir = `${projectRoot}/solid-api`;

      const rawArgs = command.parent ? command.parent.rawArgs : process.argv;
      const mcpIndex = rawArgs.lastIndexOf('mcp');
      const passthroughArgs = mcpIndex >= 0 ? rawArgs.slice(mcpIndex + 1) : [];
      const args = ['mcp', ...passthroughArgs];

      console.log('▶ Running solid mcp');
      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, args, {
        cwd: solidApiDir,
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32' ? true : false, 
        });

      if (result.error) {
        console.error('❌ Failed to run solid mcp:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ solid mcp exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      console.log('✔ solid mcp completed');
    });
}
