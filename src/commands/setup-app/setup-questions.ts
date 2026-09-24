import { DATABASE_CLIENTS } from '../create-app/setup-questions';

/** Answers collected for setting up an existing SolidX project's database connection. */
export interface SetupProjectAnswers {
  solidApiDatabaseClient: string;
  solidApiDatabaseHost: string;
  solidApiDatabasePort: string;
  solidApiDatabaseName: string;
  solidApiDatabaseUsername: string;
  solidApiDatabasePassword: string;
}

export const SETUP_DB_DEFAULTS = {
  solidApiDatabaseClient: 'PostgreSQL',
  solidApiDatabaseHost: 'localhost',
  solidApiDatabasePortPostgres: '5432',
  solidApiDatabasePortMssql: '1433',
  solidApiDatabasePortMysql: '3306',
  solidApiDatabaseName: 'solidx_app_db',
  solidApiDatabaseUsername: 'solidx_app_user',
  solidApiDatabasePassword: 'strongpassword',
} as const;

/**
 * The DB block, unlike create-app's full setup, is the only thing that
 * genuinely cannot be inferred from an existing project's files — project
 * name and UI port are read from package.json instead (see helpers.ts).
 */
export const setupDbQuestions = [
  {
    type: 'list',
    name: 'solidApiDatabaseClient',
    message: 'Select your database?',
    choices: [...DATABASE_CLIENTS],
    default: SETUP_DB_DEFAULTS.solidApiDatabaseClient,
  },
  {
    type: 'input',
    name: 'solidApiDatabaseHost',
    message: 'Enter your database host',
    default: SETUP_DB_DEFAULTS.solidApiDatabaseHost,
  },
  {
    type: 'input',
    name: 'solidApiDatabasePort',
    message: 'Enter your database port',
    default: (answers: SetupProjectAnswers) => {
      if (answers.solidApiDatabaseClient === 'PostgreSQL')
        return SETUP_DB_DEFAULTS.solidApiDatabasePortPostgres;
      if (answers.solidApiDatabaseClient === 'MySQL')
        return SETUP_DB_DEFAULTS.solidApiDatabasePortMysql;
      return SETUP_DB_DEFAULTS.solidApiDatabasePortMssql;
    },
  },
  {
    type: 'input',
    name: 'solidApiDatabaseName',
    message: 'Enter your database name',
    default: SETUP_DB_DEFAULTS.solidApiDatabaseName,
  },
  {
    type: 'input',
    name: 'solidApiDatabaseUsername',
    message: 'Enter your database username',
    default: SETUP_DB_DEFAULTS.solidApiDatabaseUsername,
  },
  {
    type: 'password',
    name: 'solidApiDatabasePassword',
    message: 'Enter your database password',
    default: SETUP_DB_DEFAULTS.solidApiDatabasePassword,
  },
];
