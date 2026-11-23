/**
 * Minimal line-based editor for the `[mcp_servers.*]` tables in Codex's
 * config.toml. It never re-serializes the document: unrelated lines, comments
 * and formatting are left byte-for-byte intact. Handles quoted table names,
 * child tables such as `.http_headers` (contiguous or not), inline
 * `http_headers = { ... }` and multi-line strings that contain `[` lines.
 */

export interface TomlSegment {
  /** index of the header line */
  start: number;
  /** exclusive end line index */
  end: number;
  path: string[];
}

export interface CodexServer {
  name: string;
  main?: TomlSegment;
  segments: TomlSegment[];
  url?: string;
  enabled?: boolean;
  hasSolidxKey: boolean;
  apiKey?: string;
}

const BARE_KEY_RE = /^[A-Za-z0-9_-]+$/;

export function formatTomlKey(key: string): string {
  return BARE_KEY_RE.test(key) ? key : JSON.stringify(key);
}

export function formatTomlString(value: string): string {
  return JSON.stringify(value);
}

/** Split a dotted TOML key path, honoring basic and literal quoted keys. */
export function splitTomlKeyPath(input: string): string[] | null {
  const out: string[] = [];
  let i = 0;
  const s = input.trim();
  const skipWs = () => {
    while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++;
  };
  while (i < s.length) {
    skipWs();
    if (s[i] === '"') {
      let j = i + 1;
      while (j < s.length && s[j] !== '"') j += s[j] === '\\' ? 2 : 1;
      if (j >= s.length) return null;
      try {
        out.push(JSON.parse(s.slice(i, j + 1)) as string);
      } catch {
        return null;
      }
      i = j + 1;
    } else if (s[i] === "'") {
      const j = s.indexOf("'", i + 1);
      if (j < 0) return null;
      out.push(s.slice(i + 1, j));
      i = j + 1;
    } else {
      const m = /^[A-Za-z0-9_-]+/.exec(s.slice(i));
      if (!m) return null;
      out.push(m[0]);
      i += m[0].length;
    }
    skipWs();
    if (i < s.length) {
      if (s[i] !== '.') return null;
      i++;
    }
  }
  return out.length ? out : null;
}

const TABLE_HEADER_RE = /^\s*\[\s*([^[\]].*?)\s*\]\s*(?:#.*)?\r?$/;
const ARRAY_HEADER_RE = /^\s*\[\[\s*(.+?)\s*\]\]\s*(?:#.*)?\r?$/;

function multilineToggles(
  line: string,
  state: '"""' | "'''" | null,
): '"""' | "'''" | null {
  let current = state;
  let i = 0;
  while (i < line.length) {
    if (current) {
      const idx = line.indexOf(current, i);
      if (idx < 0) return current;
      i = idx + 3;
      current = null;
    } else {
      if (line[i] === '#') return null;
      const dq = line.indexOf('"""', i);
      const sq = line.indexOf("'''", i);
      const hash = line.indexOf('#', i);
      const candidates = [dq, sq].filter((n) => n >= 0);
      if (!candidates.length) return null;
      const first = Math.min(...candidates);
      if (hash >= 0 && hash < first) return null;
      current = first === dq ? '"""' : "'''";
      i = first + 3;
    }
  }
  return current;
}

/** All table / array-of-table headers, skipping lines inside multi-line strings. */
export function scanTomlSegments(lines: string[]): TomlSegment[] {
  const headers: { line: number; path: string[] }[] = [];
  let inString: '"""' | "'''" | null = null;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!inString) {
      const arr = ARRAY_HEADER_RE.exec(line);
      const tbl = arr ? null : TABLE_HEADER_RE.exec(line);
      const raw = arr?.[1] ?? tbl?.[1];
      if (raw !== undefined) {
        headers.push({
          line: idx,
          path: splitTomlKeyPath(raw) ?? [`<unparsed:${raw}>`],
        });
        continue;
      }
    }
    inString = multilineToggles(line, inString);
  }
  return headers.map((h, i) => ({
    start: h.line,
    end: i + 1 < headers.length ? headers[i + 1].line : lines.length,
    path: h.path,
  }));
}

const KV_RE =
  /^(\s*)("(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)\s*=\s*(.*?)\s*\r?$/;

function unquoteKey(raw: string): string {
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw;
    }
  }
  if (raw.startsWith("'")) return raw.slice(1, -1);
  return raw;
}

export function parseTomlScalar(raw: string): string | boolean | undefined {
  const v = raw.trim();
  const basic = /^"((?:[^"\\]|\\.)*)"/.exec(v);
  if (basic) {
    try {
      return JSON.parse(`"${basic[1]}"`) as string;
    } catch {
      return basic[1];
    }
  }
  const literal = /^'([^']*)'/.exec(v);
  if (literal) return literal[1];
  if (/^true\b/.test(v)) return true;
  if (/^false\b/.test(v)) return false;
  return undefined;
}

interface KeyLine {
  index: number;
  indent: string;
  key: string;
  value: string;
}

function keyLines(lines: string[], seg: TomlSegment): KeyLine[] {
  const out: KeyLine[] = [];
  for (let i = seg.start + 1; i < seg.end; i++) {
    const m = KV_RE.exec(lines[i]);
    if (m)
      out.push({ index: i, indent: m[1], key: unquoteKey(m[2]), value: m[3] });
  }
  return out;
}

const INLINE_KEY_RE = /(["']?)solidx-api-key\1\s*=\s*"((?:[^"\\]|\\.)*)"/i;
const ANY_KEY_RE = /(["']?)solidx-api-key\1\s*=/i;

export function parseCodexServers(text: string): CodexServer[] {
  const lines = text.split('\n');
  const segments = scanTomlSegments(lines);
  const byName = new Map<string, CodexServer>();
  for (const seg of segments) {
    if (seg.path[0] !== 'mcp_servers' || seg.path.length < 2) continue;
    const name = seg.path[1];
    let server = byName.get(name);
    if (!server) {
      server = { name, segments: [], hasSolidxKey: false };
      byName.set(name, server);
    }
    server.segments.push(seg);
    if (seg.path.length === 2) server.main = seg;
    const kvs = keyLines(lines, seg);
    for (const kv of kvs) {
      if (seg.path.length === 2) {
        if (kv.key === 'url') {
          const v = parseTomlScalar(kv.value);
          if (typeof v === 'string') server.url = v;
        } else if (kv.key === 'enabled') {
          const v = parseTomlScalar(kv.value);
          if (typeof v === 'boolean') server.enabled = v;
        }
      }
      if (
        seg.path.length === 3 &&
        seg.path[2] === 'http_headers' &&
        kv.key.toLowerCase() === 'solidx-api-key'
      ) {
        server.hasSolidxKey = true;
        const v = parseTomlScalar(kv.value);
        if (typeof v === 'string') server.apiKey = v;
      }
    }
    for (let i = seg.start + 1; i < seg.end; i++) {
      if (ANY_KEY_RE.test(lines[i])) {
        server.hasSolidxKey = true;
        const inline = INLINE_KEY_RE.exec(lines[i]);
        if (inline && server.apiKey === undefined) {
          try {
            server.apiKey = JSON.parse(`"${inline[2]}"`) as string;
          } catch {
            server.apiKey = inline[2];
          }
        }
      }
    }
  }
  return [...byName.values()];
}

function findServer(
  text: string,
  name: string,
): { lines: string[]; server: CodexServer } {
  const server = parseCodexServers(text).find((s) => s.name === name);
  if (!server) throw new Error(`Codex server "${name}" not found`);
  return { lines: text.split('\n'), server };
}

function lineEnding(lines: string[]): string {
  return lines.some((l) => l.endsWith('\r')) ? '\r' : '';
}

/** Set (or insert) `key = value` in the server's main table. */
function setMainKey(
  text: string,
  name: string,
  key: string,
  tomlValue: string,
): string {
  const { lines, server } = findServer(text, name);
  if (!server.main)
    throw new Error(
      `Codex server "${name}" has no [mcp_servers.${name}] table`,
    );
  const cr = lineEnding(lines);
  const existing = keyLines(lines, server.main).find((kv) => kv.key === key);
  if (existing) {
    lines[existing.index] = `${existing.indent}${key} = ${tomlValue}${cr}`;
  } else {
    lines.splice(server.main.start + 1, 0, `${key} = ${tomlValue}${cr}`);
  }
  return lines.join('\n');
}

export function setCodexServerEnabled(
  text: string,
  name: string,
  enabled: boolean,
): string {
  return setMainKey(text, name, 'enabled', enabled ? 'true' : 'false');
}

export function setCodexServerUrl(
  text: string,
  name: string,
  url: string,
): string {
  return setMainKey(text, name, 'url', formatTomlString(url));
}

export function setCodexServerApiKey(
  text: string,
  name: string,
  apiKey: string,
): string {
  const { lines, server } = findServer(text, name);
  const cr = lineEnding(lines);
  const headerSeg = server.segments.find(
    (s) => s.path.length === 3 && s.path[2] === 'http_headers',
  );
  if (headerSeg) {
    const kv = keyLines(lines, headerSeg).find(
      (k) => k.key.toLowerCase() === 'solidx-api-key',
    );
    if (kv) {
      lines[kv.index] =
        `${kv.indent}solidx-api-key = ${formatTomlString(apiKey)}${cr}`;
    } else {
      lines.splice(
        headerSeg.start + 1,
        0,
        `solidx-api-key = ${formatTomlString(apiKey)}${cr}`,
      );
    }
    return lines.join('\n');
  }
  for (const seg of server.segments) {
    for (let i = seg.start + 1; i < seg.end; i++) {
      if (INLINE_KEY_RE.test(lines[i])) {
        lines[i] = lines[i].replace(
          INLINE_KEY_RE,
          (_m, q: string) =>
            `${q}solidx-api-key${q} = ${formatTomlString(apiKey)}`,
        );
        return lines.join('\n');
      }
    }
  }
  const last = server.segments[server.segments.length - 1];
  let insertAt = last.end;
  while (insertAt - 1 > last.start && lines[insertAt - 1].trim() === '')
    insertAt--;
  lines.splice(
    insertAt,
    0,
    `${cr}`,
    `[mcp_servers.${formatTomlKey(name)}.http_headers]${cr}`,
    `solidx-api-key = ${formatTomlString(apiKey)}${cr}`,
  );
  return lines.join('\n');
}

export function buildCodexServerBlock(
  name: string,
  url: string,
  apiKey: string,
): string {
  const key = formatTomlKey(name);
  return [
    `[mcp_servers.${key}]`,
    `enabled = true`,
    `url = ${formatTomlString(url)}`,
    ``,
    `[mcp_servers.${key}.http_headers]`,
    `solidx-api-key = ${formatTomlString(apiKey)}`,
    ``,
  ].join('\n');
}

export function appendCodexServer(
  text: string,
  name: string,
  url: string,
  apiKey: string,
): string {
  const block = buildCodexServerBlock(name, url, apiKey);
  if (text.length === 0) return block;
  const separator = text.endsWith('\n\n')
    ? ''
    : text.endsWith('\n')
      ? '\n'
      : '\n\n';
  return text + separator + block;
}
