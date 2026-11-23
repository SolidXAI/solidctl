import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

export function readTextOrNull(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/** Follow a symlinked config file so dotfile managers keep their link. */
export function resolveWriteTarget(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return filePath;
  }
}

/**
 * Replace `filePath` atomically: write a sibling temp file with the original
 * mode (0600 for new files, since these configs carry API keys), then rename.
 */
export function atomicWriteFile(filePath: string, content: string): void {
  const target = resolveWriteTarget(filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  let mode = 0o600;
  try {
    mode = fs.statSync(target).mode & 0o777;
  } catch {
    // new file
  }
  const tmp = `${target}.solidx-tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  const fd = fs.openSync(tmp, 'w', mode);
  try {
    fs.writeFileSync(fd, content);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.chmodSync(tmp, mode);
    fs.renameSync(tmp, target);
  } catch (err) {
    fs.removeSync(tmp);
    throw err;
  }
}

/** Copy `filePath` to a uniquely named, owner-only backup. */
export function uniqueBackup(
  filePath: string,
  now: Date = new Date(),
): string | null {
  const source = resolveWriteTarget(filePath);
  if (!fs.existsSync(source)) return null;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
  const backupPath = `${source}.solidx-bak-${ts}-${crypto.randomBytes(3).toString('hex')}`;
  fs.copyFileSync(source, backupPath, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(backupPath, 0o600);
  return backupPath;
}

export interface LockOptions {
  timeoutMs?: number;
  staleMs?: number;
  pollMs?: number;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function lockIsStale(lockPath: string, staleMs: number): boolean {
  let ageMs: number;
  try {
    ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
  } catch {
    return true;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as {
      pid?: unknown;
    };
    const pid = Number(parsed?.pid);
    if (Number.isInteger(pid) && pid > 0 && !isProcessAlive(pid)) return true;
  } catch {
    // Unreadable or half-written lock: only stale once it is old.
  }
  return ageMs > staleMs;
}

/** Serialize cooperating solidctl processes that edit MCP client configs. */
export async function withFileLock<T>(
  lockPath: string,
  fn: () => Promise<T> | T,
  opts: LockOptions = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const staleMs = opts.staleMs ?? 120_000;
  const pollMs = opts.pollMs ?? 100;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true, mode: 0o700 });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const fd = fs.openSync(lockPath, 'wx', 0o600);
      fs.writeFileSync(
        fd,
        JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
      );
      fs.closeSync(fd);
      break;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      if (lockIsStale(lockPath, staleMs)) {
        fs.removeSync(lockPath);
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `Another solidctl process is updating MCP client configurations (lock: ${lockPath}). Try again shortly.`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
  try {
    return await fn();
  } finally {
    fs.removeSync(lockPath);
  }
}
