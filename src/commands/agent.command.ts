import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from '../helper';

export function registerAgentCommand(program: Command) {
  const agent = program
    .command('agent')
    .description('SolidX AI Agent — start the server or run a single task');

  agent
    .command('start')
    .description('Start the AI agent server')
    .option('-p, --port <port>', 'Port number', '8765')
    .option('-H, --host <host>', 'Host to bind', '0.0.0.0')
    .option('-l, --log-level <level>', 'Logging level', 'INFO')
    .action((options) => {
      validateProjectRoot();
      const projectRoot = process.cwd();

      const env = {
        ...process.env,
        SOLIDX_PROJECT_ROOT: projectRoot,
        DATABASE_URL: process.env.DATABASE_URL,
      };

      console.log(`▶ Starting SolidX AI Agent server on ${options.host}:${options.port}`);

      const agentCommand = process.platform === 'win32' ? 'solidx-agent.cmd' : 'solidx-agent';
      const result = spawnSync(
        agentCommand,
        ['serve', '--port', options.port, '--host', options.host, '--log-level', options.logLevel],
        {
          cwd: projectRoot,
          stdio: 'inherit',
          env,
          shell: process.platform === 'win32',
        },
      );

      if (result.error) {
        console.error('❌ Failed to start agent server:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ Agent server exited with code', result.status);
        process.exit(result.status ?? 1);
      }
    });

  agent
    .command('run')
    .description('Run a single agent task')
    .argument('<task>', 'Task description')
    .option('-m, --mode <mode>', 'Tool mode: native or mcp')
    .option('-l, --log-level <level>', 'Logging level', 'INFO')
    .action((task, options) => {
      validateProjectRoot();
      const projectRoot = process.cwd();

      const env = {
        ...process.env,
        SOLIDX_PROJECT_ROOT: projectRoot,
        DATABASE_URL: process.env.DATABASE_URL,
      };

      const args = [task];
      if (options.mode) {
        args.push('--mode', options.mode);
      }
      args.push('--log-level', options.logLevel);

      console.log(`▶ Running SolidX AI Agent: ${task}`);

      const agentCommand = process.platform === 'win32' ? 'solidx-agent.cmd' : 'solidx-agent';
      const result = spawnSync(agentCommand, args, {
        cwd: projectRoot,
        stdio: 'inherit',
        env,
        shell: process.platform === 'win32',
      });

      if (result.error) {
        console.error('❌ Failed to run agent:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ Agent exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      console.log('✔ Agent task completed');
    });
}
