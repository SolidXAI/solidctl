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
};

export function buildAgentHubEnv(projectRoot: string, host?: string): Record<string, string> {
  loadDotenv({ path: path.join(projectRoot, '.env'), quiet: true });
  const env = buildBridgedEnv(projectRoot);
  env.SOLIDX_API_BASE_URL ||= env.BASE_URL;
  env.AGENTHUB_MANAGER_BIND_HOST = host || env.AGENTHUB_MANAGER_BIND_HOST || '127.0.0.1';
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

export function registerAgentHubCommand(program: Command) {
  const agenthub = program
    .command('agenthub')
    .description('SolidX AgentHub runtime manager');

  agenthub.command('start')
    .description('Start the AgentHub runtime manager')
    .option('-p, --port <port>', 'Manager port', '9000')
    .option('-H, --host <host>', 'Manager bind host (default: AGENTHUB_MANAGER_BIND_HOST or 127.0.0.1)')
    .option('--local', 'Install from SOLIDX_AGENTHUB_RUNTIME_PATH in editable mode')
    .action(async (options: AgentHubOptions) => {
      try {
        if (!/^\d+$/.test(options.port) || +options.port < 1 || +options.port > 65535) {
          throw new Error('--port must be an integer between 1 and 65535.');
        }
        await checkAgentHubUpdate({ isLocal: Boolean(options.local) });
        validateProjectRoot();
        const projectRoot = process.cwd();
        const env = buildAgentHubEnv(projectRoot, options.host);
        const command = ensureAgentHubInstalled(options);
        console.log(`solidx-agenthub-runtime v${getAgentHubVersion(command)}`);
        console.log(`Starting AgentHub manager on ${env.AGENTHUB_MANAGER_BIND_HOST}:${options.port}`);
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
}
