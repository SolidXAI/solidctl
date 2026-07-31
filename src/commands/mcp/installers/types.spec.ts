import { isAgentName, parseAgentsList, KEBAB_CASE_RE } from './types';

describe('isAgentName', () => {
  it('accepts the four supported agents', () => {
    expect(isAgentName('claude-code')).toBe(true);
    expect(isAgentName('cursor')).toBe(true);
    expect(isAgentName('codex')).toBe(true);
    expect(isAgentName('claude-desktop')).toBe(true);
  });

  it('rejects unknown strings at compile time when string-literal-typed', () => {
    expect(isAgentName('foo')).toBe(false);
  });
});

describe('parseAgentsList', () => {
  it('splits a comma list and trims whitespace', () => {
    expect(parseAgentsList('cursor, codex ,claude-desktop')).toEqual([
      'cursor',
      'codex',
      'claude-desktop',
    ]);
  });

  it('returns undefined for undefined input', () => {
    expect(parseAgentsList(undefined)).toBeUndefined();
  });

  it('throws on an unknown agent name', () => {
    expect(() => parseAgentsList('cursor,foo')).toThrow(
      /unsupported agent "foo"/i,
    );
  });
});

describe('KEBAB_CASE_RE', () => {
  it('matches valid kebab-case project names', () => {
    expect(KEBAB_CASE_RE.test('new-todo-app')).toBe(true);
    expect(KEBAB_CASE_RE.test('myapp')).toBe(true);
  });

  it('rejects invalid names', () => {
    expect(KEBAB_CASE_RE.test('New-Todo')).toBe(false);
    expect(KEBAB_CASE_RE.test('new_todo')).toBe(false);
    expect(KEBAB_CASE_RE.test('')).toBe(false);
  });
});
