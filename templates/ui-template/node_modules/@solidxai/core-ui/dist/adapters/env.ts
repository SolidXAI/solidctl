export function env(key: string, fallback = ""): string {
  const candidates: string[] = [];

  if (key.startsWith("NEXT_PUBLIC_")) {
    candidates.push(`VITE_${key.slice("NEXT_PUBLIC_".length)}`, key);
  } else if (key.startsWith("VITE_")) {
    candidates.push(key, `NEXT_PUBLIC_${key.slice("VITE_".length)}`);
  } else {
    candidates.push(`VITE_${key}`, `NEXT_PUBLIC_${key}`, key);
  }

  const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
  if (metaEnv) {
    for (const candidate of candidates) {
      const value = metaEnv[candidate];
      if (typeof value === "string") return value;
    }
  }

  const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (maybeProcess?.env) {
    for (const candidate of candidates) {
      const value = maybeProcess.env[candidate];
      if (typeof value === "string") return value;
    }
  }

  return fallback;
}
