import crypto from 'crypto';
import { kebabCase, startCase } from 'lodash';
import path from 'path';
import { SetupAnswers } from '../create-app/setup-questions';
import { SETUP_DB_DEFAULTS, SetupProjectAnswers } from './setup-questions';

/** package.json shape solidctl actually reads — deliberately loose. */
export interface MinimalPackageJson {
  name?: string;
  scripts?: Record<string, string>;
}

/**
 * Infer the project's kebab-case name from solid-api's package.json, falling
 * back to the directory name for a project that hasn't adopted the
 * "@<project>/solid-api" naming convention `create-app` writes.
 */
export function inferProjectName(
  apiPackageJson: MinimalPackageJson | undefined,
  cwd: string,
): string {
  const scopedMatch = /^@([^/]+)\//.exec(apiPackageJson?.name ?? '');
  if (scopedMatch) {
    return scopedMatch[1];
  }
  return kebabCase(path.basename(cwd));
}

/**
 * Infer the UI dev port from solid-ui's package.json `scripts.dev`.
 * Mirrors the regex StartSupervisor.resolveUiPort uses at runtime
 * (src/commands/start.command.ts) so setup and start agree on the port.
 */
export function inferUiPort(
  uiPackageJson: MinimalPackageJson | undefined,
): string {
  const devScript = uiPackageJson?.scripts?.dev ?? '';
  const match = /(?:^|\s)--port\s+(\d{1,5})(?:\s|$)/.exec(devScript);
  return match ? match[1] : '5173';
}

/**
 * Parse a .env-style file into a flat key/value map. Ignores comments and
 * blank lines, strips surrounding quotes. Used for both an existing .env
 * (to read PORT) and a .env.example (to plan which values to prompt for).
 */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex < 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    const value = line
      .slice(eqIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/** Keys ending in these suffixes are treated as secrets: never carried over silently. */
export function isSecretKey(key: string): boolean {
  return /(_PASSWORD|_SECRET)$/i.test(key);
}

/**
 * Secrets setup is allowed to mint for itself: self-issued signing keys whose
 * value is arbitrary as long as it's unguessable.
 *
 * Every other blank secret is an *external* credential (SMTP, OAuth, a
 * third-party API key) that setup cannot know. Those are deliberately left
 * blank and reported via EnvExamplePlan.otherBlankKeys — inventing a value
 * would look configured while failing to authenticate, and would silently
 * defeat the "fill these in manually" warning.
 */
export const GENERATED_SECRET_KEYS = new Set([
  'IAM_JWT_SECRET',
  'NEXTAUTH_SECRET',
]);

export function isGeneratedSecretKey(key: string): boolean {
  return GENERATED_SECRET_KEYS.has(key);
}

/** The .env keys that back the six DB-block prompts, and the SetupProjectAnswers field each maps to. */
export const DB_ENV_KEYS = {
  host: 'DEFAULT_DATABASE_HOST',
  port: 'DEFAULT_DATABASE_PORT',
  name: 'DEFAULT_DATABASE_NAME',
  username: 'DEFAULT_DATABASE_USER',
  password: 'DEFAULT_DATABASE_PASSWORD',
} as const;

export type DbField = keyof typeof DB_ENV_KEYS | 'client';

/** Map a prompted database client to the SOLID_CORE_DB_TYPE value the API template reads. */
export function toDbTypeEnvValue(
  client: string,
): 'postgres' | 'mysql' | 'mssql' {
  if (client === 'MySQL') return 'mysql';
  if (client === 'MSSQL') return 'mssql';
  return 'postgres';
}

/** The inverse of toDbTypeEnvValue, for reading a client back out of an existing/example env. */
export function fromDbTypeEnvValue(raw: string | undefined): string | null {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'mysql':
      return 'MySQL';
    case 'mssql':
      return 'MSSQL';
    case 'postgres':
    case 'postgresql':
      return 'PostgreSQL';
    default:
      return null;
  }
}

export function defaultDbPortForClient(client: string): string {
  if (client === 'MySQL') return SETUP_DB_DEFAULTS.solidApiDatabasePortMysql;
  if (client === 'MSSQL') return SETUP_DB_DEFAULTS.solidApiDatabasePortMssql;
  return SETUP_DB_DEFAULTS.solidApiDatabasePortPostgres;
}

/**
 * Build a DATABASE_URL for the chosen client. Mirrors resolveDatabaseUrl() in
 * src/commands/mcp-launch.ts, which builds the same URL at runtime from
 * individual env vars — this writes it into .env directly so `mcp start` and
 * `agent` don't have to rely on that fallback.
 */
export function buildDatabaseUrl(answers: SetupProjectAnswers): string {
  const dbType = toDbTypeEnvValue(answers.solidApiDatabaseClient);
  const {
    solidApiDatabaseHost: host,
    solidApiDatabasePort: port,
    solidApiDatabaseUsername: user,
    solidApiDatabasePassword: password,
    solidApiDatabaseName: name,
  } = answers;
  const encodedPassword = password ? `:${encodeURIComponent(password)}` : '';

  if (dbType === 'mssql') {
    return `mssql+pyodbc://${user}${encodedPassword}@${host}:${port}/${name}?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes&Encrypt=no`;
  }
  if (dbType === 'mysql') {
    return `mysql+pymysql://${user}${encodedPassword}@${host}:${port}/${name}`;
  }
  return `postgresql://${user}${encodedPassword}@${host}:${port}/${name}`;
}

export interface EnvExamplePlan {
  parsed: Record<string, string>;
  /** DB-block fields that need a prompt: blank in the example, or a secret key (never trusted as-is). */
  promptDbFields: DbField[];
  /** Other keys left blank in the example that setup cannot fill on its own. */
  otherBlankKeys: string[];
}

/**
 * Decide, from a parsed .env.example, which of the six DB-block fields still
 * need a prompt. Non-secret fields are carried over when non-blank; the
 * client is carried over via SOLID_CORE_DB_TYPE when present; the password
 * always prompts (secret keys are never trusted from a committed file);
 * anything else left blank is reported so setup can warn about it rather
 * than silently shipping a half-filled .env.
 */
export function planEnvFromExample(exampleContent: string): EnvExamplePlan {
  const parsed = parseEnvFile(exampleContent);
  const dbEnvKeySet = new Set<string>(Object.values(DB_ENV_KEYS));
  const promptDbFields: DbField[] = [];

  if (fromDbTypeEnvValue(parsed.SOLID_CORE_DB_TYPE) === null) {
    promptDbFields.push('client');
  }

  for (const [field, envKey] of Object.entries(DB_ENV_KEYS) as [
    keyof typeof DB_ENV_KEYS,
    string,
  ][]) {
    const value = parsed[envKey];
    const isBlank = value === undefined || value === '';
    if (isBlank || isSecretKey(envKey)) {
      promptDbFields.push(field);
    }
  }

  // Blank keys setup cannot fill itself: not part of the DB block (prompted)
  // and not a secret it may generate. These are surfaced so the caller can
  // tell the developer what still needs filling in by hand.
  const otherBlankKeys = Object.entries(parsed)
    .filter(
      ([key, value]) =>
        value === '' && !isGeneratedSecretKey(key) && !dbEnvKeySet.has(key),
    )
    .map(([key]) => key);

  return { parsed, promptDbFields, otherBlankKeys };
}

export type EnvPlan =
  | { action: 'skip-existing' }
  | {
      action: 'from-example';
      promptDbFields: DbField[];
      otherBlankKeys: string[];
      parsed: Record<string, string>;
    }
  | { action: 'prompt-full' };

/**
 * Decide what setup's environment step should do, without touching disk:
 * keep an existing .env untouched, fill the gaps in a .env.example, or
 * prompt for the full DB block when neither file exists.
 */
export function planEnvWrite(opts: {
  envExists: boolean;
  exampleContent: string | null;
  forceEnv: boolean;
}): EnvPlan {
  if (opts.envExists && !opts.forceEnv) {
    return { action: 'skip-existing' };
  }
  if (opts.exampleContent !== null) {
    const { parsed, promptDbFields, otherBlankKeys } = planEnvFromExample(
      opts.exampleContent,
    );
    return { action: 'from-example', promptDbFields, otherBlankKeys, parsed };
  }
  return { action: 'prompt-full' };
}

/**
 * Merge answers gathered by prompting only the fields planEnvWrite flagged
 * with values carried over from a parsed .env.example.
 */
export function resolveAnswersFromExample(
  parsed: Record<string, string>,
  prompted: Partial<SetupProjectAnswers>,
): SetupProjectAnswers {
  const client =
    prompted.solidApiDatabaseClient ??
    fromDbTypeEnvValue(parsed.SOLID_CORE_DB_TYPE) ??
    SETUP_DB_DEFAULTS.solidApiDatabaseClient;

  return {
    solidApiDatabaseClient: client,
    solidApiDatabaseHost:
      prompted.solidApiDatabaseHost ??
      parsed[DB_ENV_KEYS.host] ??
      SETUP_DB_DEFAULTS.solidApiDatabaseHost,
    solidApiDatabasePort:
      prompted.solidApiDatabasePort ??
      parsed[DB_ENV_KEYS.port] ??
      defaultDbPortForClient(client),
    solidApiDatabaseName:
      prompted.solidApiDatabaseName ??
      parsed[DB_ENV_KEYS.name] ??
      SETUP_DB_DEFAULTS.solidApiDatabaseName,
    solidApiDatabaseUsername:
      prompted.solidApiDatabaseUsername ??
      parsed[DB_ENV_KEYS.username] ??
      SETUP_DB_DEFAULTS.solidApiDatabaseUsername,
    solidApiDatabasePassword:
      prompted.solidApiDatabasePassword ??
      parsed[DB_ENV_KEYS.password] ??
      SETUP_DB_DEFAULTS.solidApiDatabasePassword,
  };
}

/**
 * Map setup's minimal DB-block answers onto create-app's full SetupAnswers
 * shape so getBackendEnvConfig / getFrontendEnvJson / verifyDatabaseExists /
 * createDatabaseIfNotExists can be reused as-is.
 */
export function toCreateAppAnswers(
  answers: SetupProjectAnswers,
  inferred: { projectName: string; apiPort: string; uiPort: string },
): SetupAnswers {
  return {
    projectName: inferred.projectName,
    solidxVersion: 'stable',
    solidApiPort: inferred.apiPort,
    solidApiDatabaseClient: answers.solidApiDatabaseClient,
    solidApiDatabaseHost: answers.solidApiDatabaseHost,
    solidApiDatabasePort: answers.solidApiDatabasePort,
    solidApiDatabaseName: answers.solidApiDatabaseName,
    solidApiDatabaseUsername: answers.solidApiDatabaseUsername,
    solidApiDatabasePassword: answers.solidApiDatabasePassword,
    // Forced on for the bootstrap build+seed so the schema exists. Setup
    // never asks the user for a real preference here (unlike create-app),
    // so this stays 'Yes' in the written .env — there is nothing to restore.
    solidApiDatabaseSynchronize: 'Yes',
    // The database has already been verified/created by the time this is
    // built; this field only affects create-app's own DB-precheck step.
    databaseExists: 'Yes',
    solidUiPort: inferred.uiPort,
  };
}

export function properAppNameFor(projectName: string): string {
  return startCase(projectName);
}

/** Mirrors the private generateJwtSecret() in create-app/helpers.ts (64 random bytes, hex). */
export function generateJwtSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Apply overrides on top of a parsed .env.example's content while preserving
 * everything else — comments, grouping, and any project-specific keys
 * (RabbitMQ, OAuth, SMTP, ...) the template doesn't know about. Any blank
 * secret-looking key not covered by `overrides` gets a freshly generated
 * value, matching create-app's own JWT-secret generation.
 *
 * This is the in-memory equivalent of calling setEnvValue() once per key
 * (src/commands/create-app/helpers.ts) — kept as a pure function here so the
 * "which keys end up in the final .env" decision is unit-testable without
 * touching disk.
 */
export function buildEnvFromExample(
  exampleContent: string,
  overrides: Record<string, string>,
): string {
  const parsed = parseEnvFile(exampleContent);
  let content = exampleContent;

  const setInline = (key: string, value: string) => {
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    content = pattern.test(content)
      ? content.replace(pattern, `${key}=${value}`)
      : `${content}${content.endsWith('\n') ? '' : '\n'}${key}=${value}\n`;
  };

  for (const [key, value] of Object.entries(parsed)) {
    if (isGeneratedSecretKey(key) && value === '' && !(key in overrides)) {
      setInline(key, generateJwtSecret());
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    setInline(key, value);
  }

  return content;
}
