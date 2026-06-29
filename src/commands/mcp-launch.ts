import { spawn } from 'child_process';
import path from 'path';
import { config as loadDotenv } from 'dotenv';
import { normalizeDatabaseUrl } from '../helper';
import {
  checkAgentUpdate,
  ensureAgentInstalled,
  ensureAgentInstalledLocal,
  getAgentVersion,
  printAgentVersion,
} from './agent-helper';

export interface McpOptions {
  port: string;
  host: string;
  logLevel: string;
  mountPath: string;
  local?: boolean;
}

export const MCP_DEFAULT_OPTIONS: McpOptions = {
  port: '9000',
  host: '0.0.0.0',
  logLevel: 'INFO',
  mountPath: '/mcp',
};

/**
 * Build a DATABASE_URL from the consuming project's individual DB env vars,
 * unless DATABASE_URL is already explicitly set.
 *
 * If SOLID_CORE_DB_TYPE is set to "mssql", the URL is built for
 * SQL Server using mssql+pyodbc. Otherwise it defaults to PostgreSQL.
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) {
    return normalizeDatabaseUrl(process.env.DATABASE_URL);
  }

  const host = process.env.DEFAULT_DATABASE_HOST;
  const port = process.env.DEFAULT_DATABASE_PORT;
  const user = process.env.DEFAULT_DATABASE_USER;
  const password = process.env.DEFAULT_DATABASE_PASSWORD;
  const name = process.env.DEFAULT_DATABASE_NAME;
  const dbType = (process.env.SOLID_CORE_DB_TYPE || 'postgres').toLowerCase();

  if (!host || !port || !user || !name) return undefined;

  const encodedPw = password ? ':' + encodeURIComponent(password) : '';

  if (dbType === 'mssql') {
    return `mssql+pyodbc://${user}${encodedPw}@${host}:${port}/${name}?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes&Encrypt=no`;
  }

  if (dbType === 'mysql') {
    return `mysql+pymysql://${user}${encodedPw}@${host}:${port}/${name}`;
  }

  return `postgresql://${user}${encodedPw}@${host}:${port}/${name}`;
}

/**
 * Build the bridged environment object for the MCP server.
 *
 * Loads the consuming project's solid-api/.env, resolves DATABASE_URL from
 * individual DB vars if needed, and sets SOLIDX_PROJECT_ROOT to the consuming
 * project root. Returns a new object instead of mutating process.env so it is
 * safe to reuse inside a long-running supervisor.
 */
export function buildBridgedEnv(
  projectRoot = process.cwd(),
): Record<string, string> {
  loadDotenv({ path: path.join(projectRoot, 'solid-api', '.env') });

  const databaseUrl = resolveDatabaseUrl();

  return {
    ...(process.env as Record<string, string>),
    SOLIDX_PROJECT_ROOT: projectRoot,
    ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
    ...(process.env.BASE_URL ? { BASE_URL: process.env.BASE_URL } : {}),
    ...(process.env.FRONTEND_BASE_URL
      ? { FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL }
      : {}),
    ...(process.env.APP_ENCRYPTION_KEY
      ? { APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY }
      : {}),
  };
}

/**
 * Print which critical env vars were bridged vs. missing.
 */
export function printBridgeSummary(env: Record<string, string>): void {
  const bridgedKeys = [
    'DATABASE_URL',
    'SOLIDX_PROJECT_ROOT',
    'BASE_URL',
    'FRONTEND_BASE_URL',
    'APP_ENCRYPTION_KEY',
  ];
  const bridged = bridgedKeys.filter((k) => env[k]);
  const missing = bridgedKeys.filter((k) => !env[k]);
  console.log(`✔ Bridged env: ${bridged.join(', ') || 'none'}`);
  if (missing.length) console.warn(`⚠ Missing env: ${missing.join(', ')}`);
}

export interface McpLaunchConfig {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

/**
 * Resolve the agent binary, build the bridged env, and return the full launch
 * config for the MCP server. Performs agent update check and install before
 * returning. Validates that DATABASE_URL is present.
 *
 * Throws if DATABASE_URL is missing.
 */
export async function resolveMcpLaunchConfig(
  options: McpOptions,
  projectRoot = process.cwd(),
): Promise<McpLaunchConfig> {
  await checkAgentUpdate({
    isLocal: Boolean(options.local),
    exitMode: 'throw',
  });

  const env = buildBridgedEnv(projectRoot);

  if (!env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is required for MCP mode.\n' +
        '   It is needed to validate API keys and write audit logs.\n' +
        '   Set it in your solid-api/.env or environment.',
    );
  }

  const agentCommand = options.local
    ? ensureAgentInstalledLocal('throw')
    : ensureAgentInstalled('throw');
  printAgentVersion(agentCommand);

  return {
    command: agentCommand,
    args: [
      'mcp-remote',
      '--host',
      options.host,
      '--port',
      options.port,
      '--log-level',
      options.logLevel,
      '--mount-path',
      options.mountPath,
    ],
    cwd: env.SOLIDX_PROJECT_ROOT,
    env,
  };
}

/**
 * Print agent version via the shared helper (re-exported for convenience).
 */
export { getAgentVersion, printAgentVersion };

/**
 * Spawn the MCP server as a long-running child process with piped stdio.
 * Intended for use inside a supervisor that manages the process lifecycle.
 */
export function spawnMcpServer(launchConfig: McpLaunchConfig) {
  return spawn(launchConfig.command, launchConfig.args, {
    cwd: launchConfig.cwd,
    env: launchConfig.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
  });
}
