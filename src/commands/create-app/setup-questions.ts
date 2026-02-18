export interface SetupAnswers {
  projectName: string;
  solidApiPort: string;
  solidApiDatabaseClient: string;
  solidApiDatabaseHost: string;
  solidApiDatabasePort: string;
  solidApiDatabaseName: string;
  solidApiDatabaseUsername: string;
  solidApiDatabasePassword: string;
  solidApiDatabaseSynchronize: string;
  solidUiPort: string;
}

export const SETUP_DEFAULTS = {
  projectName:                  'my-solid-app',
  solidApiPort:                 '3000',
  solidApiDatabaseClient:       'PostgreSQL',
  solidApiDatabaseHost:         'localhost',
  solidApiDatabasePortPostgres: '5432',
  solidApiDatabasePortMssql:    '1433',
  solidApiDatabaseName:         'solidx_app_db',
  solidApiDatabaseUsername:     'solidx_app_user',
  solidApiDatabasePassword:     'strongpassword',
  solidApiDatabaseSynchronize:  'Yes',
  solidUiPort:                  '3001',
} as const;

export const DATABASE_CLIENTS = ['PostgreSQL', 'MSSQL'] as const;
export const SYNCHRONIZE_OPTIONS = ['Yes', 'No'] as const;

export const setupQuestions = [
  {
    type: 'input',
    name: 'projectName',
    message: 'What is the name of your project?',
    default: 'my-solid-app',
  },
  {
    type: 'input',
    name: 'solidApiPort',
    message: 'Enter your backend api port',
    default: '3000',
  },
  {
    type: 'list',
    name: 'solidApiDatabaseClient',
    message: 'Select your database?',
    choices: ['PostgreSQL', 'MSSQL'],
    default: 'PostgreSQL',
  },
  {
    type: 'input',
    name: 'solidApiDatabaseHost',
    message: 'Enter your database host',
    default: 'localhost',
  },
  {
    type: 'input',
    name: 'solidApiDatabasePort',
    message: 'Enter your database port',
    default: (answers: SetupAnswers) => {
      return answers.solidApiDatabaseClient === 'PostgreSQL' ? '5432' : '1433';
    },
  },
  {
    type: 'input',
    name: 'solidApiDatabaseName',
    message: 'Enter your database name',
    default: 'solidx_app_db',
  },
  {
    type: 'input',
    name: 'solidApiDatabaseUsername',
    message: 'Enter your database username',
    default: 'solidx_app_user',
  },
  {
    type: 'password',
    name: 'solidApiDatabasePassword',
    message: 'Enter your database password',
    default: 'strongpassword',
  },
  {
    type: 'list',
    name: 'solidApiDatabaseSynchronize',
    message:
      'Automatically update database schema when models change? (Not recommended for production)',
    choices: ['Yes', 'No'],
    default: 'Yes',
  },
  {
    type: 'input',
    name: 'solidUiPort',
    message: 'Enter your frontend app port',
    default: '3001',
  },
];
