import net from 'net';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 1_000;
const CONNECT_TIMEOUT_MS = 1_000;
const LOCAL_HOSTS = ['127.0.0.1', '::1', 'localhost'] as const;

function isPortOpenOnHost(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const finish = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

export async function isLocalPortOpen(port: number): Promise<boolean> {
  for (const host of LOCAL_HOSTS) {
    if (await isPortOpenOnHost(port, host)) {
      return true;
    }
  }
  return false;
}

/** Poll until a local TCP port accepts connections, the waiter is cancelled, or the timeout elapses. */
export async function waitForLocalPort(
  port: number,
  options: {
    isAlive?: () => boolean;
    timeoutMs?: number;
    intervalMs?: number;
  } = {},
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (options.isAlive && !options.isAlive()) {
      return false;
    }
    if (await isLocalPortOpen(port)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return options.isAlive && !options.isAlive() ? false : isLocalPortOpen(port);
}
