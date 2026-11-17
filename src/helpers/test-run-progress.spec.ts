import { formatProgress, TestRunProgress } from './test-run-progress';

const fakeStream = (isTTY: boolean) => {
  const writes: string[] = [];
  const stream = { isTTY, columns: 120, write: (text: string) => (writes.push(text), true) } as unknown as NodeJS.WriteStream;
  return { stream, writes, text: () => writes.join('') };
};

describe('formatProgress', () => {
  it('shows a bar, the count, the percentage, the elapsed time and the results', () => {
    const line = formatProgress({ status: 'running', total: 100, passed: 20, failed: 5 }, 72_000, 120, false);

    expect(line).toBe(`Tests: [${'='.repeat(8)}${' '.repeat(22)}] 25/100 (25%) | Elapsed: 1:12 | 20 passed | 5 failed`);
  });

  it('fills the bar when the run is complete', () => {
    const line = formatProgress({ status: 'succeeded', total: 151, passed: 151, failed: 0 }, 130_000, 120, false);

    expect(line).toContain(`[${'='.repeat(30)}] 151/151 (100%)`);
    expect(line).toContain('Elapsed: 2:10');
    expect(line).not.toContain('succeeded');
  });

  it('shows the status of a run that has not started or did not finish normally', () => {
    expect(formatProgress({ status: 'pending', total: 151 }, 0, 120, false)).toMatch(/0\/151 \(0%\).*\| pending$/);
    expect(formatProgress({ status: 'canceled', total: 10, passed: 2, failed: 0 }, 5_000, 120, false)).toMatch(/\| canceled$/);
  });

  it('uses a narrower bar on a narrow terminal, and copes with an unknown total', () => {
    const narrow = formatProgress({ status: 'running', total: 10, passed: 10, failed: 0 }, 0, 80, false);
    expect(narrow).toContain(`[${'='.repeat(14)}]`);

    expect(formatProgress({ status: 'pending' }, 0, 120, false)).toContain('0/? (0%)');
  });

  it('adds colour only when asked to', () => {
    expect(formatProgress({ status: 'running', total: 2, passed: 1, failed: 1 }, 0, 120, false)).not.toContain('\u001b');
    expect(formatProgress({ status: 'running', total: 2, passed: 1, failed: 1 }, 0, 120, true)).toContain('\u001b[31m1 failed');
  });
});

describe('TestRunProgress', () => {
  const originalFlag = process.env.SOLIDCTL_TEST_PROGRESS;
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.SOLIDCTL_TEST_PROGRESS;
    else process.env.SOLIDCTL_TEST_PROGRESS = originalFlag;
  });

  it('redraws one line in place on a terminal', () => {
    delete process.env.SOLIDCTL_TEST_PROGRESS;
    const { stream, text } = fakeStream(true);
    let now = 1_000;
    const progress = new TestRunProgress(stream, () => now, 1_000);

    progress.update({ status: 'running', total: 4, passed: 1, failed: 0 });
    now += 2_000;
    progress.update({ status: 'running', total: 4, passed: 2, failed: 0 });

    expect(text()).toContain('1/4 (25%)');
    expect(text()).toContain('2/4 (50%)');
    expect(text()).not.toContain('\n');
    expect(text()).toContain('Elapsed\u001b[22m: 0:02');
  });

  it('leaves the final line on screen with a newline, after clearing the live one', () => {
    delete process.env.SOLIDCTL_TEST_PROGRESS;
    const { stream, writes } = fakeStream(true);
    const progress = new TestRunProgress(stream, () => 0, 0);

    progress.update({ status: 'running', total: 2, passed: 1, failed: 0 });
    progress.finish({ status: 'succeeded', total: 2, passed: 2, failed: 0 });

    const last = writes[writes.length - 1];
    expect(last.endsWith('\n')).toBe(true);
    expect(last).toContain('2/2 (100%)');
    expect(last).not.toContain('\u001b[7m');
  });

  it('prints a plain line only when the progress changes, not on every poll', () => {
    delete process.env.SOLIDCTL_TEST_PROGRESS;
    const { stream, text } = fakeStream(false);
    let now = 0;
    const progress = new TestRunProgress(stream, () => now, 0);

    progress.update({ status: 'running', total: 4, passed: 1, failed: 0 });
    now += 2_000;
    progress.update({ status: 'running', total: 4, passed: 1, failed: 0 });
    now += 2_000;
    progress.update({ status: 'running', total: 4, passed: 3, failed: 0 });

    const lines = text().trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('1/4 (25%)');
    expect(lines[1]).toContain('3/4 (75%)');
    expect(text()).not.toContain('\u001b');
  });

  it('draws the live line when SOLIDCTL_TEST_PROGRESS=1 even without a terminal', () => {
    process.env.SOLIDCTL_TEST_PROGRESS = '1';
    const { stream, text } = fakeStream(false);

    new TestRunProgress(stream, () => 0, 0).update({ status: 'running', total: 4, passed: 1, failed: 0 });

    expect(text()).toContain('\u001b[7m');
  });
});
