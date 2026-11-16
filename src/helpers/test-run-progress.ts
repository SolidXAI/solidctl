import * as readline from 'readline';

const BOLD = '\u001b[1m';
const BOLD_OFF = '\u001b[22m';
const DIM = '\u001b[2m';
const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const COLOR_OFF = '\u001b[39m';
const INVERSE = '\u001b[7m';
const INVERSE_OFF = '\u001b[27m';

export interface ProgressSnapshot {
  status: string;
  total?: number;
  passed?: number;
  failed?: number;
}

function formatElapsed(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}:${String(seconds).padStart(2, '0')}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * The progress line for a Test Hub run, in the layout the test runner used:
 *   Tests: [=========         ] 45/151 (29%) | Elapsed: 1:12 | 45 passed | 0 failed
 * A run that has not started yet, or has ended other than by passing, also shows its status.
 */
export function formatProgress(snapshot: ProgressSnapshot, elapsedMs: number, columns: number, color: boolean): string {
  const passed = snapshot.passed ?? 0;
  const failed = snapshot.failed ?? 0;
  const total = snapshot.total ?? 0;
  const completed = passed + failed;
  const ratio = total > 0 ? Math.min(1, completed / total) : 0;
  const width = columns >= 120 ? 30 : columns >= 90 ? 22 : 14;
  const filled = Math.round(width * ratio);
  const paint = (text: string, on: string, off: string) => (color ? `${on}${text}${off}` : text);

  const bar = `[${paint('='.repeat(filled), GREEN, COLOR_OFF)}${' '.repeat(Math.max(0, width - filled))}]`;
  const count = `${completed}/${total || '?'} (${Math.floor(ratio * 100)}%)`;
  const parts = [
    `${paint('Tests', BOLD, BOLD_OFF)}: ${bar} ${count}`,
    `${paint('Elapsed', BOLD, BOLD_OFF)}: ${formatElapsed(elapsedMs)}`,
    paint(`${passed} passed`, GREEN, COLOR_OFF),
    failed > 0 ? paint(`${failed} failed`, RED, COLOR_OFF) : paint(`${failed} failed`, DIM, BOLD_OFF),
  ];
  if (snapshot.status !== 'running' && snapshot.status !== 'succeeded') parts.push(snapshot.status);
  return parts.join(color ? `${DIM} | ${BOLD_OFF}` : ' | ');
}

/**
 * Shows a run's progress while the release waits for it. On a terminal it redraws one inverse-video line in place; elsewhere
 * (a log file, CI) it prints a plain line only when something changed, so the output stays short.
 */
export class TestRunProgress {
  private rendered = false;
  private lastPlainLine = '';

  constructor(
    private readonly out: NodeJS.WriteStream = process.stdout,
    private readonly now: () => number = Date.now,
    private readonly startedAt: number = now(),
  ) {}

  private interactive(): boolean {
    return Boolean(this.out.isTTY || process.env.SOLIDCTL_TEST_PROGRESS === '1');
  }

  update(snapshot: ProgressSnapshot): void {
    const elapsed = this.now() - this.startedAt;
    const columns = this.out.columns || 80;
    if (this.interactive()) {
      const line = formatProgress(snapshot, elapsed, columns, true);
      readline.clearLine(this.out, 0);
      readline.cursorTo(this.out, 0);
      this.out.write(`${INVERSE} ${line} ${INVERSE_OFF}`);
      this.rendered = true;
      return;
    }
    // Without a terminal the elapsed time would change every poll; leave it out so only real changes print.
    const plain = formatProgress(snapshot, 0, columns, false).replace(/ \| Elapsed: [^|]*/, '');
    if (plain !== this.lastPlainLine) {
      this.lastPlainLine = plain;
      this.out.write(`  ${plain} (${formatElapsed(elapsed)})\n`);
    }
  }

  /** Removes the in-place line, so the next output starts on a clean line. */
  clear(): void {
    if (!this.rendered) return;
    readline.clearLine(this.out, 0);
    readline.cursorTo(this.out, 0);
    this.rendered = false;
  }

  /** The last line, left on screen as a normal line. */
  finish(snapshot: ProgressSnapshot): void {
    const elapsed = this.now() - this.startedAt;
    if (this.interactive()) {
      this.clear();
      this.out.write(`${formatProgress(snapshot, elapsed, this.out.columns || 80, true)}\n`);
      return;
    }
    this.update(snapshot);
  }
}
