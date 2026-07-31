/**
 * True only when both stdio streams are a real TTY and CI isn't set.
 *
 * inquirer's prompts don't reliably reject when stdin is piped/ignored (the
 * case for every child process solidctl spawns, e.g. release-validation's
 * `solidctl start:dev`) — they can just hang waiting for input instead
 * of throwing. Callers must check this *before* invoking inquirer rather
 * than relying on a try/catch around the prompt.
 */
export function isInteractiveSession(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI);
}
