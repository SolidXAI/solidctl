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

/**
 * Build the bridged environment object for the MCP server.
 *
 * Mirrors the env-bridging logic in agent.command.ts — loads the consuming
 * project's solid-api/.env, resolves DATABASE_URL from individual DB vars
 * if needed, and sets SOLIDX_PROJECT_ROOT to the consuming project root.
 */
function buildBridgedEnv(): Record<string, string> {
  const projectRoot = process.cwd();

  // Load consuming project's .env (lives in solid-api/)
  loadDotenv({ path: path.join(projectRoot, 'solid-api', '.env') });

  const databaseUrl = resolveDatabaseUrl();

  return {
    ...(process.env as Record<string, string>),
    SOLIDX_PROJECT_ROOT: projectRoot,
    ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
    ...(process.env.BASE_URL ? { BASE_URL: process.env.BASE_URL } : {}),
    ...(process.env.APP_ENCRYPTION_KEY ? { APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY } : {}),
  };
}

/**
 * Print which critical env vars were bridged vs. missing.
 */
function printBridgeSummary(env: Record<string, string>): void {
  const bridgedKeys = ['DATABASE_URL', 'SOLIDX_PROJECT_ROOT', 'BASE_URL', 'APP_ENCRYPTION_KEY'];
  const bridged = bridgedKeys.filter((k) => env[k]);
  const missing = bridgedKeys.filter((k) => !env[k]);
  console.log(`✔ Bridged env: ${bridged.join(', ') || 'none'}`);
  if (missing.length) console.warn(`⚠ Missing env: ${missing.join(', ')}`);
}

export function registerMcpCommand(program: Command) {
  const mcp = program
    .command('mcp')
    .description('SolidX MCP Server (Streamable HTTP) — for remote clients (Cursor, Codex, cloud desktops)');

  mcp
    .command('start')
    .description('Start the MCP server using Streamable HTTP transport')
    .option('-p, --port <port>', 'Port number', '9000')
    .option('-H, --host <host>', 'Host to bind', '0.0.0.0')
    .option('-l, --log-level <level>', 'Logging level', 'INFO')
    .option('--mount-path <path>', 'Path under which to mount the MCP app', '/mcp')
    .action((options) => {
      validateProjectRoot();
      const env = buildBridgedEnv();

      if (!env.DATABASE_URL) {
        console.error(
          '❌ DATABASE_URL is required for MCP mode.\n' +
          '   It is needed to validate API keys and write audit logs.\n' +
          '   Set it in your solid-api/.env or environment.',
        );
        process.exit(1);
      }

      printBridgeSummary(env);
      console.log(`▶ Starting SolidX MCP Server on ${options.host}:${options.port}`);

      const agentCommand = process.platform === 'win32' ? 'solidx-agent.cmd' : 'solidx-agent';
      const result = spawnSync(
        agentCommand,
        [
          'mcp-remote',
          '--host', options.host,
          '--port', options.port,
          '--log-level', options.logLevel,
          '--mount-path', options.mountPath,
        ],
        {
          cwd: env.SOLIDX_PROJECT_ROOT,
          stdio: 'inherit',
          env,
          shell: process.platform === 'win32',
        },
      );

      if (result.error) {
        console.error('❌ Failed to start MCP server:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ MCP server exited with code', result.status);
        process.exit(result.status ?? 1);
      }
    });
}
