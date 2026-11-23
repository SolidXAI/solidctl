import fs from 'fs-extra';
import { AGENT_NAMES, type AgentName } from '../installers/types';
import {
  CLIENT_SPECS,
  ClientAction,
  ClientEnv,
  McpRegistration,
  TargetMode,
} from './clients';
import {
  atomicWriteFile,
  readTextOrNull,
  uniqueBackup,
  withFileLock,
} from './fs-utils';
import {
  activationLockPath,
  defaultHomeDir,
  knownServerNames,
  loadRegistry,
  McpRegistryData,
  saveRegistry,
} from './registry';

export interface ActivationRequest {
  target: McpRegistration;
  targetMode: TargetMode;
  source: 'install' | 'runtime';
  /** explicit client subset (`--agents`); default: every detected client */
  clients?: AgentName[];
  homeDir?: string;
  platform?: NodeJS.Platform;
  appData?: string;
  /** rewrite client files even when nothing changed */
  force?: boolean;
  /**
   * Skip all writes when the target would not end up active in any client.
   * Runtime activation uses this so starting an unregistered project does
   * not just disable everything else.
   */
  requireTargetSomewhere?: boolean;
  detect?: (client: AgentName, env: ClientEnv) => boolean;
}

export type ClientStatus =
  | 'not-detected'
  | 'unchanged'
  | 'changed'
  | 'error'
  | 'skipped';

export interface ClientPlan {
  client: AgentName;
  configPath: string;
  status: ClientStatus;
  actions: ClientAction[];
  error?: string;
  before: string | null;
  after: string | null;
  archive: Record<string, unknown>;
  restored: string[];
  targetActive: boolean;
  backupPath?: string;
  rolledBack?: boolean;
}

export interface ActivationResult {
  clients: ClientPlan[];
  applied: boolean;
  dryRun: boolean;
  hadError: boolean;
  /** set when nothing was written because the target is not configured anywhere */
  notRegistered?: boolean;
}

export interface ActivationHooks {
  /** test seam: replaces the atomic file write */
  writeFile?: (filePath: string, content: string) => void;
  /** test seam: runs after planning and before each client write */
  beforeWrite?: (plan: ClientPlan) => void;
}

function envFor(req: ActivationRequest): ClientEnv {
  const platform = req.platform ?? process.platform;
  return {
    homeDir: req.homeDir ?? defaultHomeDir(),
    platform,
    appData:
      req.appData ?? (platform === 'win32' ? process.env.APPDATA : undefined),
  };
}

function planClient(
  client: AgentName,
  req: ActivationRequest,
  env: ClientEnv,
  registry: McpRegistryData,
  textOverride?: string | null,
): ClientPlan {
  const spec = CLIENT_SPECS[client];
  let configPath = '';
  const base: ClientPlan = {
    client,
    configPath,
    status: 'unchanged',
    actions: [],
    before: null,
    after: null,
    archive: {},
    restored: [],
    targetActive: false,
  };
  try {
    configPath = spec.configPath(env);
    base.configPath = configPath;
    const before =
      textOverride !== undefined ? textOverride : readTextOrNull(configPath);
    base.before = before;
    const out = spec.reconcile({
      text: before,
      target: req.target,
      targetMode: req.targetMode,
      knownNames: knownServerNames(registry),
      archived: registry.archived[client] ?? {},
      platform: env.platform,
    });
    const forced = Boolean(req.force) && out.targetActive && out.after !== null;
    return {
      ...base,
      status: out.changed || forced ? 'changed' : 'unchanged',
      actions: out.actions,
      after: out.after,
      archive: out.archive,
      restored: out.restored,
      targetActive: out.targetActive,
    };
  } catch (err) {
    return {
      ...base,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function planActivation(
  req: ActivationRequest,
  registry: McpRegistryData,
): ClientPlan[] {
  const env = envFor(req);
  const detect =
    req.detect ??
    ((client: AgentName, e: ClientEnv) => CLIENT_SPECS[client].detect(e));
  const clients = req.clients ?? [...AGENT_NAMES];
  return clients.map((client) => {
    if (!detect(client, env)) {
      let configPath = '';
      try {
        configPath = CLIENT_SPECS[client].configPath(env);
      } catch {
        // e.g. APPDATA unset on Windows
      }
      return {
        client,
        configPath,
        status: 'not-detected' as const,
        actions: [],
        before: null,
        after: null,
        archive: {},
        restored: [],
        targetActive: false,
      };
    }
    return planClient(client, req, env, registry);
  });
}

function addArchives(
  registry: McpRegistryData,
  plan: ClientPlan,
  now: string,
): boolean {
  const names = Object.keys(plan.archive);
  if (!names.length) return false;
  const bucket = (registry.archived[plan.client] ??= {});
  for (const name of names)
    bucket[name] = { entry: plan.archive[name], archivedAt: now };
  return true;
}

function rollback(
  written: ClientPlan[],
  writeFile: (p: string, c: string) => void,
): void {
  for (const plan of [...written].reverse()) {
    try {
      // Only undo our own write; a client that changed the file since then wins.
      if (readTextOrNull(plan.configPath) !== plan.after) continue;
      if (plan.before === null) fs.removeSync(plan.configPath);
      else writeFile(plan.configPath, plan.before);
      plan.rolledBack = true;
    } catch {
      // leave rolledBack unset; the backup path is still reported
    }
  }
}

/**
 * Make `req.target` the only active SolidX-managed local MCP registration in
 * each processed client, preserving unrelated entries. Serialized with a lock;
 * each file is backed up and replaced atomically. Multiple files are not one
 * transaction: on a write failure, earlier writes from this run are rolled
 * back where the file still holds exactly what was written.
 */
export async function activateMcpRegistration(
  req: ActivationRequest,
  opts: { dryRun?: boolean } & ActivationHooks = {},
): Promise<ActivationResult> {
  const env = envFor(req);
  if (opts.dryRun) {
    const plans = planActivation(req, loadRegistry(env.homeDir));
    return {
      clients: plans,
      applied: false,
      dryRun: true,
      hadError: plans.some((p) => p.status === 'error'),
    };
  }
  const writeFile = opts.writeFile ?? atomicWriteFile;

  return withFileLock(activationLockPath(env.homeDir), () => {
    const registry = loadRegistry(env.homeDir);
    const plans = planActivation(req, registry);
    const now = new Date().toISOString();

    if (req.requireTargetSomewhere && !plans.some((p) => p.targetActive)) {
      return {
        clients: plans.map((p) =>
          p.status === 'changed' ? { ...p, status: 'skipped' as const } : p,
        ),
        applied: false,
        dryRun: false,
        hadError: plans.some((p) => p.status === 'error'),
        notRegistered: true,
      };
    }

    // Archive copies are persisted before the entries leave the client files,
    // so an interrupted run can never lose a definition.
    let archivesAdded = false;
    for (const plan of plans) {
      if (plan.status === 'changed')
        archivesAdded = addArchives(registry, plan, now) || archivesAdded;
    }
    if (archivesAdded) saveRegistry(env.homeDir, registry);

    const written: ClientPlan[] = [];
    let writeFailed = false;
    for (let i = 0; i < plans.length; i++) {
      let plan = plans[i];
      if (plan.status !== 'changed') continue;
      if (writeFailed) {
        plans[i] = {
          ...plan,
          status: 'skipped',
          error: 'not applied because an earlier client failed',
        };
        continue;
      }
      try {
        opts.beforeWrite?.(plan);
        const current = readTextOrNull(plan.configPath);
        if (current !== plan.before) {
          // The client rewrote its file since we read it (Claude Code does
          // this often): re-plan from the fresh content instead of clobbering it.
          plan = planClient(plan.client, req, env, registry, current);
          plans[i] = plan;
          if (plan.status === 'error') throw new Error(plan.error);
          if (plan.status !== 'changed') continue;
          if (addArchives(registry, plan, now))
            saveRegistry(env.homeDir, registry);
        }
        plan.backupPath = uniqueBackup(plan.configPath) ?? undefined;
        writeFile(plan.configPath, plan.after ?? '');
        written.push(plan);
      } catch (err) {
        plans[i] = {
          ...plan,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        };
        writeFailed = true;
        rollback(written, writeFile);
      }
    }

    if (!writeFailed) {
      for (const plan of plans) {
        if (plan.status !== 'changed') continue;
        for (const name of plan.restored)
          delete registry.archived[plan.client]?.[name];
      }
      for (const plan of plans) {
        if (plan.targetActive && plan.status !== 'error')
          delete registry.archived[plan.client]?.[req.target.serverName];
      }
      const previous = registry.projects[req.target.projectName];
      const activeIn = plans
        .filter((p) => p.targetActive && p.status !== 'error')
        .map((p) => p.client);
      registry.projects[req.target.projectName] = {
        serverName: req.target.serverName,
        url: req.target.url,
        ...((req.target.projectRoot ?? previous?.projectRoot)
          ? { projectRoot: req.target.projectRoot ?? previous?.projectRoot }
          : {}),
        clients: [...new Set([...(previous?.clients ?? []), ...activeIn])],
        updatedAt: now,
      };
      if (activeIn.length) {
        registry.active = {
          projectName: req.target.projectName,
          serverName: req.target.serverName,
          source: req.source,
          pid: process.pid,
          activatedAt: now,
        };
      }
      saveRegistry(env.homeDir, registry);
    }

    return {
      clients: plans,
      applied: !writeFailed,
      dryRun: false,
      hadError: plans.some((p) => p.status === 'error'),
    };
  });
}
