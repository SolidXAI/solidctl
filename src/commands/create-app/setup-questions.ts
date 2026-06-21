export interface SetupAnswers {
  projectName: string;
  solidxVersion: string;
  solidApiPort: string;
  databaseMode: string;
  solidApiDatabaseClient: string;
  solidApiDatabaseHost: string;
  solidApiDatabasePort: string;
  solidApiDatabaseName: string;
  solidApiDatabaseUsername: string;
  solidApiDatabasePassword: string;
  solidApiDatabaseSynchronize: string;
  databaseExists: string;
  solidUiPort: string;
}

export const SETUP_DEFAULTS = {
  projectName:                  'my-solid-app',
  solidxVersion:                'stable',
  solidApiPort:                 '3000',
  databaseMode:                 'embedded',
  solidApiDatabaseClient:       'PostgreSQL',
  solidApiDatabaseHost:         'localhost',
  solidApiDatabasePortPostgres: '5432',
  solidApiDatabasePortMssql:    '1433',
  solidApiDatabasePortMysql:    '3306',
  solidApiDatabaseName:         'solidx_app_db',
  solidApiDatabaseUsername:     'solidx_app_user',
  solidApiDatabasePassword:     'strongpassword',
  solidApiDatabaseSynchronize:  'Yes',
  databaseExists:               'Yes',
  solidUiPort:                  '3001',
} as const;

export const DATABASE_CLIENTS = ['PostgreSQL', 'MySQL', 'MSSQL'] as const;
export const DATABASE_MODES = ['embedded', 'external'] as const;
export const SYNCHRONIZE_OPTIONS = ['Yes', 'No'] as const;
export const DATABASE_EXISTS_OPTIONS = ['Yes', 'No'] as const;
export const SOLIDX_VERSION_OPTIONS = ['stable', 'beta'] as const;

export const setupQuestions = [
  {
    type: 'input',
    name: 'projectName',
    message: 'What is the name of your project?',
    default: 'my-solid-app',
  },
  {
    type: 'list',
    name: 'solidxVersion',
    message: 'Which SolidX version would you like to use?',
    choices: ['stable', 'beta'],
    default: 'stable',
  },
  {
    type: 'input',
    name: 'solidApiPort',
    message: 'Enter your backend api port',
    default: '3000',
  },
  {
    type: 'list',
    name: 'databaseMode',
    message: 'How do you want to run the database?',
    choices: [
      { name: 'Embedded (zero-config, no Docker or PostgreSQL — recommended to try SolidX)', value: 'embedded' },
      { name: 'External (connect to your own PostgreSQL, MySQL or MSSQL)', value: 'external' },
    ],
    default: 'embedded',
  },
  {
    type: 'list',
    name: 'solidApiDatabaseClient',
    message: 'Select your database?',
    choices: ['PostgreSQL', 'MySQL', 'MSSQL'],
    default: 'PostgreSQL',
    when: (answers: SetupAnswers) => answers.databaseMode !== 'embedded',
  },
  {
    type: 'input',
    name: 'solidApiDatabaseHost',
    message: 'Enter your database host',
    default: 'localhost',
    when: (answers: SetupAnswers) => answers.databaseMode !== 'embedded',
  },
  {
    type: 'input',
    name: 'solidApiDatabasePort',
    message: 'Enter your database port',
    default: (answers: SetupAnswers) => {
      if (answers.solidApiDatabaseClient === 'PostgreSQL') return '5432';
      if (answers.solidApiDatabaseClient === 'MySQL') return '3306';
      return '1433';
    },
    when: (answers: SetupAnswers) => answers.databaseMode !== 'embedded',
  },
  {
    type: 'input',
    name: 'solidApiDatabaseName',
    message: 'Enter your database name',
    default: 'solidx_app_db',
    when: (answers: SetupAnswers) => answers.databaseMode !== 'embedded',
  },
  {
    type: 'input',
    name: 'solidApiDatabaseUsername',
    message: 'Enter your database username',
    default: 'solidx_app_user',
    when: (answers: SetupAnswers) => answers.databaseMode !== 'embedded',
  },
  {
    type: 'password',
    name: 'solidApiDatabasePassword',
    message: 'Enter your database password',
    default: 'strongpassword',
    when: (answers: SetupAnswers) => answers.databaseMode !== 'embedded',
  },
  {
    type: 'list',
    name: 'solidApiDatabaseSynchronize',
    message:
      'Automatically update database schema when models change? (Not recommended for production)',
    choices: ['Yes', 'No'],
    default: 'Yes',
    when: (answers: SetupAnswers) => answers.databaseMode !== 'embedded',
  },
  {
    type: 'list',
    name: 'databaseExists',
    message: 'Does this database already exist?',
    choices: ['Yes', 'No'],
    default: 'Yes',
    when: (answers: SetupAnswers) => answers.databaseMode !== 'embedded',
  },
  {
    type: 'input',
    name: 'solidUiPort',
    message: 'Enter your frontend app port',
    default: '3001',
  },
];
