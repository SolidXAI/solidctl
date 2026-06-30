export type AgentName = 'claude-code' | 'cursor' | 'codex' | 'claude-desktop';

export const AGENT_NAMES: readonly AgentName[] = [
  'claude-code',
  'cursor',
  'codex',
  'claude-desktop',
];

const AGENT_NAME_SET = new Set<string>(AGENT_NAMES);

export function isAgentName(value: string): value is AgentName {
  return AGENT_NAME_SET.has(value);
}

export const KEBAB_CASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface McpInstallOptions {
  /** kebab-case consuming project name, used to locate ~/.solidx/<project>/mcp.json */
  projectName: string;
  /** API key beginning with sldx_ */
  apiKey: string;
  /** MCP server URL (no trailing slash except for Claude Desktop stdio bridge) */
  url: string;
  /** MCP server entry name: solidx-<project>-mcp by default */
  serverName: string;
  /** Optional explicit subset; undefined = all detected */
  agents?: AgentName[];
  dryRun: boolean;
  force: boolean;
}

export type InstallStatus = 'installed' | 'skipped' | 'not-detected' | 'error';

export interface AgentInstallResult {
  agent: AgentName;
  status: InstallStatus;
  /** human-readable detail line */
  message?: string;
  /** path of backup file written, if any */
  backupPath?: string;
}

export interface AgentInstaller {
  readonly name: AgentName;
  isDetected(): boolean;
  install(
    opts: McpInstallOptions,
    deps?: InstallDeps,
  ): Promise<AgentInstallResult>;
}

/** Optional per-installer dependency injection (home dir, platform, appData, mock CLIs). */
export interface InstallDeps {
  injectedHomeDir?: string;
  platform?: NodeJS.Platform;
  appData?: string;
  [key: string]: unknown;
}

export function parseAgentsList(
  input: string | undefined,
): AgentName[] | undefined {
  if (input === undefined) return undefined;
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const parsed: AgentName[] = [];
  for (const p of parts) {
    if (!isAgentName(p)) {
      throw new Error(
        `Unsupported agent "${p}". Valid agents: ${AGENT_NAMES.join(', ')}`,
      );
    }
    parsed.push(p);
  }
  return parsed;
}
