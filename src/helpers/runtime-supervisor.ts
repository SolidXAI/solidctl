import { ChildProcess, spawn, spawnSync } from 'child_process';
import readline from 'readline';
import chalk from 'chalk';

/** Foreground supervisor for a single runtime and all of its subprocesses. */
export function superviseRuntime(command: string, args: string[], options: {
  cwd: string; env: Record<string, string>; label: string; plain?: boolean; shell?: boolean;
}): Promise<number> {
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY && !options.plain);
  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    let stopping = false;
    let restarting = false;
    let timer: NodeJS.Timeout | undefined;
    const wasRaw = Boolean(process.stdin.isRaw);
    const footer = () => {
      if (!interactive) return;
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      const text = ` Controls | q quit | c clear | r restart ${options.label} `;
      process.stdout.write(chalk.inverse(text.slice(0, Math.max(0, (process.stdout.columns || 80) - 1))));
    };
    const write = (data: Buffer | string, stream: NodeJS.WriteStream) => {
      if (interactive) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
      }
      stream.write(data);
      // Keep partial log lines separate from the controls.
      if (interactive && !String(data).endsWith('\n')) stream.write('\n');
      footer();
    };
    const signalGroup = (signal: NodeJS.Signals) => {
      if (!child?.pid) return;
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        try { process.kill(-child.pid, signal); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
      }
    };
    const stop = (signal: NodeJS.Signals) => {
      if (timer) return;
      signalGroup(signal);
      timer = setTimeout(() => signalGroup('SIGKILL'), 5_000);
      timer.unref();
    };
    const shutdown = (signal: NodeJS.Signals) => {
      if (stopping) return;
      stopping = true;
      restarting = false;
      stop(signal);
    };
    const interrupt = () => shutdown('SIGINT');
    const terminate = () => shutdown('SIGTERM');
    const keypress = (_text: string, key: readline.Key) => {
      if ((key.ctrl && key.name === 'c') || key.name === 'q') interrupt();
      else if (key.name === 'c') { console.clear(); footer(); }
      else if (key.name === 'r' && !stopping && !restarting) {
        restarting = true;
        stop('SIGTERM');
      }
    };
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', terminate);
      if (interactive) {
        process.stdin.removeListener('keypress', keypress);
        process.stdout.removeListener('resize', footer);
        process.stdin.setRawMode?.(wasRaw);
        process.stdin.pause();
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write('\n');
      }
    };
    const launch = () => {
      try {
        child = spawn(command, args, {
          cwd: options.cwd, env: options.env, shell: options.shell,
          stdio: interactive ? ['ignore', 'pipe', 'pipe'] : 'inherit',
          detached: process.platform !== 'win32',
        });
      } catch (error) { cleanup(); reject(error); return; }
      child.stdout?.on('data', (data) => write(data, process.stdout));
      child.stderr?.on('data', (data) => write(data, process.stderr));
      child.once('error', (error) => {
        stopping = true;
        cleanup();
        reject(new Error(`Failed to start ${options.label}: ${error.message}`));
      });
      child.once('close', (code) => {
        if (timer) clearTimeout(timer);
        timer = undefined;
        // Managers can leave descendants alive even after their own exit.
        signalGroup('SIGKILL');
        if (restarting && !stopping) {
          restarting = false;
          launch();
        } else {
          cleanup();
          resolve(stopping ? 0 : (code ?? 1));
        }
      });
      footer();
    };
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    if (interactive) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on('keypress', keypress);
      process.stdout.on('resize', footer);
    }
    launch();
  });
}
