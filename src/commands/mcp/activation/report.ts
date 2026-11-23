import type { ActivationResult, ClientPlan } from './activation';
import type { ClientAction } from './clients';

function describeAction(a: ClientAction, archives: boolean): string | null {
  switch (a.kind) {
    case 'add':
      return `add ${a.serverName}`;
    case 'restore':
      return `restore ${a.serverName} (from SolidX registry)`;
    case 'enable':
      return `enable ${a.serverName}`;
    case 'update':
      return `update ${a.serverName} (${a.detail})`;
    case 'unchanged':
      return `${a.serverName} already active`;
    case 'disable':
      return `disable ${a.serverName}`;
    case 'archive':
      return archives
        ? `deactivate ${a.serverName} (saved in SolidX registry)`
        : `deactivate ${a.serverName}`;
    case 'ambiguous':
      return null;
  }
}

function statusWord(p: ClientPlan, dryRun: boolean): string {
  switch (p.status) {
    case 'changed':
      return dryRun ? 'would change' : p.rolledBack ? 'rolled back' : 'updated';
    case 'unchanged':
      return 'up to date';
    case 'not-detected':
      return 'not detected';
    case 'skipped':
      return 'skipped';
    case 'error':
      return 'error';
  }
}

/** Plain-text report lines. Never includes credentials. */
export function formatActivationReport(result: ActivationResult): string[] {
  const lines: string[] = [];
  for (const p of result.clients) {
    const actions = p.actions
      .map((a) => describeAction(a, p.client !== 'codex'))
      .filter((s): s is string => s !== null);
    lines.push(
      `${p.client.padEnd(15)} ${statusWord(p, result.dryRun)}${actions.length ? `: ${actions.join('; ')}` : ''}`,
    );
    if (p.error)
      lines.push(
        `${''.padEnd(15)} ${p.error}${p.configPath ? ` (${p.configPath})` : ''}`,
      );
    for (const a of p.actions) {
      if (a.kind === 'ambiguous')
        lines.push(
          `${''.padEnd(15)} left alone: ${a.serverName} (${a.reason})`,
        );
    }
    if (p.backupPath) lines.push(`${''.padEnd(15)} backup: ${p.backupPath}`);
  }
  return lines;
}

export function clientsNeedingReload(result: ActivationResult): string[] {
  if (result.dryRun) return [];
  return result.clients
    .filter((p) => p.status === 'changed' && !p.rolledBack)
    .map((p) => p.client);
}
