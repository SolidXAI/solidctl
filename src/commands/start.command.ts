import { ChildProcess, spawn } from 'child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import { validateProjectRoot, validateProjectScript } from '../helper';
import {
  EmbeddedServerHandle,
  getEmbeddedConfig,
  isEmbeddedProject,
  startEmbeddedServer,
  stopEmbeddedServer,
} from '../db/embedded';
import { AgentCommandExit } from './agent-helper';
import { MCP_DEFAULT_OPTIONS, resolveMcpLaunchConfig, spawnMcpServer, type McpLaunchConfig } from './mcp-launch';

type ServiceName = 'api' | 'ui' | 'mcp';

/** Services that are launched via an npm script. MCP is spawned directly. */
type ScriptServiceName = 'api' | 'ui';

type ServiceScripts = Record<ScriptServiceName, string>;

type ServiceConfig = {
  cwd: string;
  label: string;
  color: (text: string) => string;
};

type ServiceState = {
  child: ChildProcess | null;
  restartRequested: boolean;
  stoppingForShutdown: boolean;
  outputBuffer: string;
  forceKillTimer: NodeJS.Timeout | null;
};

type StartOptions = {
  api?: boolean;
  controls?: boolean;
  plain?: boolean;
  ui?: boolean;
  mcp?: boolean;
};

class StartSupervisor {
  private readonly activeServices: ServiceName[];
  private readonly apiPort: string;
  private readonly uiPort: string;
  private readonly serviceConfigs: Record<ServiceName, ServiceConfig>;
  private readonly serviceScripts: ServiceScripts;
  private readonly serviceStates: Record<ServiceName, ServiceState>;
  private readonly isInteractive: boolean;
  private readonly npmCommand: string;
  private readonly isEmbedded: boolean;
  private readonly supportsMcp: boolean;
  private mcpPort: string;
  private embeddedServer: EmbeddedServerHandle | null = null;
  private mcpLaunchConfig: McpLaunchConfig | null = null;
  private shuttingDown = false;
  private startupPhase = true;
  private startupAbortInProgress = false;
  private exitCode = 0;
  private stdinWasRaw = false;

  constructor(
    private readonly projectRoot: string,
    serviceScripts: ServiceScripts,
    options: StartOptions,
    supportsMcp = false,
  ) {
    this.isInteractive = Boolean(process.stdout.isTTY && process.stdin.isTTY && !options.plain);
    this.npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    this.isEmbedded = isEmbeddedProject(projectRoot);
    this.supportsMcp = supportsMcp;
    this.serviceScripts = serviceScripts;
    this.activeServices = this.resolveActiveServices(options);
    this.apiPort = this.resolveApiPort();
    this.uiPort = this.resolveUiPort();
    this.mcpPort = MCP_DEFAULT_OPTIONS.port;

    this.serviceConfigs = {
      api: {
        cwd: path.join(projectRoot, 'solid-api'),
        label: 'api',
        color: chalk.cyan,
      },
      ui: {
        cwd: path.join(projectRoot, 'solid-ui'),
        label: 'ui',
        color: chalk.magenta,
      },
      mcp: {
        cwd: projectRoot,
        label: 'mcp',
        color: chalk.green,
      },
    };

    this.serviceStates = {
      api: this.createInitialState(),
      ui: this.createInitialState(),
      mcp: this.createInitialState(),
    };
  }

  async start() {
    this.attachSignalHandlers();

    this.printStatus('Starting SolidX dev processes');

    let shouldStartServices = true;

    try {
      if (this.isEmbedded) {
        await this.startEmbeddedDatabase();
        shouldStartServices = !this.shuttingDown;
      }

      if (shouldStartServices && this.activeServices.includes('mcp')) {
        await this.startMcpServer();
        shouldStartServices = !this.shuttingDown;
      }

      if (shouldStartServices) {
        this.startupPhase = false;
        this.attachKeyboardControls();
        for (const serviceName of this.activeServices) {
          this.spawnService(serviceName);
        }
        this.renderFooter();

        await new Promise<void>((resolve) => {
          const poll = setInterval(() => {
            if (!this.hasRunningChildren()) {
              clearInterval(poll);
              resolve();
            }
          }, 100);
        });
      }
    } catch (error) {
      if (error instanceof AgentCommandExit) {
        this.exitCode = error.exitCode;
      } else if (this.exitCode === 0) {
        this.exitCode = 1;
      }
      this.shuttingDown = true;
    } finally {
      this.startupPhase = false;
      await this.stopEmbeddedDatabase();
      this.cleanupTerminal();
    }

    process.exit(this.exitCode);
  }

  private async startEmbeddedDatabase() {
    const config = getEmbeddedConfig(this.projectRoot);
    this.printStatus('Starting embedded database (PGlite)');

    this.embeddedServer = startEmbeddedServer(config);
    this.embeddedServer.child.on('exit', () => {
      if (!this.shuttingDown) {
        this.printStatus('Embedded database stopped unexpectedly');
        this.shutdown(1);
      }
    });

    try {
      await this.embeddedServer.ready;
      if (this.shuttingDown) {
        return;
      }
      this.printStatus(`Embedded database ready on ${config.host}:${config.port}`);
    } catch (error) {
      if (this.shuttingDown) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.printStatus(`Embedded database failed to start: ${message}`);
      throw error;
    }
  }

  private async stopEmbeddedDatabase() {
    if (!this.embeddedServer) {
      return;
    }
    this.printStatus('Stopping embedded database');
    await stopEmbeddedServer(this.embeddedServer.child);
    this.embeddedServer = null;
  }

  private async startMcpServer() {
    this.printStatus('Starting MCP server');

    try {
      this.mcpLaunchConfig = await resolveMcpLaunchConfig(
        { ...MCP_DEFAULT_OPTIONS },
        this.projectRoot,
      );
      this.mcpPort = this.mcpLaunchConfig.args[
        this.mcpLaunchConfig.args.indexOf('--port') + 1
      ];
      this.printStatus(`MCP server config resolved (port ${this.mcpPort})`);
    } catch (error) {
      if (this.shuttingDown) {
        return;
      }
      if (error instanceof AgentCommandExit) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.printStatus(`MCP server failed to initialize: ${message}`);
      throw error;
    }
  }

  private createInitialState(): ServiceState {
    return {
      child: null,
      restartRequested: false,
      stoppingForShutdown: false,
      outputBuffer: '',
      forceKillTimer: null,
    };
  }

  private resolveActiveServices(options: StartOptions): ServiceName[] {
    const selectedServices: ServiceName[] = [];

    if (options.api) {
      selectedServices.push('api');
    }

    if (options.ui) {
      selectedServices.push('ui');
    }

    if (this.supportsMcp && options.mcp) {
      selectedServices.push('mcp');
    }

    if (selectedServices.length) {
      return selectedServices;
    }

    // No explicit selection: default to all available services.
    const defaults: ServiceName[] = ['api', 'ui'];
    if (this.supportsMcp) {
      defaults.push('mcp');
    }
    return defaults;
  }

  private spawnService(serviceName: ServiceName) {
    const config = this.serviceConfigs[serviceName];
    const state = this.serviceStates[serviceName];

    state.restartRequested = false;
    state.stoppingForShutdown = false;

    let child: ChildProcess;

    if (serviceName === 'mcp') {
      if (!this.mcpLaunchConfig) {
        this.printLog(serviceName, 'MCP launch config not available', true);
        this.handleUnexpectedExit(serviceName, 1);
        return;
      }
      child = spawnMcpServer(this.mcpLaunchConfig);
    } else {
      const scriptName = this.serviceScripts[serviceName as ScriptServiceName];
      child = spawn(this.npmCommand, ['run', scriptName], {
        cwd: config.cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        detached: process.platform !== 'win32',
      });
    }

    state.child = child;
    this.printStatus(`Started ${config.label}`);

    child.stdout?.on('data', (chunk: Buffer | string) => {
      this.handleChunk(serviceName, String(chunk), false);
    });

    child.stderr?.on('data', (chunk: Buffer | string) => {
      this.handleChunk(serviceName, String(chunk), true);
    });

    child.on('error', (error) => {
      this.printLog(serviceName, `Failed to start: ${error.message}`, true);
      this.handleUnexpectedExit(serviceName, 1);
    });

    child.on('exit', (code, signal) => {
      this.clearForceKillTimer(serviceName);
      this.flushBuffer(serviceName);
      state.child = null;

      if (this.shuttingDown || state.stoppingForShutdown) {
        this.printStatus(`${config.label} stopped`);
        return;
      }

      if (state.restartRequested) {
        this.printStatus(`Restarting ${config.label}`);
        this.spawnService(serviceName);
        return;
      }

      const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
      this.printLog(serviceName, `Exited unexpectedly with ${reason}`, true);
      this.handleUnexpectedExit(serviceName, typeof code === 'number' ? code : 1);
    });
  }

  private handleChunk(serviceName: ServiceName, chunk: string, isError: boolean) {
    const state = this.serviceStates[serviceName];
    state.outputBuffer += chunk;

    const lines = state.outputBuffer.split(/\r?\n/);
    state.outputBuffer = lines.pop() ?? '';

    for (const line of lines) {
      this.printLog(serviceName, line, isError);
    }
  }

  private flushBuffer(serviceName: ServiceName) {
    const state = this.serviceStates[serviceName];
    if (!state.outputBuffer) {
      return;
    }

    this.printLog(serviceName, state.outputBuffer, false);
    state.outputBuffer = '';
  }

  private printLog(serviceName: ServiceName, message: string, isError: boolean) {
    const config = this.serviceConfigs[serviceName];
    const prefix = config.color(`[${config.label}]`);
    const line = `${prefix} ${message}`;
    this.writeWithFooter(line, isError ? process.stderr : process.stdout);
  }

  private printStatus(message: string) {
    this.writeWithFooter(chalk.dim(`[solidctl] ${message}`), process.stdout);
  }

  private writeWithFooter(line: string, stream: NodeJS.WriteStream) {
    if (!this.isInteractive) {
      stream.write(`${line}\n`);
      return;
    }

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    stream.write(`${line}\n`);
    this.renderFooter();
  }

  private renderFooter() {
    if (!this.isInteractive) {
      return;
    }

    const serviceSegments: string[] = [];
    const controlSegments = ['q quit', 'c clear'];

    if (this.activeServices.includes('api')) {
      serviceSegments.push(`API (a restart, d docs, :${this.apiPort})`);
    }

    if (this.activeServices.includes('ui')) {
      serviceSegments.push(`UI (u restart, o open, :${this.uiPort})`);
    }

    if (this.activeServices.includes('mcp')) {
      serviceSegments.push(`MCP (m restart, :${this.mcpPort})`);
    }

    if (this.activeServices.length > 1) {
      controlSegments.push('r restart all');
    }

    const footer = [
      `${chalk.bold('Controls')}: ${controlSegments.join(' | ')}`,
      `${chalk.bold('Services')}: ${serviceSegments.join('  ')}`,
      `${chalk.bold('Project')}: ${path.basename(this.projectRoot)}`,
    ].join(chalk.dim(' | '));

    const terminalWidth = process.stdout.columns || 80;
    const renderedFooter = chalk.inverse(` ${footer} `);
    const safeFooter = this.truncateAnsiText(renderedFooter, terminalWidth);

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(safeFooter);
  }

  private truncateAnsiText(text: string, maxWidth: number) {
    if (maxWidth <= 0) {
      return '';
    }

    let visibleWidth = 0;
    let index = 0;
    let output = '';
    let lastEscapeIndex = -1;

    while (index < text.length) {
      if (text[index] === '\u001b') {
        const match = /\u001b\[[0-9;]*m/.exec(text.slice(index));
        if (!match) {
          break;
        }
        output += match[0];
        lastEscapeIndex = output.length;
        index += match[0].length;
        continue;
      }

      if (visibleWidth >= maxWidth) {
        break;
      }

      output += text[index];
      visibleWidth += 1;
      index += 1;
    }

    if (index < text.length && maxWidth >= 1) {
      let visibleChars = 0;
      let truncated = '';
      let cursor = 0;

      while (cursor < output.length) {
        if (output[cursor] === '\u001b') {
          const match = /\u001b\[[0-9;]*m/.exec(output.slice(cursor));
          if (!match) {
            break;
          }
          truncated += match[0];
          cursor += match[0].length;
          continue;
        }

        if (visibleChars >= Math.max(0, maxWidth - 1)) {
          break;
        }

        truncated += output[cursor];
        visibleChars += 1;
        cursor += 1;
      }

      output = `${truncated}\u2026`;
      if (lastEscapeIndex !== -1 && !output.endsWith('\u001b[0m')) {
        output += '\u001b[0m';
      }
    }

    return output;
  }

  private attachSignalHandlers() {
    process.on('SIGINT', () => {
      this.shutdown(0);
    });

    process.on('SIGTERM', () => {
      this.shutdown(0);
    });
  }

  private attachKeyboardControls() {
    if (!this.isInteractive) {
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    this.stdinWasRaw = Boolean(process.stdin.isRaw);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();

    process.stdin.on('keypress', (_str, key) => {
      if (key.ctrl && key.name === 'c') {
        this.shutdown(0);
        return;
      }

      switch (key.name) {
        case 'a':
          if (this.activeServices.includes('api')) {
            this.restartService('api');
          }
          break;
        case 'u':
          if (this.activeServices.includes('ui')) {
            this.restartService('ui');
          }
          break;
        case 'm':
          if (this.activeServices.includes('mcp')) {
            this.restartService('mcp');
          }
          break;
        case 'r':
          for (const serviceName of this.activeServices) {
            this.restartService(serviceName);
          }
          break;
        case 'c':
          console.clear();
          this.renderFooter();
          break;
        case 'd':
          if (this.activeServices.includes('api')) {
            this.openUrlInBrowser(this.getApiDocsUrl(), 'API docs');
          }
          break;
        case 'o':
          if (this.activeServices.includes('ui')) {
            this.openUrlInBrowser(this.getUiUrl(), 'UI');
          }
          break;
        case 'q':
          this.shutdown(0);
          break;
        default:
          break;
      }
    });
  }

  private restartService(serviceName: ServiceName) {
    const state = this.serviceStates[serviceName];

    if (!state.child) {
      this.printStatus(`${this.serviceConfigs[serviceName].label} is not running, starting it now`);
      this.spawnService(serviceName);
      this.renderFooter();
      return;
    }

    state.restartRequested = true;
    this.printStatus(`Stopping ${this.serviceConfigs[serviceName].label} for restart`);
    this.stopChild(serviceName);
  }

  private stopChild(serviceName: ServiceName) {
    const state = this.serviceStates[serviceName];
    const child = state.child;
    if (!child) {
      return;
    }

    this.terminateChild(serviceName, child, 'SIGTERM');
    this.scheduleForceKill(serviceName, child);
  }

  private terminateChild(serviceName: ServiceName, child: ChildProcess, signal: NodeJS.Signals) {
    try {
      if (process.platform !== 'win32' && child.pid) {
        process.kill(-child.pid, signal);
      } else {
        child.kill(signal);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.printLog(serviceName, `Failed to send ${signal}: ${message}`, true);
    }
  }

  private scheduleForceKill(serviceName: ServiceName, child: ChildProcess) {
    const state = this.serviceStates[serviceName];
    this.clearForceKillTimer(serviceName);

    state.forceKillTimer = setTimeout(() => {
      if (state.child !== child) {
        return;
      }

      this.printStatus(`Force killing ${this.serviceConfigs[serviceName].label}`);
      this.terminateChild(serviceName, child, 'SIGKILL');
    }, 5_000);
  }

  private clearForceKillTimer(serviceName: ServiceName) {
    const state = this.serviceStates[serviceName];
    if (!state.forceKillTimer) {
      return;
    }

    clearTimeout(state.forceKillTimer);
    state.forceKillTimer = null;
  }

  private handleUnexpectedExit(serviceName: ServiceName, code: number) {
    if (this.shuttingDown) {
      return;
    }

    this.exitCode = code === 0 ? 1 : code;
    this.shuttingDown = true;

    for (const otherServiceName of this.activeServices) {
      if (otherServiceName === serviceName) {
        continue;
      }

      const otherState = this.serviceStates[otherServiceName];
      if (otherState.child) {
        otherState.stoppingForShutdown = true;
        this.stopChild(otherServiceName);
      }
    }

    this.renderFooter();
  }

  private shutdown(code: number) {
    if (this.shuttingDown) {
      return;
    }

    this.exitCode = code;
    this.shuttingDown = true;
    this.printStatus('Shutting down');

    if (this.startupPhase) {
      if (!this.startupAbortInProgress) {
        this.startupAbortInProgress = true;
        void this.abortStartup();
      }
      return;
    }

    for (const serviceName of this.activeServices) {
      const state = this.serviceStates[serviceName];
      state.stoppingForShutdown = true;
      state.restartRequested = false;
      this.stopChild(serviceName);
    }

    this.renderFooter();
  }

  private async abortStartup() {
    await this.stopEmbeddedDatabase();
    this.cleanupTerminal();
    process.exit(this.exitCode);
  }

  private hasRunningChildren() {
    return this.activeServices.some((serviceName) => {
      return this.serviceStates[serviceName].child !== null;
    });
  }

  private cleanupTerminal() {
    if (!this.isInteractive) {
      return;
    }

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    if (!this.stdinWasRaw) {
      process.stdin.setRawMode?.(false);
    }
    process.stdout.write('\n');
  }

  private resolveApiPort() {
    const envPath = path.join(this.serviceConfigs?.api?.cwd ?? path.join(this.projectRoot, 'solid-api'), '.env');
    return this.readEnvValue(envPath, 'PORT') ?? '3000';
  }

  private resolveUiPort() {
    const packageJsonPath = path.join(this.serviceConfigs?.ui?.cwd ?? path.join(this.projectRoot, 'solid-ui'), 'package.json');

    try {
      const packageJson = fs.readJsonSync(packageJsonPath) as {
        scripts?: Record<string, string>;
      };
      const devScript = packageJson.scripts?.dev ?? '';
      const portMatch = /(?:^|\s)--port\s+(\d{1,5})(?:\s|$)/.exec(devScript);
      if (portMatch) {
        return portMatch[1];
      }
    } catch {
      // Fall back to the default Vite dev port when package.json cannot be read.
    }

    return '5173';
  }

  private readEnvValue(filePath: string, key: string) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = content.match(new RegExp(`^\\s*${escapedKey}\\s*=\\s*(.+?)\\s*$`, 'm'));
      return match?.[1]?.replace(/^['"]|['"]$/g, '') ?? null;
    } catch {
      return null;
    }
  }

  private getApiDocsUrl() {
    return `http://localhost:${this.apiPort}/docs`;
  }

  private getUiUrl() {
    return `http://localhost:${this.uiPort}`;
  }

  private openUrlInBrowser(url: string, label: string) {
    const openCommand = process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';
    const openArgs = process.platform === 'darwin'
      ? [url]
      : process.platform === 'win32'
        ? ['/c', 'start', '', url]
        : [url];

    const child = spawn(openCommand, openArgs, {
      detached: true,
      stdio: 'ignore',
    });

    child.on('error', (error) => {
      this.printStatus(`Failed to open ${label}: ${error.message}`);
    });

    child.unref();
    this.printStatus(`Opening ${label} at ${url}`);
  }
}

export function registerStartCommand(program: Command) {
  const registerSupervisorCommand = (
    commandName: string,
    description: string,
    serviceScripts: ServiceScripts,
    supportsMcp = false,
  ) => {
    const command = program
      .command(commandName)
      .description(description)
      .option('--api', 'Only supervise solid-api')
      .option('--controls', 'Enable interactive controls with pinned footer and keyboard shortcuts (default on TTYs)')
      .option('--plain', 'Disable interactive controls and print merged logs only')
      .option('--ui', 'Only supervise solid-ui');

    if (supportsMcp) {
      command.option('--mcp', 'Only supervise the MCP server');
    }

    command.action(async (options: StartOptions) => {
        validateProjectRoot();

        const selectedServices = [
          ...(options.api ? (['api'] as const) : []),
          ...(options.ui ? (['ui'] as const) : []),
          ...(supportsMcp && options.mcp ? (['mcp'] as const) : []),
        ];
        const activeServices = selectedServices.length ? selectedServices : (
          supportsMcp ? (['api', 'ui', 'mcp'] as const) : (['api', 'ui'] as const)
        );

        for (const serviceName of activeServices) {
          if (serviceName === 'mcp') continue;
          validateProjectScript(
            serviceName === 'api' ? 'solid-api' : 'solid-ui',
            serviceScripts[serviceName as ScriptServiceName],
          );
        }

        const supervisor = new StartSupervisor(process.cwd(), serviceScripts, options, supportsMcp);
        await supervisor.start();
      });
  };

  registerSupervisorCommand(
    'start:dev',
    'Start solid-api, solid-ui, and MCP dev processes in a single supervisor',
    {
      api: 'solidx:dev',
      ui: 'solidx:dev',
    },
    true,
  );

  registerSupervisorCommand(
    'start',
    'Start solid-api and solid-ui standard processes in a single supervisor',
    {
      api: 'start',
      ui: 'dev',
    },
  );
}
