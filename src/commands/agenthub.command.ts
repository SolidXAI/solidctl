import { spawn, spawnSync } from 'child_process';
import { Command } from 'commander';
import path from 'path';
import { config as loadDotenv } from 'dotenv';
import { validateProjectRoot } from '../helper';
import { AgentCommandExit } from './agent-helper';
import { checkAgentHubUpdate, ensureAgentHubInstalled, getAgentHubVersion } from './agenthub-helper';
import { buildBridgedEnv } from './mcp-launch';

export type AgentHubOptions = {
  port: string;
  host?: string;
  local?: boolean;
  env?: string[];
};

function parseEnvAssignments(assignments: string[] = []): Record<string, string> {
  return assignments.reduce<Record<string, string>>((env, assignment) => {
    const separator = assignment.indexOf('=');
    const key = separator === -1 ? '' : assignment.slice(0, separator);
    const value = separator === -1 ? '' : assignment.slice(separator + 1);

    if (separator === -1 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`Invalid --env assignment "${assignment}". Expected KEY=VALUE.`);
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

export function runAgentHubManager(command: string, projectRoot: string, env: Record<string, string>, port: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, ['manager', '--port', port], {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
      // Give the manager and the agent processes it spawns their own signal group.
      detached: process.platform !== 'win32',
    });
    let stopping = false;
    let killTimer: NodeJS.Timeout | undefined;

    const signalGroup = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        try {
          process.kill(-child.pid, signal);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
      }
    };
    const stop = (signal: NodeJS.Signals) => {
      if (stopping) return;
      stopping = true;
      signalGroup(signal);
      killTimer = setTimeout(() => signalGroup('SIGKILL'), 5_000);
      killTimer.unref();
    };
    const onInterrupt = () => stop('SIGINT');
    const onTerminate = () => stop('SIGTERM');
    const cleanup = () => {
      if (killTimer) clearTimeout(killTimer);
      process.removeListener('SIGINT', onInterrupt);
      process.removeListener('SIGTERM', onTerminate);
    };
    process.on('SIGINT', onInterrupt);
    process.on('SIGTERM', onTerminate);
    child.once('error', (error) => {
      cleanup();
      reject(new Error(`Failed to start AgentHub manager: ${error.message}`));
    });
    child.once('close', (code) => {
      cleanup();
      // The manager does not terminate its subprocesses on exit.
      signalGroup('SIGKILL');
      resolve(stopping ? 0 : (code ?? 1));
    });
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
    .option('-p, --port <port>', 'Manager port', '9001')
    .option('-H, --host <host>', 'Manager bind host (default: AGENT_HUB_MANAGER_BIND_HOST or 127.0.0.1)')
    .option('--local', 'Install from AGENT_HUB_RUNTIME_PATH in editable mode')
    .option('--env <KEY=VALUE>', 'Pass an environment variable to AgentHub (repeatable)', (value, previous: string[] = []) => [...previous, value], [])
    .action(async (options: AgentHubOptions) => {
      try {
        if (!/^\d+$/.test(options.port) || +options.port < 1 || +options.port > 65535) {
          throw new Error('--port must be an integer between 1 and 65535.');
        }
        await checkAgentHubUpdate({ isLocal: Boolean(options.local) });
        validateProjectRoot();
        const projectRoot = process.cwd();
        const env = buildAgentHubEnv(projectRoot, options.host);
        Object.assign(env, parseEnvAssignments(options.env));
        const command = ensureAgentHubInstalled(options);
        console.log(`solidx-agenthub-runtime v${getAgentHubVersion(command)}`);
        console.log(`Starting AgentHub manager on ${env.AGENT_HUB_MANAGER_BIND_HOST}:${options.port}`);
        process.exitCode = await runAgentHubManager(command, projectRoot, env, options.port);
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
