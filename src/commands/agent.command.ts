import { ChildProcess, spawn, spawnSync } from 'child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import readline from 'readline';
import { config as loadDotenv } from 'dotenv';
import { validateProjectRoot } from '../helper';
import { ensureAgentInstalled, ensureAgentInstalledLocal, ensureAgentUIInstalled } from './agent-helper';

type AgentServiceName = 'agent' | 'ui';

type AgentServiceConfig = {
  cwd: string;
  label: string;
  color: (text: string) => string;
};

type AgentServiceState = {
  child: ChildProcess | null;
  restartRequested: boolean;
  stoppingForShutdown: boolean;
  outputBuffer: string;
};

type AgentStartOptions = {
  plain?: boolean;
  local?: boolean;
};

/**
 * Build a DATABASE_URL from the consuming project's individual DB env vars,
 * unless DATABASE_URL is already explicitly set.
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DEFAULT_DATABASE_HOST;
  const port = process.env.DEFAULT_DATABASE_PORT;
  const user = process.env.DEFAULT_DATABASE_USER;
  const password = process.env.DEFAULT_DATABASE_PASSWORD;
  const name = process.env.DEFAULT_DATABASE_NAME;

  if (host && port && user && name) {
    return `postgresql://${user}${password ? ':' + password : ''}@${host}:${port}/${name}`;
  }
  return undefined;
}

class AgentSupervisor {
  private readonly serviceConfigs: Record<AgentServiceName, AgentServiceConfig>;
  private readonly serviceStates: Record<AgentServiceName, AgentServiceState>;
  private readonly isInteractive: boolean;
  private readonly npmCommand: string;
  private readonly projectRoot: string;
  private readonly agentCommand: string;
  private readonly agentUiDir: string;
  private readonly agentPort: string;
  private readonly agentHost: string;
  private readonly agentLogLevel: string;
  private shuttingDown = false;
  private exitCode = 0;
  private stdinWasRaw = false;

  constructor(
    projectRoot: string,
    agentCommand: string,
    agentUiDir: string,
    options: { port: string; host: string; logLevel: string } & AgentStartOptions,
  ) {
    this.projectRoot = projectRoot;
    this.agentCommand = agentCommand;
    this.agentUiDir = agentUiDir;
    this.agentPort = options.port;
    this.agentHost = options.host;
    this.agentLogLevel = options.logLevel;
    this.isInteractive = Boolean(process.stdout.isTTY && process.stdin.isTTY && !options.plain);
    this.npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    this.serviceConfigs = {
      agent: {
        cwd: projectRoot,
        label: 'agent',
        color: chalk.green,
      },
      ui: {
        cwd: agentUiDir,
        label: 'ui',
        color: chalk.magenta,
      },
    };

    this.serviceStates = {
      agent: this.createInitialState(),
      ui: this.createInitialState(),
    };
  }

  async start() {
    this.attachSignalHandlers();
    this.attachKeyboardControls();
    this.setupFooterArea();

    this.printStatus('Starting SolidX Agent processes');
    this.spawnService('agent');
    this.spawnService('ui');
    this.renderFooter();

    await new Promise<void>((resolve) => {
      const poll = setInterval(() => {
        if (!this.hasRunningChildren()) {
          clearInterval(poll);
          this.cleanupTerminal();
          resolve();
        }
      }, 100);
    });

    process.exit(this.exitCode);
  }

  private createInitialState(): AgentServiceState {
    return {
      child: null,
      restartRequested: false,
      stoppingForShutdown: false,
      outputBuffer: '',
    };
  }

  private spawnService(serviceName: AgentServiceName) {
    const config = this.serviceConfigs[serviceName];
    const state = this.serviceStates[serviceName];

    state.restartRequested = false;
    state.stoppingForShutdown = false;

    let child: ChildProcess;

    if (serviceName === 'agent') {
      child = spawn(
        this.agentCommand,
        ['serve', '--port', this.agentPort, '--host', this.agentHost, '--log-level', this.agentLogLevel],
        {
          cwd: config.cwd,
          env: this.getAgentEnv(),
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: process.platform === 'win32',
        },
      );
    } else {
      child = spawn(this.npmCommand, ['run', 'dev'], {
        cwd: config.cwd,
        env: this.getUiEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
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

  private getAgentEnv(): Record<string, string> {
    const databaseUrl = resolveDatabaseUrl();
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      SOLIDX_PROJECT_ROOT: this.projectRoot,
      ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
      ...(process.env.BASE_URL ? { BASE_URL: process.env.BASE_URL } : {}),
      ...(process.env.APP_ENCRYPTION_KEY ? { APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY } : {}),
    };

    const bridgedKeys = ['DATABASE_URL', 'SOLIDX_PROJECT_ROOT', 'BASE_URL', 'APP_ENCRYPTION_KEY'];
    const bridged = bridgedKeys.filter((k) => env[k]);
    const missing = bridgedKeys.filter((k) => !env[k]);
    this.printStatus(`Agent bridged env: ${bridged.join(', ') || 'none'}`);
    if (missing.length) this.printStatus(`Agent missing env: ${missing.join(', ')}`);

    return env;
  }

  private getUiEnv(): Record<string, string> {
    return {
      ...process.env as Record<string, string>,
      SOLIDX_AGENT_URL: `http://localhost:${this.agentPort}`,
    };
  }

  private handleChunk(serviceName: AgentServiceName, chunk: string, isError: boolean) {
    const state = this.serviceStates[serviceName];
    state.outputBuffer += chunk;

    const lines = state.outputBuffer.split(/\r?\n/);
    state.outputBuffer = lines.pop() ?? '';

    for (const line of lines) {
      this.printLog(serviceName, line, isError);
    }
  }

  private flushBuffer(serviceName: AgentServiceName) {
    const state = this.serviceStates[serviceName];
    if (!state.outputBuffer) {
      return;
    }

    this.printLog(serviceName, state.outputBuffer, false);
    state.outputBuffer = '';
  }

  private printLog(serviceName: AgentServiceName, message: string, isError: boolean) {
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

  private setupFooterArea() {
    if (!this.isInteractive) {
      return;
    }

    this.applyScrollRegion();
    process.stdout.on('resize', this.handleResize);
  }

  private applyScrollRegion() {
    if (!this.isInteractive) {
      return;
    }

    const rows = process.stdout.rows || 24;
    if (rows < 2) {
      return;
    }

    // Reserve the last row for the footer using DECSTBM. Logs scroll
    // within rows 1..(rows-1) and the footer stays anchored at row `rows`.
    process.stdout.write(`\u001b[1;${rows - 1}r`);
    // Park the cursor at the bottom of the scroll region so subsequent
    // writes scroll the log region instead of pushing the footer down.
    process.stdout.write(`\u001b[${rows - 1};1H`);
  }

  private handleResize = () => {
    this.applyScrollRegion();
    this.renderFooter();
  };

  private renderFooter() {
    if (!this.isInteractive) {
      return;
    }

    const footer = [
      chalk.bold('Controls'),
      'q quit',
      'c clear',
      'r restart both',
      'a restart Agent',
      'u restart UI',
    ].join(chalk.dim(' | '));

    const terminalWidth = process.stdout.columns || 80;
    const renderedFooter = chalk.inverse(` ${footer} `);
    const safeFooter = this.truncateAnsiText(renderedFooter, terminalWidth);

    const rows = process.stdout.rows || 24;
    // Save cursor, draw footer at the bottom row, restore cursor so log
    // output continues from inside the scroll region.
    process.stdout.write('\u001b7');
    process.stdout.write(`\u001b[${rows};1H`);
    process.stdout.write('\u001b[2K');
    process.stdout.write(safeFooter);
    process.stdout.write('\u001b8');
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
          this.restartService('agent');
          break;
        case 'u':
          this.restartService('ui');
          break;
        case 'r':
          this.restartService('agent');
          this.restartService('ui');
          break;
        case 'c':
          console.clear();
          this.applyScrollRegion();
          this.renderFooter();
          break;
        case 'q':
          this.shutdown(0);
          break;
        default:
          break;
      }
    });
  }

  private restartService(serviceName: AgentServiceName) {
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

  private stopChild(serviceName: AgentServiceName) {
    const state = this.serviceStates[serviceName];
    if (!state.child) {
      return;
    }

    state.child.kill('SIGTERM');
  }

  private handleUnexpectedExit(serviceName: AgentServiceName, code: number) {
    if (this.shuttingDown) {
      return;
    }

    this.exitCode = code === 0 ? 1 : code;
    this.shuttingDown = true;

    for (const otherServiceName of Object.keys(this.serviceStates) as AgentServiceName[]) {
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

    for (const serviceName of Object.keys(this.serviceStates) as AgentServiceName[]) {
      const state = this.serviceStates[serviceName];
      state.stoppingForShutdown = true;
      state.restartRequested = false;
      this.stopChild(serviceName);
    }

    this.renderFooter();
  }

  private hasRunningChildren() {
    return (Object.keys(this.serviceStates) as AgentServiceName[]).some((serviceName) => {
      return this.serviceStates[serviceName].child !== null;
    });
  }

  private cleanupTerminal() {
    if (!this.isInteractive) {
      return;
    }

    process.stdout.removeListener('resize', this.handleResize);

    const rows = process.stdout.rows || 24;
    // Reset DECSTBM scroll region to full screen.
    process.stdout.write('\u001b[r');
    // Clear the footer row so it does not linger after exit.
    process.stdout.write(`\u001b[${rows};1H`);
    process.stdout.write('\u001b[2K');
    readline.cursorTo(process.stdout, 0);
    if (!this.stdinWasRaw) {
      process.stdin.setRawMode?.(false);
    }
    process.stdout.write('\n');
  }
}

export function registerAgentCommand(program: Command) {
  const agent = program
    .command('agent')
    .description('SolidX AI Agent — start the server or run a single task');

  agent
    .command('start')
    .description('Start the AI agent server and chat UI in a single supervisor')
    .option('-p, --port <port>', 'Agent backend port', '8765')
    .option('-H, --host <host>', 'Host to bind', '0.0.0.0')
    .option('-l, --log-level <level>', 'Logging level', 'INFO')
    .option('--plain', 'Disable interactive controls and print merged logs only')
    .option('--local', 'Install agent from local source (pip install -e .[full]) instead of PyPI')
    .action(async (options: { port: string; host: string; logLevel: string; plain?: boolean; local?: boolean }) => {
      validateProjectRoot();
      const projectRoot = process.cwd();

      // Load consuming project's .env (lives in solid-api/)
      loadDotenv({ path: path.join(projectRoot, 'solid-api', '.env') });

      const agentCommand = options.local ? ensureAgentInstalledLocal() : ensureAgentInstalled();
      const agentUiDir = ensureAgentUIInstalled();

      const supervisor = new AgentSupervisor(projectRoot, agentCommand, agentUiDir, options);
      await supervisor.start();
    });

  agent
    .command('run')
    .description('Run a single agent task')
    .argument('<task>', 'Task description')
    .option('-m, --mode <mode>', 'Tool mode: native or mcp')
    .option('-l, --log-level <level>', 'Logging level', 'INFO')
    .option('--local', 'Install agent from local source (pip install -e .[full]) instead of PyPI')
    .action((task, options) => {
      validateProjectRoot();
      const projectRoot = process.cwd();

      // Load consuming project's .env (lives in solid-api/)
      loadDotenv({ path: path.join(projectRoot, 'solid-api', '.env') });

      const databaseUrl = resolveDatabaseUrl();
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        SOLIDX_PROJECT_ROOT: projectRoot,
        ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
        ...(process.env.BASE_URL ? { BASE_URL: process.env.BASE_URL } : {}),
        ...(process.env.APP_ENCRYPTION_KEY ? { APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY } : {}),
      };

      const args = [task];
      if (options.mode) {
        args.push('--mode', options.mode);
      }
      args.push('--log-level', options.logLevel);

      // Match the MCP startup flow: do dependency resolution first so Ubuntu
      // users do not see a "running" banner when Python/bootstrap fails.
      const agentCommand = options.local ? ensureAgentInstalledLocal() : ensureAgentInstalled();
      const bridgedKeys = ['DATABASE_URL', 'SOLIDX_PROJECT_ROOT', 'BASE_URL', 'APP_ENCRYPTION_KEY'];
      const bridged = bridgedKeys.filter((k) => env[k]);
      const missing = bridgedKeys.filter((k) => !env[k]);
      console.log(`✔ Bridged env: ${bridged.join(', ') || 'none'}`);
      if (missing.length) console.warn(`⚠ Missing env: ${missing.join(', ')}`);
      console.log(`▶ Running SolidX AI Agent: ${task}`);
      const result = spawnSync(agentCommand, args, {
        cwd: projectRoot,
        stdio: 'inherit',
        env,
        shell: process.platform === 'win32',
      });

      if (result.error) {
        console.error('❌ Failed to run agent:', result.error.message);
        process.exit(1);
      }

      if (result.status !== 0) {
        console.error('❌ Agent exited with code', result.status);
        process.exit(result.status ?? 1);
      }

      console.log('✔ Agent task completed');
    });
}
