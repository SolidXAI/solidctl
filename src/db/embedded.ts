import { ChildProcess, spawn } from 'child_process';
import net from 'net';
import fs from 'fs-extra';
import path from 'path';
import { PGLITE_READY_SENTINEL } from './pglite-server';
import { SetupAnswers } from '../commands/create-app/setup-questions';

/** Marker written to the backend .env to flag an embedded-database project. */
export const EMBEDDED_DRIVER = 'pglite';

/** Dedicated port so the embedded DB never collides with a real local PostgreSQL on 5432. */
export const EMBEDDED_DEFAULT_PORT = '54329';
export const EMBEDDED_DEFAULT_HOST = '127.0.0.1';

/** Connection placeholders. PGlite is a single logical database; auth is trust-based locally. */
export const EMBEDDED_DB_NAME = 'solidx_app_db';
export const EMBEDDED_DB_USER = 'solidx';
export const EMBEDDED_DB_PASSWORD = 'solidx';

const STATE_DIR = path.join('.solidx', 'db');

/**
 * Fills database fields with embedded defaults. Used for both the interactive
 * flow (where external-DB questions are skipped) and the `--embedded` flag.
 */
export function applyEmbeddedDatabaseDefaults(
  answers: SetupAnswers,
): SetupAnswers {
  answers.databaseMode = 'embedded';
  answers.solidApiDatabaseClient = 'PostgreSQL';
  answers.solidApiDatabaseHost = EMBEDDED_DEFAULT_HOST;
  answers.solidApiDatabasePort = EMBEDDED_DEFAULT_PORT;
  answers.solidApiDatabaseName = EMBEDDED_DB_NAME;
  answers.solidApiDatabaseUsername = EMBEDDED_DB_USER;
  answers.solidApiDatabasePassword = EMBEDDED_DB_PASSWORD;
  answers.solidApiDatabaseSynchronize = 'Yes';
  answers.databaseExists = 'Yes';
  return answers;
}

export interface EmbeddedConfig {
  host: string;
  port: string;
  dataDir: string;
}

export function getEmbeddedDataDir(projectRoot: string): string {
  return path.join(projectRoot, STATE_DIR, 'pgdata');
}

/** Detects whether a project at projectRoot was scaffolded with the embedded database. */
export function isEmbeddedProject(projectRoot: string): boolean {
  const envPath = path.join(projectRoot, 'solid-api', '.env');
  try {
    if (!fs.existsSync(envPath)) return false;
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^\s*DEFAULT_DATABASE_DRIVER\s*=\s*(.+?)\s*$/m);
    const value = match?.[1]?.replace(/^['"]|['"]$/g, '');
    return value === EMBEDDED_DRIVER;
  } catch {
    return false;
  }
}

function readEnvValue(envPath: string, key: string): string | null {
  try {
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = content.match(
      new RegExp(`^\\s*${escaped}\\s*=\\s*(.+?)\\s*$`, 'm'),
    );
    return match?.[1]?.replace(/^['"]|['"]$/g, '') ?? null;
  } catch {
    return null;
  }
}

export function getEmbeddedConfig(projectRoot: string): EmbeddedConfig {
  const envPath = path.join(projectRoot, 'solid-api', '.env');
  return {
    host:
      readEnvValue(envPath, 'DEFAULT_DATABASE_HOST') ?? EMBEDDED_DEFAULT_HOST,
    port:
      readEnvValue(envPath, 'DEFAULT_DATABASE_PORT') ?? EMBEDDED_DEFAULT_PORT,
    dataDir: getEmbeddedDataDir(projectRoot),
  };
}

export interface EmbeddedServerHandle {
  child: ChildProcess;
  ready: Promise<void>;
}

/**
 * Spawns the embedded PGlite server as a child process and resolves `ready`
 * once it reports it is listening (or rejects on early exit / timeout).
 */
export function startEmbeddedServer(
  config: EmbeddedConfig,
  options: {
    maxConnections?: number;
    onLog?: (line: string) => void;
    readyTimeoutMs?: number;
  } = {},
): EmbeddedServerHandle {
  fs.ensureDirSync(config.dataDir);

  const serverScript = path.join(__dirname, 'pglite-server.js');
  const child = spawn(process.execPath, [serverScript], {
    cwd: path.dirname(__dirname),
    env: {
      ...process.env,
      SOLIDX_PGLITE_HOST: config.host,
      SOLIDX_PGLITE_PORT: config.port,
      SOLIDX_PGLITE_DATA: config.dataDir,
      SOLIDX_PGLITE_MAX_CONNECTIONS: String(options.maxConnections ?? 50),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const ready = new Promise<void>((resolve, reject) => {
    const timeoutMs = options.readyTimeoutMs ?? 30000;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(new Error('Embedded database did not become ready in time')),
      );
    }, timeoutMs);

    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        options.onLog?.(line);
        if (line.includes(PGLITE_READY_SENTINEL)) {
          finish(resolve);
        }
      }
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);

    child.on('error', (err) => finish(() => reject(err)));
    child.on('exit', (code) => {
      finish(() =>
        reject(
          new Error(
            `Embedded database exited early with code ${code ?? 'unknown'}`,
          ),
        ),
      );
    });
  });

  return { child, ready };
}

/** Returns true if something is already listening on the embedded DB host/port. */
export function isEmbeddedServerRunning(
  config: EmbeddedConfig,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({
      host: config.host,
      port: Number(config.port),
    });
    const done = (running: boolean) => {
      socket.destroy();
      resolve(running);
    };
    socket.setTimeout(1000);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

export async function stopEmbeddedServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
      resolve();
    }, 5000);
  });
}
