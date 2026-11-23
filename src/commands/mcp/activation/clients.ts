import fs from 'fs-extra';
import type { AgentName } from '../installers/types';
import {
  claudeCodeConfigPath,
  claudeDesktopConfigPath,
  codexConfigPath,
  commandExists,
  cursorConfigPath,
  isCursorDesktopInstalled,
} from '../installers/config-paths';
import {
  appendCodexServer,
  parseCodexServers,
  setCodexServerApiKey,
  setCodexServerEnabled,
  setCodexServerUrl,
} from './codex-toml';
import { ambiguityReason, classifyEntry, EntryFacts } from './ownership';
import type { ArchivedEntry } from './registry';

export interface McpRegistration {
  projectName: string;
  serverName: string;
  url: string;
  apiKey: string;
  projectRoot?: string;
}

/**
 * `install`: add or activate the target in this client.
 * `if-present`: activate it only where it is already configured (or archived);
 * used at runtime so that starting a project never registers it in a client
 * the user did not install it into.
 */
export type TargetMode = 'install' | 'if-present';

export type ClientAction =
  | { kind: 'add' | 'restore' | 'enable' | 'unchanged'; serverName: string }
  | { kind: 'update'; serverName: string; detail: string }
  | { kind: 'disable' | 'archive'; serverName: string }
  | { kind: 'ambiguous'; serverName: string; reason: string };

export interface ReconcileInput {
  text: string | null;
  target: McpRegistration;
  targetMode: TargetMode;
  knownNames: ReadonlySet<string>;
  archived: Record<string, ArchivedEntry>;
  platform: NodeJS.Platform;
}

export interface ReconcileOutput {
  after: string | null;
  changed: boolean;
  actions: ClientAction[];
  /** managed competitor definitions removed from the client, to be archived */
  archive: Record<string, unknown>;
  /** archived definitions put back into the client */
  restored: string[];
  targetActive: boolean;
}

export interface ClientEnv {
  homeDir: string;
  platform: NodeJS.Platform;
  appData?: string;
}

export interface ClientSpec {
  name: AgentName;
  /** true when inactive entries are archived and removed (no native disable switch) */
  archivesInactive: boolean;
  configPath(env: ClientEnv): string;
  detect(env: ClientEnv): boolean;
  reconcile(input: ReconcileInput): ReconcileOutput;
}

type JsonObject = Record<string, unknown>;

function isObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function hasSolidxKeyHeader(headers: unknown): boolean {
  return (
    isObject(headers) &&
    Object.keys(headers).some((k) => k.toLowerCase() === 'solidx-api-key')
  );
}

function headersWithKey(
  base: JsonObject | undefined,
  apiKey: string,
): JsonObject {
  const existing = base && isObject(base.headers) ? base.headers : {};
  const out: JsonObject = {};
  let placed = false;
  for (const [k, v] of Object.entries(existing)) {
    if (k.toLowerCase() === 'solidx-api-key') {
      if (!placed) out[k] = apiKey;
      placed = true;
    } else {
      out[k] = v;
    }
  }
  if (!placed) out['solidx-api-key'] = apiKey;
  return out;
}

interface JsonEntryCodec {
  facts(name: string, entry: unknown): EntryFacts;
  build(
    base: JsonObject | undefined,
    target: McpRegistration,
    platform: NodeJS.Platform,
  ): JsonObject;
}

function detectIndent(text: string | null): string | number {
  const m = text ? /\n([ \t]+)"/.exec(text) : null;
  return m ? m[1] : 2;
}

export function reconcileJsonClient(
  input: ReconcileInput,
  codec: JsonEntryCodec,
): ReconcileOutput {
  let config: JsonObject = {};
  if (input.text !== null && input.text.trim() !== '') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.text);
    } catch (err) {
      throw new Error(
        `invalid JSON (${err instanceof Error ? err.message : String(err)}); left unchanged`,
      );
    }
    if (!isObject(parsed))
      throw new Error('top level is not a JSON object; left unchanged');
    config = parsed;
  }
  if (config.mcpServers !== undefined && !isObject(config.mcpServers)) {
    throw new Error('"mcpServers" is not an object; left unchanged');
  }
  const servers: JsonObject = isObject(config.mcpServers)
    ? config.mcpServers
    : {};
  const targetName = input.target.serverName;
  const existing = servers[targetName];
  const archivedTarget = input.archived[targetName]?.entry;
  const install =
    input.targetMode === 'install' ||
    existing !== undefined ||
    archivedTarget !== undefined;

  const actions: ClientAction[] = [];
  const archive: Record<string, unknown> = {};
  const restored: string[] = [];
  let targetEntry: JsonObject | undefined;

  if (install) {
    const base = isObject(existing)
      ? existing
      : isObject(archivedTarget)
        ? archivedTarget
        : undefined;
    targetEntry = codec.build(base, input.target, input.platform);
    if (existing === undefined) {
      if (archivedTarget !== undefined) {
        restored.push(targetName);
        actions.push({ kind: 'restore', serverName: targetName });
      } else {
        actions.push({ kind: 'add', serverName: targetName });
      }
    } else if (JSON.stringify(existing) === JSON.stringify(targetEntry)) {
      actions.push({ kind: 'unchanged', serverName: targetName });
    } else {
      actions.push({
        kind: 'update',
        serverName: targetName,
        detail: describeJsonUpdate(existing, targetEntry),
      });
    }
  }

  const next: JsonObject = {};
  for (const [name, entry] of Object.entries(servers)) {
    if (name === targetName) {
      next[name] = targetEntry ?? entry;
      continue;
    }
    const facts = codec.facts(name, entry);
    const ownership = classifyEntry(facts, input.knownNames, input.target.url);
    if (ownership === 'managed') {
      archive[name] = entry;
      actions.push({ kind: 'archive', serverName: name });
      continue;
    }
    if (ownership === 'ambiguous') {
      actions.push({
        kind: 'ambiguous',
        serverName: name,
        reason: ambiguityReason(facts, input.knownNames),
      });
    }
    next[name] = entry;
  }
  if (targetEntry && existing === undefined) next[targetName] = targetEntry;

  const changed = JSON.stringify(next) !== JSON.stringify(servers);
  if (!changed) {
    return {
      after: input.text,
      changed: false,
      actions,
      archive,
      restored,
      targetActive: install,
    };
  }
  const out = { ...config, mcpServers: next };
  const trailing = input.text === null || input.text.endsWith('\n') ? '\n' : '';
  return {
    after: JSON.stringify(out, null, detectIndent(input.text)) + trailing,
    changed: true,
    actions,
    archive,
    restored,
    targetActive: install,
  };
}

function describeJsonUpdate(before: unknown, after: JsonObject): string {
  const b = isObject(before) ? before : {};
  const differs = (key: string) =>
    JSON.stringify(b[key]) !== JSON.stringify(after[key]);
  const parts: string[] = [];
  if (differs('url')) parts.push('url');
  if (differs('headers')) parts.push('credentials');
  if (differs('args')) parts.push('bridge url/credentials');
  if (differs('type') || differs('command')) parts.push('transport');
  return parts.join(', ') || 'definition';
}

const httpFacts = (name: string, entry: unknown): EntryFacts => ({
  name,
  url: isObject(entry) && typeof entry.url === 'string' ? entry.url : undefined,
  hasSolidxKey: isObject(entry) && hasSolidxKeyHeader(entry.headers),
});

export const claudeCodeCodec: JsonEntryCodec = {
  facts: httpFacts,
  build: (base, target) =>
    base
      ? {
          ...base,
          type: 'http',
          url: target.url,
          headers: headersWithKey(base, target.apiKey),
        }
      : {
          type: 'http',
          url: target.url,
          headers: { 'solidx-api-key': target.apiKey },
        },
};

export const cursorCodec: JsonEntryCodec = {
  facts: httpFacts,
  build: (base, target) =>
    base
      ? {
          ...base,
          url: target.url,
          headers: headersWithKey(base, target.apiKey),
        }
      : { url: target.url, headers: { 'solidx-api-key': target.apiKey } },
};

/** Claude Desktop only speaks stdio, so SolidX entries bridge through mcp-remote. */
export function buildClaudeDesktopBridge(
  url: string,
  apiKey: string,
  platform: NodeJS.Platform,
): { command: string; args: string[] } {
  const urlWithSlash = url.endsWith('/') ? url : `${url}/`;
  const bridgeArgs = [
    '-y',
    'mcp-remote',
    urlWithSlash,
    '--header',
    `solidx-api-key:${apiKey}`,
  ];
  if (platform === 'win32')
    return { command: 'cmd', args: ['/c', 'npx', ...bridgeArgs] };
  return { command: 'npx', args: bridgeArgs };
}

export const claudeDesktopCodec: JsonEntryCodec = {
  facts: (name, entry) => {
    const args =
      isObject(entry) && Array.isArray(entry.args)
        ? entry.args.filter((a): a is string => typeof a === 'string')
        : [];
    return {
      name,
      url: args.find((a) => /^https?:\/\//i.test(a)),
      hasSolidxKey: args.some((a) => /^solidx-api-key:/i.test(a)),
    };
  },
  build: (base, target, platform) => ({
    ...(base ?? {}),
    ...buildClaudeDesktopBridge(target.url, target.apiKey, platform),
  }),
};

export function reconcileCodexClient(input: ReconcileInput): ReconcileOutput {
  const original = input.text ?? '';
  let text = original;
  const servers = parseCodexServers(text);
  const targetName = input.target.serverName;
  const existing = servers.find((s) => s.name === targetName);
  const install = input.targetMode === 'install' || existing !== undefined;
  const actions: ClientAction[] = [];

  for (const server of servers) {
    if (server.name === targetName) continue;
    const facts: EntryFacts = {
      name: server.name,
      url: server.url,
      hasSolidxKey: server.hasSolidxKey,
    };
    const ownership = classifyEntry(facts, input.knownNames, input.target.url);
    if (ownership === 'managed') {
      if (server.enabled !== false) {
        if (!server.main)
          throw new Error(
            `[mcp_servers.${server.name}] has no main table; left unchanged`,
          );
        text = setCodexServerEnabled(text, server.name, false);
        actions.push({ kind: 'disable', serverName: server.name });
      }
    } else if (ownership === 'ambiguous') {
      actions.push({
        kind: 'ambiguous',
        serverName: server.name,
        reason: ambiguityReason(facts, input.knownNames),
      });
    }
  }

  if (install) {
    if (!existing) {
      text = appendCodexServer(
        text,
        targetName,
        input.target.url,
        input.target.apiKey,
      );
      actions.push({ kind: 'add', serverName: targetName });
    } else {
      if (!existing.main)
        throw new Error(
          `[mcp_servers.${targetName}] has no main table; left unchanged`,
        );
      const updated: string[] = [];
      if (existing.url !== input.target.url) {
        text = setCodexServerUrl(text, targetName, input.target.url);
        updated.push('url');
      }
      if (existing.apiKey !== input.target.apiKey) {
        text = setCodexServerApiKey(text, targetName, input.target.apiKey);
        updated.push('credentials');
      }
      const enabling = existing.enabled === false;
      if (enabling) text = setCodexServerEnabled(text, targetName, true);
      if (updated.length)
        actions.push({
          kind: 'update',
          serverName: targetName,
          detail: updated.join(', '),
        });
      if (enabling) actions.push({ kind: 'enable', serverName: targetName });
      if (!updated.length && !enabling)
        actions.push({ kind: 'unchanged', serverName: targetName });
    }
  }

  const changed = text !== original;
  return {
    after: changed ? text : input.text,
    changed,
    actions,
    archive: {},
    restored: [],
    targetActive: install,
  };
}

export const CLIENT_SPECS: Record<AgentName, ClientSpec> = {
  'claude-code': {
    name: 'claude-code',
    archivesInactive: true,
    configPath: (env) => claudeCodeConfigPath(env.homeDir),
    detect: (env) =>
      commandExists('claude') ||
      fs.existsSync(claudeCodeConfigPath(env.homeDir)),
    reconcile: (input) => reconcileJsonClient(input, claudeCodeCodec),
  },
  cursor: {
    name: 'cursor',
    archivesInactive: true,
    configPath: (env) => cursorConfigPath(env.homeDir),
    detect: (env) =>
      commandExists('cursor') ||
      fs.existsSync(cursorConfigPath(env.homeDir)) ||
      isCursorDesktopInstalled({
        homeDir: env.homeDir,
        platform: env.platform,
      }),
    reconcile: (input) => reconcileJsonClient(input, cursorCodec),
  },
  codex: {
    name: 'codex',
    archivesInactive: false,
    configPath: (env) => codexConfigPath(env.homeDir),
    detect: (env) =>
      commandExists('codex') || fs.existsSync(codexConfigPath(env.homeDir)),
    reconcile: reconcileCodexClient,
  },
  'claude-desktop': {
    name: 'claude-desktop',
    archivesInactive: true,
    configPath: (env) =>
      claudeDesktopConfigPath({
        homeDir: env.homeDir,
        platform: env.platform,
        appData: env.appData,
      }),
    detect: (env) => {
      try {
        return fs.existsSync(
          claudeDesktopConfigPath({
            homeDir: env.homeDir,
            platform: env.platform,
            appData: env.appData,
          }),
        );
      } catch {
        return false;
      }
    },
    reconcile: (input) => reconcileJsonClient(input, claudeDesktopCodec),
  },
};
