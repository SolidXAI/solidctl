import { ChildProcess, spawn } from 'child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import readline from 'readline';
import { validateProjectRoot, validateProjectScript } from '../helper';

type ServiceName = 'api' | 'ui';

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
  startedAt: number | null;
};

type StartOptions = {
  plain?: boolean;
};

class StartSupervisor {
  private readonly serviceConfigs: Record<ServiceName, ServiceConfig>;
  private readonly serviceStates: Record<ServiceName, ServiceState>;
  private readonly isInteractive: boolean;
  private readonly npmCommand: string;
  private shuttingDown = false;
  private exitCode = 0;
  private stdinWasRaw = false;
  private footerInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly projectRoot: string,
    options: StartOptions,
  ) {
    this.isInteractive = Boolean(process.stdout.isTTY && process.stdin.isTTY && !options.plain);
    this.npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

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
    };

    this.serviceStates = {
      api: this.createInitialState(),
      ui: this.createInitialState(),
    };
  }

  async start() {
    this.attachSignalHandlers();
    this.attachKeyboardControls();

    this.printStatus('Starting SolidX dev processes');
    this.spawnService('api');
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

  private createInitialState(): ServiceState {
    return {
      child: null,
      restartRequested: false,
      stoppingForShutdown: false,
      outputBuffer: '',
      startedAt: null,
    };
  }

  private spawnService(serviceName: ServiceName) {
    const config = this.serviceConfigs[serviceName];
    const state = this.serviceStates[serviceName];

    state.restartRequested = false;
    state.stoppingForShutdown = false;
    state.startedAt = Date.now();

    const child = spawn(this.npmCommand, ['run', 'solidx:dev'], {
      cwd: config.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

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

    const footer = [
      chalk.bold('Controls'),
      `project:${this.projectRoot}`,
      `api:${this.getServiceStatusLabel('api')} ${this.getServiceUptime('api')}`,
      `ui:${this.getServiceStatusLabel('ui')} ${this.getServiceUptime('ui')}`,
      'a restart API',
      'u restart UI',
      'r restart both',
      'c clear',
      'q quit',
    ].join(chalk.dim(' | '));

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(chalk.inverse(` ${footer} `));
  }

  private getServiceStatusLabel(serviceName: ServiceName) {
    const state = this.serviceStates[serviceName];
    const config = this.serviceConfigs[serviceName];

    if (state.child) {
      return config.color('running');
    }

    if (state.restartRequested) {
      return chalk.yellow('restarting');
    }

    if (this.shuttingDown || state.stoppingForShutdown) {
      return chalk.gray('stopping');
    }

    return chalk.red('stopped');
  }

  private getServiceUptime(serviceName: ServiceName) {
    const state = this.serviceStates[serviceName];

    if (!state.child || !state.startedAt) {
      return chalk.gray('00:00:00');
    }

    return chalk.green(this.formatDuration(Date.now() - state.startedAt));
  }

  private formatDuration(durationMs: number) {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
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
    this.footerInterval = setInterval(() => {
      this.renderFooter();
    }, 1000);

    process.stdin.on('keypress', (_str, key) => {
      if (key.ctrl && key.name === 'c') {
        this.shutdown(0);
        return;
      }

      switch (key.name) {
        case 'a':
          this.restartService('api');
          break;
        case 'u':
          this.restartService('ui');
          break;
        case 'r':
          this.restartService('api');
          this.restartService('ui');
          break;
        case 'c':
          console.clear();
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
    if (!state.child) {
      return;
    }

    state.child.kill('SIGTERM');
  }

  private handleUnexpectedExit(serviceName: ServiceName, code: number) {
    if (this.shuttingDown) {
      return;
    }

    this.exitCode = code === 0 ? 1 : code;
    this.shuttingDown = true;

    for (const otherServiceName of Object.keys(this.serviceStates) as ServiceName[]) {
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

    for (const serviceName of Object.keys(this.serviceStates) as ServiceName[]) {
      const state = this.serviceStates[serviceName];
      state.stoppingForShutdown = true;
      state.restartRequested = false;
      this.stopChild(serviceName);
    }

    this.renderFooter();
  }

  private hasRunningChildren() {
    return (Object.keys(this.serviceStates) as ServiceName[]).some((serviceName) => {
      return this.serviceStates[serviceName].child !== null;
    });
  }

  private cleanupTerminal() {
    if (!this.isInteractive) {
      return;
    }

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    if (this.footerInterval) {
      clearInterval(this.footerInterval);
      this.footerInterval = null;
    }
    if (!this.stdinWasRaw) {
      process.stdin.setRawMode?.(false);
    }
    process.stdout.write('\n');
  }
}

export function registerStartCommand(program: Command) {
  program
    .command('start:dev')
    .description('Start solid-api and solid-ui dev processes in a single supervisor')
    .option('--plain', 'Disable interactive controls and print merged logs only')
    .action(async (options: StartOptions) => {
      validateProjectRoot();
      validateProjectScript('solid-api', 'solidx:dev');
      validateProjectScript('solid-ui', 'solidx:dev');

      const supervisor = new StartSupervisor(process.cwd(), options);
      await supervisor.start();
    });
}
