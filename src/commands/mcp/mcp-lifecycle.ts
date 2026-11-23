import crypto from 'crypto';
import fs from 'fs-extra';
import { kebabCase } from 'lodash';
import net from 'net';
import path from 'path';
import {
  activateMcpRegistration,
  type ActivationRequest,
} from './activation/activation';
import type { McpRegistration } from './activation/clients';
import { isLocalUrl, parseUrl } from './activation/ownership';
import {
  defaultHomeDir,
  findProjectByRoot,
  loadRegistry,
  safeRealpath,
} from './activation/registry';
import {
  clientsNeedingReload,
  formatActivationReport,
} from './activation/report';

/**
 * Lifecycle helpers shared by every command that launches the standalone MCP
 * server (`start`, `start:dev`, `mcp start`, `agent start`): detect who owns
 * the MCP port, wait for the server to be ready, confirm the project's key is
 * accepted, and only then switch MCP clients to this project.
 */

/** Must match mcp_layer.app.project_fingerprint in solidx-ai-agent. */
export function projectFingerprint(projectRoot: string): string {
  return crypto
    .createHash('sha256')
    .update(safeRealpath(projectRoot), 'utf8')
    .digest('hex')
    .slice(0, 16);
}

const WILDCARD_HOSTS = new Set(['0.0.0.0', '::', '[::]', '']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Address solidctl itself uses to reach a server bound to `bindHost`. */
export function probeHost(bindHost: string): string {
  if (WILDCARD_HOSTS.has(bindHost) || bindHost === 'localhost')
    return '127.0.0.1';
  return bindHost;
}

function hostForUrl(host: string): string {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

function normalizeMountPath(mountPath: string): string {
  const withSlash = mountPath.startsWith('/') ? mountPath : `/${mountPath}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

/** URL MCP clients should use; a wildcard bind address is not connectable. */
export function clientFacingUrl(
  bindHost: string,
  port: string | number,
  mountPath: string,
): string {
  const host =
    WILDCARD_HOSTS.has(bindHost) || LOOPBACK_HOSTS.has(bindHost)
      ? 'localhost'
      : hostForUrl(bindHost);
  return `http://${host}:${port}${normalizeMountPath(mountPath)}`;
}

export interface HealthInfo {
  ok: boolean;
  service?: string;
  projectFingerprint?: string | null;
}

export async function fetchHealth(
  host: string,
  port: string | number,
  timeoutMs = 1500,
): Promise<HealthInfo | null> {
  try {
    const res = await fetch(
      `http://${hostForUrl(probeHost(host))}:${port}/health`,
      {
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false };
    }
    const body = (await res.json()) as {
      status?: unknown;
      service?: unknown;
      project_fingerprint?: unknown;
    };
    return {
      ok: body?.status === 'ok',
      service: typeof body?.service === 'string' ? body.service : undefined,
      projectFingerprint:
        typeof body?.project_fingerprint === 'string'
          ? body.project_fingerprint
          : null,
    };
  } catch {
    return null;
  }
}

export function isPortOpen(
  host: string,
  port: string | number,
  timeoutMs = 1000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: probeHost(host), port: Number(port) });
    const done = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

export type McpPortState =
  | { kind: 'free' }
  | { kind: 'same-project' }
  | { kind: 'other-project' }
  | { kind: 'solidx-unknown-project' }
  | { kind: 'other-process' };

export async function inspectMcpPort(
  bindHost: string,
  port: string | number,
  projectRoot: string,
): Promise<McpPortState> {
  const health = await fetchHealth(bindHost, port);
  if (health?.ok) {
    if (!health.projectFingerprint) return { kind: 'solidx-unknown-project' };
    return health.projectFingerprint === projectFingerprint(projectRoot)
      ? { kind: 'same-project' }
      : { kind: 'other-project' };
  }
  return (await isPortOpen(bindHost, port))
    ? { kind: 'other-process' }
    : { kind: 'free' };
}

export function describePortState(
  state: McpPortState,
  port: string | number,
): string {
  switch (state.kind) {
    case 'free':
      return `Port ${port} is free.`;
    case 'same-project':
      return `An MCP server for this project is already running on port ${port}.`;
    case 'other-project':
      return `Port ${port} is used by the MCP server of a different SolidX project. Stop that server first.`;
    case 'solidx-unknown-project':
      return `Port ${port} is used by a SolidX MCP server that does not report its project (older solidx-ai-agent). Stop it first.`;
    case 'other-process':
      return `Port ${port} is already in use by another process.`;
  }
}

export type ReadyResult =
  | 'ready'
  | 'unverified'
  | 'other-project'
  | 'timeout'
  | 'stopped';

export async function waitForMcpReady(opts: {
  bindHost: string;
  port: string | number;
  projectRoot: string;
  timeoutMs?: number;
  intervalMs?: number;
  isAlive?: () => boolean;
}): Promise<ReadyResult> {
  const deadline = Date.now() + (opts.timeoutMs ?? 120_000);
  const expected = projectFingerprint(opts.projectRoot);
  for (;;) {
    if (opts.isAlive && !opts.isAlive()) return 'stopped';
    const health = await fetchHealth(opts.bindHost, opts.port);
    if (health?.ok) {
      if (!health.projectFingerprint) return 'unverified';
      return health.projectFingerprint === expected ? 'ready' : 'other-project';
    }
    if (Date.now() >= deadline) return 'timeout';
    await new Promise((resolve) => setTimeout(resolve, opts.intervalMs ?? 500));
  }
}

export type AuthProbeResult =
  | 'ok'
  | 'invalid-key'
  | 'forbidden'
  | 'api-unavailable'
  | 'error';

/**
 * One MCP `initialize` with the project's key. The server validates the key
 * against its database before exchanging it for an access token, so an
 * `access_token_fetch_failed` answer still proves the key belongs here.
 */
export async function probeMcpAuth(
  url: string,
  apiKey: string,
  timeoutMs = 15_000,
): Promise<{ result: AuthProbeResult; detail?: string }> {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'solidctl-activation-check', version: '1' },
    },
  });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'solidx-api-key': apiKey,
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) {
      await res.body?.cancel().catch(() => undefined);
      const sessionId = res.headers.get('mcp-session-id');
      if (sessionId) {
        await fetch(url, {
          method: 'DELETE',
          headers: { 'solidx-api-key': apiKey, 'mcp-session-id': sessionId },
          signal: AbortSignal.timeout(3000),
        })
          .then((r) => r.body?.cancel())
          .catch(() => undefined);
      }
      return { result: 'ok' };
    }
    const text = await res.text().catch(() => '');
    let error: string | undefined;
    try {
      error = (JSON.parse(text) as { error?: string }).error;
    } catch {
      // non-JSON error body
    }
    if (error === 'invalid_api_key' || error === 'missing_api_key')
      return { result: 'invalid-key' };
    if (error === 'access_token_fetch_failed')
      return { result: 'api-unavailable' };
    if (res.status === 403 || error === 'permission_denied')
      return { result: 'forbidden' };
    return {
      result: 'error',
      detail: `HTTP ${res.status}${error ? ` ${error}` : ''}`,
    };
  } catch (err) {
    return {
      result: 'error',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export function readProjectApiKey(
  homeDir: string,
  projectName: string,
): string | null {
  const file = path.join(homeDir, '.solidx', projectName, 'mcp.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      solidxAdminApiKey?: { apiKey?: unknown };
    };
    const key = parsed.solidxAdminApiKey?.apiKey;
    return typeof key === 'string' && key ? key : null;
  } catch {
    return null;
  }
}

export type RuntimeRegistration =
  | { ok: true; registration: McpRegistration; probeUrl: string }
  | { ok: false; reason: string };

/**
 * Registration for a running server: reuses the saved server name, keeps a
 * remote URL as-is, and moves a local URL to the actual port and mount path
 * (keeping its host spelling).
 */
export function resolveRuntimeRegistration(opts: {
  projectRoot: string;
  bindHost: string;
  port: string | number;
  mountPath: string;
  homeDir?: string;
}): RuntimeRegistration {
  const homeDir = opts.homeDir ?? defaultHomeDir();
  const registry = loadRegistry(homeDir);
  const byRoot = findProjectByRoot(registry, opts.projectRoot);
  const projectName =
    byRoot?.projectName ?? kebabCase(path.basename(opts.projectRoot));
  const saved = byRoot?.project ?? registry.projects[projectName];
  const apiKey = readProjectApiKey(homeDir, projectName);
  if (!apiKey) {
    return {
      ok: false,
      reason: `No API key at ~/.solidx/${projectName}/mcp.json, so MCP clients were not switched. Run \`solidctl mcp install\` in this project.`,
    };
  }
  const probeUrl = clientFacingUrl(opts.bindHost, opts.port, opts.mountPath);
  let url = probeUrl;
  if (saved?.url) {
    const parsed = parseUrl(saved.url);
    if (parsed && !isLocalUrl(saved.url)) {
      url = saved.url;
    } else if (parsed) {
      parsed.port = String(opts.port);
      parsed.pathname = normalizeMountPath(opts.mountPath);
      url = parsed.toString().replace(/\/$/, '');
    }
  }
  return {
    ok: true,
    probeUrl,
    registration: {
      projectName,
      serverName: saved?.serverName ?? `solidx-${projectName}-mcp`,
      url,
      apiKey,
      projectRoot: safeRealpath(opts.projectRoot),
    },
  };
}

export interface RuntimeActivationOptions {
  projectRoot: string;
  bindHost: string;
  port: string | number;
  mountPath: string;
  log: (message: string) => void;
  isAlive?: () => boolean;
  homeDir?: string;
  readyTimeoutMs?: number;
  /** test seam for client detection / platform */
  activation?: Pick<
    ActivationRequest,
    'detect' | 'platform' | 'appData' | 'clients'
  >;
}

export type RuntimeActivationOutcome = 'activated' | 'skipped' | 'failed';

/** Switch MCP clients to this project once its MCP server is ready. Never throws. */
export async function activateMcpForRuntime(
  opts: RuntimeActivationOptions,
): Promise<RuntimeActivationOutcome> {
  const { log } = opts;
  try {
    const resolved = resolveRuntimeRegistration(opts);
    if (!resolved.ok) {
      log(resolved.reason);
      return 'skipped';
    }
    const ready = await waitForMcpReady({
      bindHost: opts.bindHost,
      port: opts.port,
      projectRoot: opts.projectRoot,
      timeoutMs: opts.readyTimeoutMs,
      isAlive: opts.isAlive,
    });
    if (ready === 'stopped') return 'skipped';
    if (ready === 'timeout') {
      log(
        `MCP server did not become ready on port ${opts.port}; MCP clients were not switched.`,
      );
      return 'failed';
    }
    if (ready === 'other-project') {
      log(
        `Port ${opts.port} is served by a different SolidX project; MCP clients were not switched.`,
      );
      return 'failed';
    }

    const { registration } = resolved;
    const auth = await probeMcpAuth(resolved.probeUrl, registration.apiKey);
    if (auth.result === 'invalid-key') {
      log(
        `The API key in ~/.solidx/${registration.projectName}/mcp.json was rejected by this project's MCP server, so MCP clients were not switched. Re-run \`solidctl mcp install --api-key <key>\` with a key from this project.`,
      );
      return 'failed';
    }
    if (auth.result === 'error') {
      log(
        `Could not verify the MCP API key (${auth.detail}); MCP clients were not switched.`,
      );
      return 'failed';
    }
    if (auth.result === 'forbidden') {
      log(
        `Warning: the API key for ${registration.projectName} lacks the mcp:invoke permission; MCP tool calls will be refused.`,
      );
    }
    if (auth.result === 'api-unavailable') {
      log(
        'Note: the API is not reachable yet; MCP tool calls will fail until solid-api is up.',
      );
    }

    const result = await activateMcpRegistration({
      ...opts.activation,
      target: registration,
      targetMode: 'if-present',
      source: 'runtime',
      requireTargetSomewhere: true,
      homeDir: opts.homeDir,
    });
    if (result.notRegistered) {
      log(
        `${registration.serverName} is not configured in any MCP client. Run \`solidctl mcp install\` to add it.`,
      );
      return 'skipped';
    }
    const changed = result.clients.filter(
      (c) =>
        c.status === 'changed' ||
        c.status === 'error' ||
        c.status === 'skipped',
    );
    if (!changed.length) {
      log(`MCP clients already use ${registration.serverName}.`);
    } else {
      log(`Switched MCP clients to ${registration.serverName}:`);
      for (const line of formatActivationReport({
        ...result,
        clients: changed,
      }))
        log(`  ${line}`);
    }
    const reload = clientsNeedingReload(result);
    if (reload.length) log(`Restart or reload to apply: ${reload.join(', ')}`);
    return result.hadError ? 'failed' : 'activated';
  } catch (err) {
    log(
      `Could not switch MCP clients: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 'failed';
  }
}
