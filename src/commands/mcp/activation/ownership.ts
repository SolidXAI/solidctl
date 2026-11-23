/**
 * Decides which MCP client entries belong to SolidX local development and may
 * be switched on or off. A name prefix alone is not proof of ownership: an
 * entry must also have the SolidX connection shape (a `solidx-api-key`
 * header) and point at a local address. Partial matches are reported, never
 * modified.
 */

export type EntryOwnership = 'managed' | 'ambiguous' | 'unrelated';

export const CONVENTIONAL_SERVER_NAME_RE =
  /^solidx-[a-z0-9]+(?:-[a-z0-9]+)*-mcp$/;

const LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '[::]',
]);

export function parseUrl(url: string | undefined): URL | null {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function isLocalUrl(url: string | undefined): boolean {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  return LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
}

function effectivePort(u: URL): string {
  if (u.port) return u.port;
  return u.protocol === 'https:' ? '443' : '80';
}

/** Same local endpoint (any loopback spelling) and port. */
export function sameLocalEndpoint(
  a: string | undefined,
  b: string | undefined,
): boolean {
  const ua = parseUrl(a);
  const ub = parseUrl(b);
  if (!ua || !ub) return false;
  return (
    isLocalUrl(a) && isLocalUrl(b) && effectivePort(ua) === effectivePort(ub)
  );
}

export interface EntryFacts {
  name: string;
  url?: string;
  hasSolidxKey: boolean;
}

function isNameOwned(name: string, knownNames: ReadonlySet<string>): boolean {
  return CONVENTIONAL_SERVER_NAME_RE.test(name) || knownNames.has(name);
}

export function classifyEntry(
  facts: EntryFacts,
  knownNames: ReadonlySet<string>,
  targetUrl: string,
): EntryOwnership {
  if (!isLocalUrl(facts.url)) return 'unrelated';
  const nameOwned = isNameOwned(facts.name, knownNames);
  if (nameOwned && facts.hasSolidxKey) return 'managed';
  if (nameOwned || facts.hasSolidxKey) return 'ambiguous';
  if (sameLocalEndpoint(facts.url, targetUrl)) return 'ambiguous';
  return 'unrelated';
}

export function ambiguityReason(
  facts: EntryFacts,
  knownNames: ReadonlySet<string>,
): string {
  if (isNameOwned(facts.name, knownNames))
    return 'SolidX-style name but no solidx-api-key header';
  if (facts.hasSolidxKey)
    return 'sends a solidx-api-key header but does not use a SolidX-managed name';
  return 'points at the same local MCP endpoint but is not a SolidX-managed entry';
}
