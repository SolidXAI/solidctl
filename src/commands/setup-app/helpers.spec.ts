import {
  buildDatabaseUrl,
  buildEnvFromExample,
  DB_ENV_KEYS,
  defaultDbPortForClient,
  fromDbTypeEnvValue,
  inferProjectName,
  inferUiPort,
  isSecretKey,
  parseEnvFile,
  planEnvFromExample,
  planEnvWrite,
  properAppNameFor,
  resolveAnswersFromExample,
  toCreateAppAnswers,
  toDbTypeEnvValue,
} from './helpers';
import { SetupProjectAnswers } from './setup-questions';

describe('inferProjectName', () => {
  it('strips the scope from a "@<project>/solid-api" package name', () => {
    expect(inferProjectName({ name: '@sapphire/solid-api' }, '/anywhere')).toBe(
      'sapphire',
    );
  });

  it('falls back to the directory name for an unscoped package name', () => {
    expect(
      inferProjectName({ name: 'solid-api' }, '/Users/dev/my-solid-app'),
    ).toBe('my-solid-app');
  });

  it('falls back to the directory name when package.json has no name', () => {
    expect(inferProjectName(undefined, '/Users/dev/my-solid-app')).toBe(
      'my-solid-app',
    );
  });
});

describe('inferUiPort', () => {
  it('reads the port out of a --port dev script', () => {
    expect(inferUiPort({ scripts: { dev: 'vite --port 3001' } })).toBe('3001');
  });

  it('defaults to 5173 for a bare vite dev script', () => {
    expect(inferUiPort({ scripts: { dev: 'vite' } })).toBe('5173');
  });

  it('defaults to 5173 when package.json has no dev script', () => {
    expect(inferUiPort(undefined)).toBe('5173');
  });
});

describe('parseEnvFile', () => {
  it('parses key/value pairs, ignoring comments and blank lines', () => {
    const content = [
      '# General',
      'PORT=3000',
      '',
      '# Default DB Configuration',
      'DEFAULT_DATABASE_HOST=localhost',
      'DEFAULT_DATABASE_PASSWORD=',
    ].join('\n');

    expect(parseEnvFile(content)).toEqual({
      PORT: '3000',
      DEFAULT_DATABASE_HOST: 'localhost',
      DEFAULT_DATABASE_PASSWORD: '',
    });
  });

  it('strips surrounding quotes from values', () => {
    expect(parseEnvFile('IAM_JWT_TOKEN_ISSUER="my-app"')).toEqual({
      IAM_JWT_TOKEN_ISSUER: 'my-app',
    });
  });

  it('keeps everything after the first "=" when a value contains one', () => {
    expect(
      parseEnvFile('DATABASE_URL=postgresql://user:pass@host:5432/db?x=1'),
    ).toEqual({
      DATABASE_URL: 'postgresql://user:pass@host:5432/db?x=1',
    });
  });

  it('ignores lines without an "="', () => {
    expect(parseEnvFile('not a valid line')).toEqual({});
  });

  // setup reads PORT out of .env / .env.example to decide the API port; a
  // blank value must not win over the 3000 default (setup uses `|| '3000'`).
  it('returns an empty string for a declared-but-blank PORT', () => {
    expect(parseEnvFile('PORT=').PORT).toBe('');
  });
});

describe('isSecretKey', () => {
  it('flags keys ending in _PASSWORD or _SECRET', () => {
    expect(isSecretKey('DEFAULT_DATABASE_PASSWORD')).toBe(true);
    expect(isSecretKey('IAM_JWT_SECRET')).toBe(true);
    expect(isSecretKey('NEXTAUTH_SECRET')).toBe(true);
  });

  it('does not flag non-secret keys', () => {
    expect(isSecretKey('DEFAULT_DATABASE_HOST')).toBe(false);
    expect(isSecretKey('PORT')).toBe(false);
  });
});

describe('toDbTypeEnvValue / fromDbTypeEnvValue', () => {
  it('maps every client to its SOLID_CORE_DB_TYPE value and back', () => {
    expect(toDbTypeEnvValue('PostgreSQL')).toBe('postgres');
    expect(toDbTypeEnvValue('MySQL')).toBe('mysql');
    expect(toDbTypeEnvValue('MSSQL')).toBe('mssql');

    expect(fromDbTypeEnvValue('postgres')).toBe('PostgreSQL');
    expect(fromDbTypeEnvValue('mysql')).toBe('MySQL');
    expect(fromDbTypeEnvValue('mssql')).toBe('MSSQL');
  });

  it('returns null for an unrecognized or missing value', () => {
    expect(fromDbTypeEnvValue('oracle')).toBeNull();
    expect(fromDbTypeEnvValue(undefined)).toBeNull();
  });
});

describe('defaultDbPortForClient', () => {
  it('returns the standard port for each client', () => {
    expect(defaultDbPortForClient('PostgreSQL')).toBe('5432');
    expect(defaultDbPortForClient('MySQL')).toBe('3306');
    expect(defaultDbPortForClient('MSSQL')).toBe('1433');
  });
});

describe('buildDatabaseUrl', () => {
  const baseAnswers: SetupProjectAnswers = {
    solidApiDatabaseClient: 'PostgreSQL',
    solidApiDatabaseHost: 'localhost',
    solidApiDatabasePort: '5432',
    solidApiDatabaseName: 'my_db',
    solidApiDatabaseUsername: 'my_user',
    solidApiDatabasePassword: 'p@ss/word',
  };

  it('builds a postgresql:// URL by default, percent-encoding the password', () => {
    expect(buildDatabaseUrl(baseAnswers)).toBe(
      'postgresql://my_user:p%40ss%2Fword@localhost:5432/my_db',
    );
  });

  it('builds a mysql+pymysql:// URL for MySQL', () => {
    expect(
      buildDatabaseUrl({ ...baseAnswers, solidApiDatabaseClient: 'MySQL' }),
    ).toBe('mysql+pymysql://my_user:p%40ss%2Fword@localhost:5432/my_db');
  });

  it('builds a mssql+pyodbc:// URL for MSSQL', () => {
    const url = buildDatabaseUrl({
      ...baseAnswers,
      solidApiDatabaseClient: 'MSSQL',
    });
    expect(url).toContain(
      'mssql+pyodbc://my_user:p%40ss%2Fword@localhost:5432/my_db?driver=',
    );
  });

  it('omits the password segment when there is no password', () => {
    expect(
      buildDatabaseUrl({ ...baseAnswers, solidApiDatabasePassword: '' }),
    ).toBe('postgresql://my_user@localhost:5432/my_db');
  });
});

describe('planEnvFromExample', () => {
  it('flags the password field even when the example fills it in, but leaves other filled DB fields alone', () => {
    const example = [
      'DEFAULT_DATABASE_HOST=db.internal',
      'DEFAULT_DATABASE_PORT=5432',
      'DEFAULT_DATABASE_NAME=sapphire_db',
      'DEFAULT_DATABASE_USER=sapphire_user',
      'DEFAULT_DATABASE_PASSWORD=',
      'SOLID_CORE_DB_TYPE=postgres',
    ].join('\n');

    const plan = planEnvFromExample(example);

    expect(plan.promptDbFields.sort()).toEqual(['password']);
    expect(plan.otherBlankKeys).toEqual([]);
  });

  it('flags "client" for prompting when SOLID_CORE_DB_TYPE is absent', () => {
    const plan = planEnvFromExample('DEFAULT_DATABASE_HOST=localhost');
    expect(plan.promptDbFields).toContain('client');
  });

  it('reports non-DB blank keys separately, excluding IAM_JWT_SECRET', () => {
    const example = [
      'DEFAULT_DATABASE_HOST=localhost',
      'IAM_JWT_SECRET=',
      'COMMON_SMTP_EMAIL_PASSWORD=',
    ].join('\n');

    const plan = planEnvFromExample(example);
    expect(plan.otherBlankKeys).toEqual(['COMMON_SMTP_EMAIL_PASSWORD']);
  });
});

describe('planEnvWrite', () => {
  it('skips an existing .env unless forceEnv is set', () => {
    expect(
      planEnvWrite({ envExists: true, exampleContent: null, forceEnv: false }),
    ).toEqual({
      action: 'skip-existing',
    });
  });

  it('prompts for the full DB block when forceEnv overrides an existing .env and there is no example', () => {
    expect(
      planEnvWrite({ envExists: true, exampleContent: null, forceEnv: true }),
    ).toEqual({
      action: 'prompt-full',
    });
  });

  it('uses the example plan when a .env.example is present and there is no .env', () => {
    const plan = planEnvWrite({
      envExists: false,
      exampleContent: 'DEFAULT_DATABASE_PASSWORD=',
      forceEnv: false,
    });

    expect(plan.action).toBe('from-example');
  });

  it('prompts for the full DB block when neither .env nor .env.example exists', () => {
    expect(
      planEnvWrite({ envExists: false, exampleContent: null, forceEnv: false }),
    ).toEqual({
      action: 'prompt-full',
    });
  });
});

describe('resolveAnswersFromExample', () => {
  it('carries over parsed values not covered by a prompted answer', () => {
    const parsed = {
      [DB_ENV_KEYS.host]: 'db.internal',
      [DB_ENV_KEYS.port]: '5432',
      [DB_ENV_KEYS.name]: 'sapphire_db',
      [DB_ENV_KEYS.username]: 'sapphire_user',
      SOLID_CORE_DB_TYPE: 'postgres',
    };

    const answers = resolveAnswersFromExample(parsed, {
      solidApiDatabasePassword: 'entered-pw',
    });

    expect(answers).toEqual({
      solidApiDatabaseClient: 'PostgreSQL',
      solidApiDatabaseHost: 'db.internal',
      solidApiDatabasePort: '5432',
      solidApiDatabaseName: 'sapphire_db',
      solidApiDatabaseUsername: 'sapphire_user',
      solidApiDatabasePassword: 'entered-pw',
    });
  });

  it('falls back to defaults when neither the example nor a prompt supplies a value', () => {
    const answers = resolveAnswersFromExample({}, {});
    expect(answers.solidApiDatabaseClient).toBe('PostgreSQL');
    expect(answers.solidApiDatabaseHost).toBe('localhost');
    expect(answers.solidApiDatabasePort).toBe('5432');
  });

  it('picks the client-appropriate default port when the client comes from a prompt', () => {
    const answers = resolveAnswersFromExample(
      {},
      { solidApiDatabaseClient: 'MySQL' },
    );
    expect(answers.solidApiDatabasePort).toBe('3306');
  });
});

describe('buildEnvFromExample', () => {
  it('applies overrides while preserving comments and unrelated keys', () => {
    const example = [
      '# General',
      'PORT=3000',
      '',
      '# Default DB Configuration',
      'DEFAULT_DATABASE_HOST=localhost',
      'DEFAULT_DATABASE_PASSWORD=',
      '',
      '# Queues',
      'QUEUES_RABBIT_MQ_URL=amqp://localhost',
    ].join('\n');

    const result = buildEnvFromExample(example, {
      DEFAULT_DATABASE_HOST: 'db.internal',
      DEFAULT_DATABASE_PASSWORD: 'entered-pw',
    });

    expect(result).toContain('# General');
    expect(result).toContain('DEFAULT_DATABASE_HOST=db.internal');
    expect(result).toContain('DEFAULT_DATABASE_PASSWORD=entered-pw');
    expect(result).toContain('QUEUES_RABBIT_MQ_URL=amqp://localhost');
  });

  it('generates a fresh value for a blank self-issued secret', () => {
    const result = buildEnvFromExample('IAM_JWT_SECRET=', {});
    const match = /^IAM_JWT_SECRET=(.+)$/m.exec(result);

    expect(match).not.toBeNull();
    expect(match?.[1]).toMatch(/^[0-9a-f]{128}$/);
  });

  // An invented SMTP/OAuth credential would look configured but fail to
  // authenticate, and would defeat the "fill these in manually" warning.
  it('leaves blank external credentials blank rather than inventing one', () => {
    const result = buildEnvFromExample(
      ['COMMON_SMTP_EMAIL_PASSWORD=', 'IAM_GOOGLE_OAUTH_CLIENT_SECRET='].join(
        '\n',
      ),
      {},
    );

    expect(result).toContain('COMMON_SMTP_EMAIL_PASSWORD=\n');
    expect(result).toContain('IAM_GOOGLE_OAUTH_CLIENT_SECRET=');
    expect(result).not.toMatch(/COMMON_SMTP_EMAIL_PASSWORD=.+/);
  });

  it('does not overwrite a non-blank, non-overridden value', () => {
    const result = buildEnvFromExample('PORT=3000', {});
    expect(result).toBe('PORT=3000');
  });

  it('appends a key that is missing from the example entirely', () => {
    const result = buildEnvFromExample('PORT=3000', {
      DATABASE_URL: 'postgresql://x',
    });
    expect(result).toContain('PORT=3000');
    expect(result).toContain('DATABASE_URL=postgresql://x');
  });
});

describe('toCreateAppAnswers', () => {
  it("maps the minimal DB-block answers onto create-app's full SetupAnswers shape", () => {
    const answers: SetupProjectAnswers = {
      solidApiDatabaseClient: 'PostgreSQL',
      solidApiDatabaseHost: 'localhost',
      solidApiDatabasePort: '5432',
      solidApiDatabaseName: 'my_db',
      solidApiDatabaseUsername: 'my_user',
      solidApiDatabasePassword: 'secret',
    };

    const result = toCreateAppAnswers(answers, {
      projectName: 'my-app',
      apiPort: '3000',
      uiPort: '5173',
    });

    expect(result.projectName).toBe('my-app');
    expect(result.solidApiPort).toBe('3000');
    expect(result.solidUiPort).toBe('5173');
    expect(result.solidApiDatabaseSynchronize).toBe('Yes');
    expect(result.databaseExists).toBe('Yes');
    expect(result.solidApiDatabaseHost).toBe('localhost');
  });
});

describe('properAppNameFor', () => {
  it('title-cases a kebab-case project name', () => {
    expect(properAppNameFor('my-solid-app')).toBe('My Solid App');
  });
});
