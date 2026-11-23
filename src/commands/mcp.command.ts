import { Command } from 'commander';
import { superviseRuntime } from '../helpers/runtime-supervisor';
import { validateProjectRoot } from '../helper';
import {
  checkAgentUpdate,
  ensureAgentInstalled,
  ensureAgentInstalledLocal,
  getAgentVersion,
  printAgentVersion,
} from './agent-helper';
import {
  assertMcpDatabaseUrl,
  buildBridgedEnv,
  buildMcpLaunchConfig,
  printBridgeSummary,
} from './mcp-launch';
import { registerMcpInstallCommand } from './mcp/mcp-install.command';
import {
  activateMcpForRuntime,
  describePortState,
  inspectMcpPort,
} from './mcp/mcp-lifecycle';

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
    .description(
      'Start the MCP server using Streamable HTTP transport, then switch MCP clients to this project',
    )
    .option('--plain', 'Disable interactive terminal controls')
    .option('-p, --port <port>', 'Port number', '9000')
    .option('-H, --host <host>', 'Host to bind', '0.0.0.0')
    .option('-l, --log-level <level>', 'Logging level', 'INFO')
    .option(
      '--mount-path <path>',
      'Path under which to mount the MCP app',
      '/mcp',
    )
    .option(
      '--local',
      'Install agent from local source (pip install -e .[full]) instead of PyPI',
    )
    .action(
      async (options: {
        port: string;
        host: string;
        logLevel: string;
        mountPath: string;
        plain?: boolean;
        local?: boolean;
      }) => {
        await checkAgentUpdate({ isLocal: Boolean(options.local) });
        validateProjectRoot();
        const projectRoot = process.cwd();
        const env = buildBridgedEnv(projectRoot);

        try {
          assertMcpDatabaseUrl(env);
        } catch (error) {
          console.error(
            `❌ ${error instanceof Error ? error.message : String(error)}`,
          );
          process.exit(1);
        }

        // Fail before touching anything when the port is taken, so MCP clients
        // are never switched to a project whose server could not start.
        const portState = await inspectMcpPort(
          options.host,
          options.port,
          projectRoot,
        );
        if (portState.kind !== 'free') {
          console.error(`❌ ${describePortState(portState, options.port)}`);
          process.exit(1);
        }

        // Resolve and auto-install the agent before we print the startup banner.
        // This keeps the CLI honest on Ubuntu: if Python/venv/bootstrap fails, we
        // should not imply that the MCP server actually started listening yet.
        const agentCommand = options.local
          ? ensureAgentInstalledLocal()
          : ensureAgentInstalled();
        printAgentVersion(agentCommand);
        printBridgeSummary(env);
        const launch = buildMcpLaunchConfig(agentCommand, options, env);
        console.log(
          `▶ Starting SolidX MCP Server on ${options.host}:${options.port}`,
        );

        let running = true;
        const activation = activateMcpForRuntime({
          projectRoot,
          bindHost: options.host,
          port: options.port,
          mountPath: options.mountPath,
          log: (message) => console.log(`[solidctl] ${message}`),
          isAlive: () => running,
        });
        const status = await superviseRuntime(launch.command, launch.args, {
          cwd: launch.cwd,
          label: 'MCP',
          plain: options.plain,
          env: launch.env,
          shell: process.platform === 'win32',
        });
        running = false;
        await activation;

      if (status !== 0) {
        console.error('❌ MCP server exited with code', status);
        process.exitCode = status;
      }
    });

  registerMcpInstallCommand(mcp);
}
