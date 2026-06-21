/**
 * Standalone entrypoint that runs an embedded PGlite database exposed over the
 * PostgreSQL wire protocol. solidctl spawns this as a child process so generated
 * projects can connect with the normal `pg` driver without Docker or a native
 * PostgreSQL install.
 *
 * Configured entirely via environment variables (see PGLITE_READY_SENTINEL).
 * Dynamic import() is used because the PGlite packages are ESM-only and solidctl
 * is compiled to CommonJS.
 */

export const PGLITE_READY_SENTINEL = 'SOLIDX_PGLITE_READY';

async function main(): Promise<void> {
  const host = process.env.SOLIDX_PGLITE_HOST || '127.0.0.1';
  const port = Number(process.env.SOLIDX_PGLITE_PORT || '54329');
  const dataDir = process.env.SOLIDX_PGLITE_DATA;
  const maxConnections = Number(
    process.env.SOLIDX_PGLITE_MAX_CONNECTIONS || '50',
  );

  if (!dataDir) {
    console.error('SOLIDX_PGLITE_DATA is required');
    process.exit(1);
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');

  const db = await PGlite.create({ dataDir });
  const server = new PGLiteSocketServer({ db, host, port, maxConnections });
  await server.start();

  // Signal readiness to the parent process via stdout.
  console.log(`${PGLITE_READY_SENTINEL} ${host}:${port}`);

  let shuttingDown = false;
  const shutdown = async (code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await server.stop();
      await db.close();
    } catch {
      // best-effort shutdown
    }
    process.exit(code);
  };

  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));
}

// Only start the server when this file is executed directly (spawned as a child
// process), not when another module imports the exported sentinel constant.
if (require.main === module) {
  main().catch((err) => {
    console.error('Failed to start embedded PGlite server:', err);
    process.exit(1);
  });
}
