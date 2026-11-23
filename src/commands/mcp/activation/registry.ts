import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { AgentName } from '../installers/types';
import { atomicWriteFile, readTextOrNull } from './fs-utils';

/**
 * SolidX-owned record of MCP registrations, kept at ~/.solidx/mcp-registry.json
 * with owner-only permissions. Archived entries are full client definitions
 * (including credentials) that were removed from clients without a native
 * disable switch, so they can be restored when their project is selected again.
 */

export interface RegistryProject {
  serverName: string;
  url: string;
  projectRoot?: string;
  clients: AgentName[];
  updatedAt: string;
}

export interface ArchivedEntry {
  entry: unknown;
  archivedAt: string;
}

export interface ActiveSelection {
  projectName: string;
  serverName: string;
  source: 'install' | 'runtime';
  pid: number;
  activatedAt: string;
}

export interface McpRegistryData {
  version: 1;
  projects: Record<string, RegistryProject>;
  archived: Partial<Record<AgentName, Record<string, ArchivedEntry>>>;
  active?: ActiveSelection;
}

export function defaultHomeDir(): string {
  return process.env.HOME ?? os.homedir();
}

export function solidxDir(homeDir: string): string {
  return path.join(homeDir, '.solidx');
}

export function registryPath(homeDir: string): string {
  return path.join(solidxDir(homeDir), 'mcp-registry.json');
}

export function activationLockPath(homeDir: string): string {
  return path.join(solidxDir(homeDir), 'mcp-activation.lock');
}

export function emptyRegistry(): McpRegistryData {
  return { version: 1, projects: {}, archived: {} };
}

export function loadRegistry(homeDir: string): McpRegistryData {
  const file = registryPath(homeDir);
  const text = readTextOrNull(file);
  if (text === null) return emptyRegistry();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `${file} is not valid JSON (${err instanceof Error ? err.message : String(err)}). Fix or move it aside, then retry.`,
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `${file} does not contain a JSON object. Fix or move it aside, then retry.`,
    );
  }
  const data = parsed as Partial<McpRegistryData>;
  return {
    version: 1,
    projects:
      data.projects && typeof data.projects === 'object' ? data.projects : {},
    archived:
      data.archived && typeof data.archived === 'object' ? data.archived : {},
    ...(data.active ? { active: data.active } : {}),
  };
}

export function saveRegistry(homeDir: string, data: McpRegistryData): void {
  const dir = solidxDir(homeDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = registryPath(homeDir);
  atomicWriteFile(file, `${JSON.stringify(data, null, 2)}\n`);
  fs.chmodSync(file, 0o600);
}

export function knownServerNames(data: McpRegistryData): Set<string> {
  return new Set(Object.values(data.projects).map((p) => p.serverName));
}

export function findProjectByRoot(
  data: McpRegistryData,
  projectRoot: string,
): { projectName: string; project: RegistryProject } | null {
  const want = safeRealpath(projectRoot);
  for (const [projectName, project] of Object.entries(data.projects)) {
    if (project.projectRoot && safeRealpath(project.projectRoot) === want) {
      return { projectName, project };
    }
  }
  return null;
}

export function safeRealpath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}
