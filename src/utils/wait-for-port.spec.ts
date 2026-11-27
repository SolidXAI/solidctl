import net from 'net';
import { isLocalPortOpen, waitForLocalPort } from './wait-for-port';

function listen(port = 0): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('expected a TCP address'));
        return;
      }
      resolve({
        port: address.port,
        close: () =>
          new Promise((done, fail) => {
            server.close((error) => (error ? fail(error) : done()));
          }),
      });
    });
  });
}

describe('waitForLocalPort', () => {
  it('resolves once a local port starts accepting connections', async () => {
    const server = await listen();
    try {
      expect(await isLocalPortOpen(server.port)).toBe(true);
      expect(await waitForLocalPort(server.port, { timeoutMs: 1_000, intervalMs: 50 })).toBe(true);
    } finally {
      await server.close();
    }
  });

  it('returns false when cancelled or the timeout elapses', async () => {
    const free = await listen();
    const port = free.port;
    await free.close();

    expect(await isLocalPortOpen(port)).toBe(false);
    expect(
      await waitForLocalPort(port, { timeoutMs: 80, intervalMs: 20, isAlive: () => false }),
    ).toBe(false);
    expect(await waitForLocalPort(port, { timeoutMs: 80, intervalMs: 20 })).toBe(false);
  });
});
