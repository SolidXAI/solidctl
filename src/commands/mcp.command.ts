import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { validateProjectRoot } from '../helper';
import { checkAgentUpdate, ensureAgentInstalled, ensureAgentInstalledLocal, getAgentVersion, printAgentVersion } from './agent-helper';
import { buildBridgedEnv, printBridgeSummary } from './mcp-launch';
import { registerMcpInstallCommand } from './mcp/mcp-install.command';

export function registerMcpCommand(program: Command) {
  const mcp = program
    .command('mcp')
    .description('SolidX MCP Server (Streamable HTTP) — for remote clients (Cursor, Codex, cloud desktops)');

  mcp
    .option('--version', 'Print the solidx-ai-agent version and exit')
    .action(async (options: { version?: boolean }) => {
      if (options.version) {
        await checkAgentUpdate({ isLocal: false });
        const agentCommand = ensureAgentInstalled();
        console.log(`solidx-ai-agent v${getAgentVersion(agentCommand)}`);
        process.exit(0);
      }
      mcp.help();
    });

  mcp
    .command('start')
    .description('Start the MCP server using Streamable HTTP transport')
    .option('-p, --port <port>', 'Port number', '9000')
    .option('-H, --host <host>', 'Host to bind', '0.0.0.0')
    .option('-l, --log-level <level>', 'Logging level', 'INFO')
    .option('--mount-path <path>', 'Path under which to mount the MCP app', '/mcp')
    .option('--local', 'Install agent from local source (pip install -e .[full]) instead of PyPI')
    .action(async (options: { port: string; host: string; logLevel: string; mountPath: string; local?: boolean }) => {
      await checkAgentUpdate({ isLocal: Boolean(options.local) });
      validateProjectRoot();
      const env = buildBridgedEnv();

      if (!env.DATABASE_URL) {
        console.error(
          '❌ DATABASE_URL is required for MCP mode.\n' +
          '   It is needed to validate API keys and write audit logs.\n' +
          '   Set it in your solid-api/.env or environment.',
        );
        process.exit(1);
      }

      // Resolve and auto-install the agent before we print the startup banner.
      // This keeps the CLI honest on Ubuntu: if Python/venv/bootstrap fails, we
      // should not imply that the MCP server actually started listening yet.
      const agentCommand = options.local ? ensureAgentInstalledLocal() : ensureAgentInstalled();
      printAgentVersion(agentCommand);
      printBridgeSummary(env);
      console.log(`▶ Starting SolidX MCP Server on ${options.host}:${options.port}`);
      const result = spawnSync(
        agentCommand,
        [
          'mcp-remote',
          '--host', options.host,
          '--port', options.port,
          '--log-level', options.logLevel,
          '--mount-path', options.mountPath,
        ],
        {
          cwd: env.SOLIDX_PROJECT_ROOT,
          stdio: 'inherit',
          env,
          shell: process.platform === 'win32',
        },
      );

      if (result.error) {
        console.error('❌ Failed to start MCP server:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ MCP server exited with code', result.status);
        process.exit(result.status ?? 1);
      }
    });

  registerMcpInstallCommand(mcp);
}
