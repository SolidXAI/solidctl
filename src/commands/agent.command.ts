import { Command } from 'commander';
import { spawnSync } from 'child_process';
import path from 'path';
import { config as loadDotenv } from 'dotenv';
import { validateProjectRoot } from '../helper';

/**
 * Build a DATABASE_URL from the consuming project's individual DB env vars,
 * unless DATABASE_URL is already explicitly set.
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DEFAULT_DATABASE_HOST;
  const port = process.env.DEFAULT_DATABASE_PORT;
  const user = process.env.DEFAULT_DATABASE_USER;
  const password = process.env.DEFAULT_DATABASE_PASSWORD;
  const name = process.env.DEFAULT_DATABASE_NAME;

  if (host && port && user && name) {
    return `postgresql://${user}${password ? ':' + password : ''}@${host}:${port}/${name}`;
  }
  return undefined;
}

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

      // Load consuming project's .env (lives in solid-api/)
      loadDotenv({ path: path.join(projectRoot, 'solid-api', '.env') });

      const databaseUrl = resolveDatabaseUrl();
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        SOLIDX_PROJECT_ROOT: projectRoot,
        ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
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

      // Load consuming project's .env (lives in solid-api/)
      loadDotenv({ path: path.join(projectRoot, 'solid-api', '.env') });

      const databaseUrl = resolveDatabaseUrl();
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        SOLIDX_PROJECT_ROOT: projectRoot,
        ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
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
