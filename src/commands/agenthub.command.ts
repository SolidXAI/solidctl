import { superviseRuntime } from '../helpers/runtime-supervisor';
import { ChildProcess, spawn, spawnSync } from 'child_process';
import fs from 'fs';
import { Command } from 'commander';
import path from 'path';
import { config as loadDotenv, parse as parseDotenv } from 'dotenv';
import { validateProjectRoot } from '../helper';
import { AgentCommandExit } from './agent-helper';
import { checkAgentHubUpdate, ensureAgentHubInstalled, getAgentHubVersion } from './agenthub-helper';
import { buildBridgedEnv } from './mcp-launch';

export const AGENT_HUB_DEFAULT_PORT = '9001';
export const AGENT_HUB_LOG_LEVELS = ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'] as const;

export type AgentHubOptions = {
  port: string;
  host?: string;
  local?: boolean;
  plain?: boolean;
  env?: string[];
  logLevel?: string;
};

export type AgentHubLaunchConfig = {
  command: string;
  env: Record<string, string>;
  port: string;
  logLevel?: string;
};

export function parseEnvAssignments(assignments: string[] = [], flag = '--env'): Record<string, string> {
  return assignments.reduce<Record<string, string>>((env, assignment) => {
    const separator = assignment.indexOf('=');
    const key = separator === -1 ? '' : assignment.slice(0, separator);
    const value = separator === -1 ? '' : assignment.slice(separator + 1);

    if (separator === -1 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`Invalid ${flag} assignment "${assignment}". Expected KEY=VALUE.`);
    }

    env[key] = value;
    return env;
  }, {});
}

export function buildAgentHubEnv(projectRoot: string, host?: string): Record<string, string> {
  loadDotenv({ path: path.join(projectRoot, '.env'), quiet: true });
  const env = buildBridgedEnv(projectRoot);
  env.SOLIDX_API_BASE_URL ||= env.BASE_URL;
  env.AGENT_HUB_MANAGER_BIND_HOST = host || env.AGENT_HUB_MANAGER_BIND_HOST || '127.0.0.1';
  const missing = ['DATABASE_URL', 'SOLIDX_API_BASE_URL'].filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`AgentHub requires ${missing.join(', ')}. Set them in .env, solid-api/.env, or your environment (BASE_URL and DEFAULT_DATABASE_* are also supported).`);
  }
  return env;
}

export function parseAgentHubPort(port: string, flag = '--port'): string {
  if (!/^\d+$/.test(port) || +port < 1 || +port > 65535) {
    throw new Error(`${flag} must be an integer between 1 and 65535.`);
  }
  return port;
}

export function parseAgentHubLogLevel(logLevel: string | undefined, flag = '--log-level'): string | undefined {
  if (!logLevel) return undefined;
  const normalized = logLevel.toUpperCase();
  if (!AGENT_HUB_LOG_LEVELS.includes(normalized as (typeof AGENT_HUB_LOG_LEVELS)[number])) {
    throw new Error(`${flag} must be one of ${AGENT_HUB_LOG_LEVELS.join(', ')}.`);
  }
  return normalized;
}

/** Honor the runtime checkout's AGENT_HUB_LOG_LEVEL when the OS env does not set it. */
export function applyAgentHubRuntimeLogLevel(): void {
  const runtimePath = process.env.AGENT_HUB_RUNTIME_PATH;
  const runtimeEnvPath = runtimePath ? path.join(path.resolve(runtimePath), '.env') : undefined;
  if (runtimeEnvPath && fs.existsSync(runtimeEnvPath) && !process.env.AGENT_HUB_LOG_LEVEL) {
    const runtimeEnv = parseDotenv(fs.readFileSync(runtimeEnvPath));
    if (runtimeEnv.AGENT_HUB_LOG_LEVEL) process.env.AGENT_HUB_LOG_LEVEL = runtimeEnv.AGENT_HUB_LOG_LEVEL;
  }
}

export function assembleAgentHubEnv(
  projectRoot: string,
  options: { host?: string; env?: string[]; logLevel?: string } = {},
): Record<string, string> {
  applyAgentHubRuntimeLogLevel();
  const env = buildAgentHubEnv(projectRoot, options.host);
  Object.assign(env, parseEnvAssignments(options.env));
  if (options.logLevel) env.AGENT_HUB_LOG_LEVEL = options.logLevel;
  return env;
}

export function agentHubManagerArgs(port: string, logLevel?: string): string[] {
  const args = ['manager', '--port', port];
  if (logLevel) args.push('--log-level', logLevel);
  return args;
}

export function spawnAgentHubManager(
  command: string,
  projectRoot: string,
  env: Record<string, string>,
  port: string,
  logLevel?: string,
): ChildProcess {
  return spawn(command, agentHubManagerArgs(port, logLevel), {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
  });
}

export async function resolveAgentHubLaunchConfig(
  projectRoot: string,
  options: { port: string; host?: string; local?: boolean; env?: string[]; logLevel?: string },
): Promise<AgentHubLaunchConfig> {
  const env = assembleAgentHubEnv(projectRoot, options);
  await checkAgentHubUpdate({ isLocal: Boolean(options.local) });
  const command = ensureAgentHubInstalled(options);
  return { command, env, port: options.port, logLevel: options.logLevel };
}

export function runAgentHubManager(command: string, projectRoot: string, env: Record<string, string>, port: string,
                                  logLevel?: string, plain?: boolean): Promise<number> {
  return superviseRuntime(command, agentHubManagerArgs(port, logLevel), {
    cwd: projectRoot, env, label: 'AgentHub manager', plain,
  });
}

export type AgentHubSearxngOptions = {
  local?: boolean;
  env?: string[];
};

/** Load project .env files when present; SearXNG is machine-wide, so a project root is optional. */
export function buildSearxngEnv(projectRoot: string, assignments: string[] = []): Record<string, string> {
  loadDotenv({ path: path.join(projectRoot, '.env'), quiet: true });
  loadDotenv({ path: path.join(projectRoot, 'solid-api', '.env'), quiet: true });
  return { ...(process.env as Record<string, string>), ...parseEnvAssignments(assignments) };
}

export function runAgentHubSearxng(command: string, args: string[], env: Record<string, string>): number {
  // Published runtimes older than the SearXNG commands reject `searxng` as an unknown command.
  const probe = spawnSync(command, ['searxng', '--help'], { env, stdio: 'pipe', timeout: 15_000 });
  if (probe.status !== 0) {
    throw new Error(`solidx-agenthub-runtime v${getAgentHubVersion(command)} does not include the searxng commands. ` +
      'Upgrade the runtime, or use --local with AGENT_HUB_RUNTIME_PATH set.');
  }
  const result = spawnSync(command, ['searxng', ...args], { env, stdio: 'inherit' });
  if (result.error) throw new Error(`Failed to run agenthub-runtime searxng: ${result.error.message}`);
  return result.status ?? 1;
}

function parseNonNegativeInteger(value: string, flag: string): string {
  if (!/^\d+$/.test(value)) throw new Error(`${flag} must be a non-negative integer.`);
  return value;
}

function registerSearxngCommands(agenthub: Command) {
  const searxng = agenthub
    .command('searxng')
    .description('Manage the local SearXNG container used by the AgentHub web_search tool (requires Docker)');

  const subcommand = (name: string, description: string) => searxng.command(name)
    .description(description)
    .option('--local', 'Use the runtime from AGENT_HUB_RUNTIME_PATH in editable mode')
    .option('--env <KEY=VALUE>', 'Pass an environment variable to the runtime, e.g. AGENT_HUB_SEARXNG_PORT=8899 (repeatable)',
      (value, previous: string[] = []) => [...previous, value], []);

  const run = (options: AgentHubSearxngOptions, buildArgs: () => string[]) => {
    try {
      const args = buildArgs();
      const env = buildSearxngEnv(process.cwd(), options.env);
      const command = ensureAgentHubInstalled(options);
      process.exitCode = runAgentHubSearxng(command, args, env);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  };

  subcommand('up', 'Create or start the agenthub-searxng container and wait until it is healthy')
    .option('--wait <seconds>', 'Seconds to wait for the health check (0 to skip)', '60')
    .action((options: AgentHubSearxngOptions & { wait: string }) =>
      run(options, () => ['up', '--wait', parseNonNegativeInteger(options.wait, '--wait')]));
  subcommand('down', 'Remove the agenthub-searxng container (settings are kept)')
    .action((options: AgentHubSearxngOptions) => run(options, () => ['down']));
  subcommand('status', 'Show container state and health; exits non-zero when not healthy')
    .action((options: AgentHubSearxngOptions) => run(options, () => ['status']));
  subcommand('logs', 'Print recent container logs')
    .option('--tail <lines>', 'Number of lines', '100')
    .action((options: AgentHubSearxngOptions & { tail: string }) =>
      run(options, () => ['logs', '--tail', parseNonNegativeInteger(options.tail, '--tail')]));
}

export function registerAgentHubCommand(program: Command) {
  const agenthub = program
    .command('agenthub')
    .description('SolidX AgentHub runtime manager');

  agenthub.command('start')
    .description('Start the AgentHub runtime manager')
    .option('--plain', 'Disable interactive terminal controls')
    .option('-p, --port <port>', 'Manager port', AGENT_HUB_DEFAULT_PORT)
    .option('-H, --host <host>', 'Manager bind host (default: AGENT_HUB_MANAGER_BIND_HOST or 127.0.0.1)')
    .option('--local', 'Install from AGENT_HUB_RUNTIME_PATH in editable mode')
    .option('-l, --log-level <level>', 'Logging verbosity: CRITICAL, ERROR, WARNING, INFO, or DEBUG (default: .env or INFO)')
    .option('--env <KEY=VALUE>', 'Pass an environment variable to AgentHub (repeatable)', (value, previous: string[] = []) => [...previous, value], [])
    .action(async (options: AgentHubOptions) => {
      try {
        parseAgentHubPort(options.port);
        const logLevel = parseAgentHubLogLevel(options.logLevel);
        validateProjectRoot();
        const projectRoot = process.cwd();
        const launch = await resolveAgentHubLaunchConfig(projectRoot, {
          port: options.port,
          host: options.host,
          local: options.local,
          env: options.env,
          logLevel,
        });
        console.log(`solidx-agenthub-runtime v${getAgentHubVersion(launch.command)}`);
        console.log(`Starting AgentHub manager on ${launch.env.AGENT_HUB_MANAGER_BIND_HOST}:${launch.port} (log level ${launch.env.AGENT_HUB_LOG_LEVEL || 'INFO'})`);
        process.exitCode = await runAgentHubManager(
          launch.command, projectRoot, launch.env, launch.port, launch.logLevel, options.plain,
        );
      } catch (error) {
        if (error instanceof AgentCommandExit) {
          process.exitCode = error.exitCode;
          return;
        }
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  registerSearxngCommands(agenthub);
}
