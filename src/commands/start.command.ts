import { ChildProcess, spawn } from 'child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import { validateProjectRoot, validateProjectScript } from '../helper';
import { waitForLocalPort } from '../utils/wait-for-port';
import { AgentCommandExit } from './agent-helper';
import {
  AGENT_HUB_DEFAULT_PORT,
  parseAgentHubLogLevel,
  parseAgentHubPort,
  parseEnvAssignments,
  resolveAgentHubLaunchConfig,
  spawnAgentHubManager,
  type AgentHubLaunchConfig,
} from './agenthub.command';
import { getAgentHubVersion } from './agenthub-helper';
import {
  MCP_DEFAULT_OPTIONS,
  resolveMcpLaunchConfig,
  spawnMcpServer,
  type McpLaunchConfig,
} from './mcp-launch';
import {
  activateMcpForRuntime,
  describePortState,
  inspectMcpPort,
} from './mcp/mcp-lifecycle';
import {
  type DevPortMap,
  validateDevPortAssignments,
} from '../utils/dev-ports';

export type StartServiceName = 'api' | 'ui' | 'mcp' | 'agenthub';

type ServiceName = StartServiceName;

/** Services that are launched via an npm script. MCP and AgentHub are spawned directly. */
export type ScriptServiceName = 'api' | 'ui';

export type ServiceScripts = Record<ScriptServiceName, string>;

export type StartSupervisorFeatures = {
  supportsMcp?: boolean;
  supportsAgentHub?: boolean;
};

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

export type StartOptions = {
  api?: boolean;
  controls?: boolean;
  plain?: boolean;
  ui?: boolean;
  mcp?: boolean;
  agenthub?: boolean;
  agenthubPort?: string;
  agenthubHost?: string;
  agenthubLocal?: boolean;
  agenthubLogLevel?: string;
  agenthubEnv?: string[];
};

export function resolveStartServices(
  options: StartOptions,
  features: StartSupervisorFeatures = {},
): StartServiceName[] {
  const selected: StartServiceName[] = [];
  if (options.api) selected.push('api');
  if (options.ui) selected.push('ui');
  if (features.supportsMcp && options.mcp) selected.push('mcp');
  if (features.supportsAgentHub && options.agenthub) selected.push('agenthub');
  if (selected.length) {
    return selected;
  }

  const defaults: StartServiceName[] = ['api', 'ui'];
  if (features.supportsMcp) defaults.push('mcp');
  if (features.supportsAgentHub) defaults.push('agenthub');
  return defaults;
}

/** Service scripts used by `start:dev` — mirrors the mapping passed to registerSupervisorCommand. */
export const DEV_SERVICE_SCRIPTS: ServiceScripts = {
  api: 'solidx:dev',
  ui: 'solidx:dev',
};

/** Service scripts used by `start` — mirrors the mapping passed to registerSupervisorCommand. */
export const START_SERVICE_SCRIPTS: ServiceScripts = {
  api: 'start',
  ui: 'dev',
};

export class StartSupervisor {
  private readonly activeServices: ServiceName[];
  private readonly apiPort: string;
  private readonly uiPort: string;
  private readonly serviceConfigs: Record<ServiceName, ServiceConfig>;
  private readonly serviceScripts: ServiceScripts;
  private readonly serviceStates: Record<ServiceName, ServiceState>;
  private readonly isInteractive: boolean;
  private readonly npmCommand: string;
  private readonly startOptions: StartOptions;
  private mcpPort: string;
  private agenthubPort: string;
  private mcpLaunchConfig: McpLaunchConfig | null = null;
  private mcpActivationStarted = false;
  private agenthubLaunchConfig: AgentHubLaunchConfig | null = null;
  private agenthubCanStart = false;
  private shuttingDown = false;
  private startupPhase = true;
  private startupAbortInProgress = false;
  private exitCode = 0;
  private stdinWasRaw = false;

  constructor(
    private readonly projectRoot: string,
    serviceScripts: ServiceScripts,
    options: StartOptions,
    supportsMcpOrFeatures: boolean | StartSupervisorFeatures = false,
  ) {
    const features: StartSupervisorFeatures =
      typeof supportsMcpOrFeatures === 'boolean'
        ? { supportsMcp: supportsMcpOrFeatures }
        : supportsMcpOrFeatures;
    this.isInteractive = Boolean(process.stdout.isTTY && process.stdin.isTTY && !options.plain);
    this.npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    this.startOptions = options;
    this.serviceScripts = serviceScripts;
    this.activeServices = resolveStartServices(options, features);
    this.apiPort = this.resolveApiPort();
    this.uiPort = this.resolveUiPort();
    this.mcpPort = MCP_DEFAULT_OPTIONS.port;
    this.agenthubPort = options.agenthubPort ?? AGENT_HUB_DEFAULT_PORT;

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
      agenthub: {
        cwd: projectRoot,
        label: 'hub',
        color: chalk.yellow,
      },
    };

    this.serviceStates = {
      api: this.createInitialState(),
      ui: this.createInitialState(),
      mcp: this.createInitialState(),
      agenthub: this.createInitialState(),
    };
  }

  async start() {
    this.attachSignalHandlers();

    this.printStatus('Starting SolidX dev processes');

    let shouldStartServices = true;

    try {
      this.validatePortAssignments();

      if (shouldStartServices && this.activeServices.includes('agenthub')) {
        await this.prepareAgentHub();
        shouldStartServices = !this.shuttingDown;
      }

      if (shouldStartServices && this.activeServices.includes('mcp')) {
        await this.assertMcpPortAvailable();
        await this.startMcpServer();
        shouldStartServices = !this.shuttingDown;
      }

      if (shouldStartServices) {
        this.startupPhase = false;
        this.attachKeyboardControls();
        for (const serviceName of this.activeServices) {
          if (serviceName === 'agenthub') continue;
          this.spawnService(serviceName);
        }
        this.renderFooter();
        if (this.activeServices.includes('mcp')) {
          this.startMcpActivation();
        }
        await this.startAgentHubWhenReady();

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
      if (!(error instanceof AgentCommandExit)) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(message));
      }
      this.shuttingDown = true;
    } finally {
      this.startupPhase = false;
      this.cleanupTerminal();
    }

    process.exit(this.exitCode);
  }

  private validatePortAssignments() {
    const ports: DevPortMap = {};

    if (this.activeServices.includes('api')) {
      ports.api = this.apiPort;
    }

    if (this.activeServices.includes('ui')) {
      ports.ui = this.uiPort;
    }

    if (this.activeServices.includes('mcp')) {
      ports.mcp = this.mcpPort;
    }

    if (this.activeServices.includes('agenthub')) {
      ports.agenthub = this.agenthubPort;
    }

    const conflict = validateDevPortAssignments(ports);
    if (conflict) {
      throw new Error(conflict);
    }
  }

  /** A taken port must abort before anything starts or any client is switched. */
  private async assertMcpPortAvailable() {
    const state = await inspectMcpPort(
      MCP_DEFAULT_OPTIONS.host,
      this.mcpPort,
      this.projectRoot,
    );
    if (state.kind !== 'free') {
      throw new Error(describePortState(state, this.mcpPort));
    }
  }

  /** Runs once per supervisor; MCP restarts ('m') keep the existing selection. */
  private startMcpActivation() {
    if (this.mcpActivationStarted || !this.mcpLaunchConfig) {
      return;
    }
    this.mcpActivationStarted = true;
    const args = this.mcpLaunchConfig.args;
    const argValue = (flag: string, fallback: string) => {
      const index = args.indexOf(flag);
      return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
    };
    void activateMcpForRuntime({
      projectRoot: this.projectRoot,
      bindHost: argValue('--host', MCP_DEFAULT_OPTIONS.host),
      port: this.mcpPort,
      mountPath: argValue('--mount-path', MCP_DEFAULT_OPTIONS.mountPath),
      log: (message) => this.printStatus(message),
      isAlive: () => !this.shuttingDown,
    });
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

  /**
   * Env missing is a hard failure. Runtime install/update failures are skipped
   * when other services will still run, so start:dev can continue.
   */
  private async prepareAgentHub() {
    const logLevel = parseAgentHubLogLevel(
      this.startOptions.agenthubLogLevel,
      '--agenthub-log-level',
    );
    parseEnvAssignments(this.startOptions.agenthubEnv, '--agenthub-env');
    this.printStatus('Preparing AgentHub manager');
    try {
      this.agenthubLaunchConfig = await resolveAgentHubLaunchConfig(this.projectRoot, {
        port: this.agenthubPort,
        host: this.startOptions.agenthubHost,
        local: this.startOptions.agenthubLocal,
        env: this.startOptions.agenthubEnv,
        logLevel,
      });
      this.agenthubPort = this.agenthubLaunchConfig.port;
      this.printStatus(
        `AgentHub config resolved (solidx-agenthub-runtime v${getAgentHubVersion(this.agenthubLaunchConfig.command)}, port ${this.agenthubPort})`,
      );
    } catch (error) {
      if (this.shuttingDown) {
        return;
      }
      if (error instanceof AgentCommandExit) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      const envMissing = /AgentHub requires /.test(message);
      if (envMissing || this.activeServices.every((service) => service === 'agenthub')) {
        throw error instanceof Error ? error : new Error(message);
      }
      this.printStatus(`⚠ AgentHub setup failed; continuing without it. ${message}`);
      this.agenthubLaunchConfig = null;
    }
  }

  private async startAgentHubWhenReady() {
    if (!this.activeServices.includes('agenthub') || !this.agenthubLaunchConfig) {
      return;
    }

    if (this.activeServices.includes('api')) {
      this.printStatus(`Waiting for API on port ${this.apiPort} before starting AgentHub`);
      const ready = await waitForLocalPort(Number(this.apiPort), {
        isAlive: () => !this.shuttingDown,
      });
      if (!ready || this.shuttingDown) {
        if (!this.shuttingDown) {
          this.printStatus(
            `API did not become ready on port ${this.apiPort}; AgentHub was not started`,
          );
        }
        return;
      }
    }

    this.agenthubCanStart = true;
    this.spawnService('agenthub');
    this.renderFooter();
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
    } else if (serviceName === 'agenthub') {
      if (!this.agenthubLaunchConfig) {
        this.printStatus('AgentHub is not available');
        return;
      }
      if (!this.agenthubCanStart) {
        this.printStatus('AgentHub will start after the API is ready');
        return;
      }
      child = spawnAgentHubManager(
        this.agenthubLaunchConfig.command,
        this.projectRoot,
        this.agenthubLaunchConfig.env,
        this.agenthubLaunchConfig.port,
        this.agenthubLaunchConfig.logLevel,
      );
    } else {
      const scriptName = this.serviceScripts[serviceName as ScriptServiceName];
      child = spawn(this.npmCommand, ['run', scriptName], {
        cwd: config.cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
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

    if (this.activeServices.includes('agenthub')) {
      serviceSegments.push(`Hub (h restart, :${this.agenthubPort})`);
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
        case 'h':
          if (this.activeServices.includes('agenthub')) {
            this.restartService('agenthub');
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
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
      } else if (process.platform !== 'win32' && child.pid) {
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

  private abortStartup() {
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
    features: StartSupervisorFeatures = {},
  ) => {
    const command = program
      .command(commandName)
      .description(description)
      .option('--api', 'Only supervise solid-api')
      .option('--controls', 'Enable interactive controls with pinned footer and keyboard shortcuts (default on TTYs)')
      .option('--plain', 'Disable interactive controls and print merged logs only')
      .option('--ui', 'Only supervise solid-ui');

    if (features.supportsMcp) {
      command.option('--mcp', 'Only supervise the MCP server');
    }

    if (features.supportsAgentHub) {
      command
        .option('--agenthub', 'Only supervise the AgentHub manager')
        .option(
          '--agenthub-port <port>',
          'AgentHub manager port',
          AGENT_HUB_DEFAULT_PORT,
        )
        .option(
          '--agenthub-host <host>',
          'AgentHub manager bind host (default: AGENT_HUB_MANAGER_BIND_HOST or 127.0.0.1)',
        )
        .option(
          '--agenthub-local',
          'Install AgentHub from AGENT_HUB_RUNTIME_PATH in editable mode',
        )
        .option(
          '--agenthub-log-level <level>',
          'AgentHub logging verbosity: CRITICAL, ERROR, WARNING, INFO, or DEBUG',
        )
        .option(
          '--agenthub-env <KEY=VALUE>',
          'Pass an environment variable to AgentHub (repeatable)',
          (value, previous: string[] = []) => [...previous, value],
          [],
        );
    }

    command.action(async (options: StartOptions) => {
        validateProjectRoot();

        if (features.supportsAgentHub) {
          parseAgentHubPort(options.agenthubPort ?? AGENT_HUB_DEFAULT_PORT, '--agenthub-port');
          parseAgentHubLogLevel(options.agenthubLogLevel, '--agenthub-log-level');
          parseEnvAssignments(options.agenthubEnv, '--agenthub-env');
        }

        const activeServices = resolveStartServices(options, features);

        for (const serviceName of activeServices) {
          if (serviceName === 'mcp' || serviceName === 'agenthub') continue;
          validateProjectScript(
            serviceName === 'api' ? 'solid-api' : 'solid-ui',
            serviceScripts[serviceName as ScriptServiceName],
          );
        }

        const supervisor = new StartSupervisor(process.cwd(), serviceScripts, options, features);
        await supervisor.start();
      });
    return command;
  };

  registerSupervisorCommand(
    'start:dev',
    'Start solid-api, solid-ui, MCP, and AgentHub dev processes in a single supervisor',
    DEV_SERVICE_SCRIPTS,
    { supportsMcp: true, supportsAgentHub: true },
  );

  registerSupervisorCommand(
    'start',
    'Start solid-api, solid-ui, and MCP standard processes in a single supervisor',
    START_SERVICE_SCRIPTS,
    { supportsMcp: true },
  );
}
