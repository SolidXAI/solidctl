import { ChildProcess, spawn } from 'child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
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
};

type StartOptions = {
  plain?: boolean;
};

class StartSupervisor {
  private readonly apiPort: string;
  private readonly uiPort: string;
  private readonly serviceConfigs: Record<ServiceName, ServiceConfig>;
  private readonly serviceStates: Record<ServiceName, ServiceState>;
  private readonly isInteractive: boolean;
  private readonly npmCommand: string;
  private shuttingDown = false;
  private exitCode = 0;
  private stdinWasRaw = false;

  constructor(
    private readonly projectRoot: string,
    options: StartOptions,
  ) {
    this.isInteractive = Boolean(process.stdout.isTTY && process.stdin.isTTY && !options.plain);
    this.npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    this.apiPort = this.resolveApiPort();
    this.uiPort = this.resolveUiPort();

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
    };
  }

  private spawnService(serviceName: ServiceName) {
    const config = this.serviceConfigs[serviceName];
    const state = this.serviceStates[serviceName];

    state.restartRequested = false;
    state.stoppingForShutdown = false;

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
      `${chalk.bold('Controls')}: q quit & c clear`,
      `${chalk.bold('Services')}: API (a restart, d open docs, :${this.apiPort})  UI (u restart, o open, :${this.uiPort})`,
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
        case 'd':
          this.openUrlInBrowser(this.getApiDocsUrl(), 'API docs');
          break;
        case 'o':
          this.openUrlInBrowser(this.getUiUrl(), 'UI');
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
      const devScript = packageJson.scripts?.dev ?? packageJson.scripts?.['solidx:dev'] ?? '';
      const portMatch = /(?:^|\s)--port\s+(\d{1,5})(?:\s|$)/.exec(devScript);
      if (portMatch) {
        return portMatch[1];
      }
    } catch {
      // Fall back to the default Vite port used by generated projects.
    }

    return '3001';
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
