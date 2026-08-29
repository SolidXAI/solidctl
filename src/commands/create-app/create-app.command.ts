import { Command } from 'commander';
import { kebabCase, startCase } from 'lodash';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import {
  setupQuestions,
  SetupAnswers,
  SETUP_DEFAULTS,
  DATABASE_CLIENTS,
  SYNCHRONIZE_OPTIONS,
  DATABASE_EXISTS_OPTIONS,
  SOLIDX_VERSION_OPTIONS,
} from './setup-questions';
import {
  copyTemplate,
  createDatabaseIfNotExists,
  verifyDatabaseExists,
  EXCLUDED_DIRS_FOR_INITIAL_COPY,
  generateEnvFileFromConfig,
  getBackendEnvConfig,
  getFrontendEnvJson,
  getTemplatesPath,
  installFromPath,
  setEnvValue,
  SOURCE_TEMPLATE_FOLDER_API,
  SOURCE_TEMPLATE_FOLDER_UI,
  TARGET_FOLDER_API,
  TARGET_FOLDER_UI,
  updatePackageName,
  updatePortInPackageJson,
  updateSolidxPackageVersions,
} from './helpers';
import { getCurrentVersion, getDistTag } from '../../version-check';
import {
  isValidPortValue,
  validateCreateAppPorts,
} from '../../utils/dev-ports';

function detectSolidxVersion(): string {
  const tag = getDistTag(getCurrentVersion());
  return tag === 'beta' ? 'beta' : 'stable';
}


function failCreateApp(message: string): never {
  console.error(chalk.red(message));
  process.exit(1);
}

function buildAnswersFromOptions(options: Record<string, string | boolean | undefined>): SetupAnswers {
  function validatePort(flag: string, value: string): void {
    if (!isValidPortValue(value)) {
      failCreateApp(`Invalid ${flag} value "${value}". Must be a port number 1–65535.`);
    }
  }

  const dbClient = (options.dbClient as string | undefined) ?? SETUP_DEFAULTS.solidApiDatabaseClient;

  if (options.dbClient !== undefined && !DATABASE_CLIENTS.includes(dbClient as any)) {
    failCreateApp(`Invalid --db-client "${dbClient}". Must be one of: ${DATABASE_CLIENTS.join(', ')}`);
  }

  const dbSynchronize = (options.dbSynchronize as string | undefined) ?? SETUP_DEFAULTS.solidApiDatabaseSynchronize;
  if (options.dbSynchronize !== undefined && !SYNCHRONIZE_OPTIONS.includes(dbSynchronize as any)) {
    failCreateApp(`Invalid --db-synchronize "${dbSynchronize}". Must be one of: ${SYNCHRONIZE_OPTIONS.join(', ')}`);
  }

  const dbExists = (options.dbExists as string | undefined) ?? SETUP_DEFAULTS.databaseExists;
  if (options.dbExists !== undefined && !DATABASE_EXISTS_OPTIONS.includes(dbExists as any)) {
    failCreateApp(`Invalid --db-exists "${dbExists}". Must be one of: ${DATABASE_EXISTS_OPTIONS.join(', ')}`);
  }

  const solidxVersion = options.beta ? 'beta' : detectSolidxVersion();
  if (!SOLIDX_VERSION_OPTIONS.includes(solidxVersion as any)) {
    failCreateApp(`Invalid SolidX version "${solidxVersion}". Must be one of: ${SOLIDX_VERSION_OPTIONS.join(', ')}`);
  }

  const dbPortDefault = dbClient === 'PostgreSQL'
    ? SETUP_DEFAULTS.solidApiDatabasePortPostgres
    : dbClient === 'MySQL'
      ? SETUP_DEFAULTS.solidApiDatabasePortMysql
      : SETUP_DEFAULTS.solidApiDatabasePortMssql;

  if (options.apiPort) validatePort('--api-port', options.apiPort as string);
  if (options.dbPort)  validatePort('--db-port',  options.dbPort  as string);
  if (options.uiPort)  validatePort('--ui-port',  options.uiPort  as string);

  const answers: SetupAnswers = {
    projectName:                 (options.name       as string | undefined) ?? SETUP_DEFAULTS.projectName,
    solidxVersion,
    solidApiPort:                (options.apiPort    as string | undefined) ?? SETUP_DEFAULTS.solidApiPort,
    solidApiDatabaseClient:      dbClient,
    solidApiDatabaseHost:        (options.dbHost     as string | undefined) ?? SETUP_DEFAULTS.solidApiDatabaseHost,
    solidApiDatabasePort:        (options.dbPort     as string | undefined) ?? dbPortDefault,
    solidApiDatabaseName:        (options.dbName     as string | undefined) ?? SETUP_DEFAULTS.solidApiDatabaseName,
    solidApiDatabaseUsername:    (options.dbUsername as string | undefined) ?? SETUP_DEFAULTS.solidApiDatabaseUsername,
    solidApiDatabasePassword:    (options.dbPassword as string | undefined) ?? SETUP_DEFAULTS.solidApiDatabasePassword,
    solidApiDatabaseSynchronize: dbSynchronize,
    databaseExists:              dbExists,
    solidUiPort:                 (options.uiPort     as string | undefined) ?? SETUP_DEFAULTS.solidUiPort,
  };

  const portConflict = validateCreateAppPorts(
    answers.solidApiPort,
    answers.solidUiPort,
  );
  if (portConflict) {
    failCreateApp(portConflict);
  }

  return answers;
}

export function registerCreateAppCommand(program: Command) {
  program
    .command('create-app')
    .description(
      'Scaffold a new SolidX project with backend (NestJS) and frontend (Next.js)',
    )
    .option('--verbose', 'Show detailed logs during installation')
    .option('--no-interactive', 'Skip all prompts and use defaults (or provided flags)')
    .option('--name <name>',             `Project name (default: "${SETUP_DEFAULTS.projectName}")`)
    .option('--api-port <port>',         `Backend API port (default: ${SETUP_DEFAULTS.solidApiPort})`)
    .option('--db-client <client>',      `Database: PostgreSQL, MySQL or MSSQL (default: ${SETUP_DEFAULTS.solidApiDatabaseClient})`)
    .option('--db-host <host>',          `Database host (default: ${SETUP_DEFAULTS.solidApiDatabaseHost})`)
    .option('--db-port <port>',          'Database port (default: 5432/PostgreSQL, 1433/MSSQL)')
    .option('--db-name <name>',          `Database name (default: ${SETUP_DEFAULTS.solidApiDatabaseName})`)
    .option('--db-username <username>',  `Database username (default: ${SETUP_DEFAULTS.solidApiDatabaseUsername})`)
    .option('--db-password <password>',  `Database password (default: ${SETUP_DEFAULTS.solidApiDatabasePassword})`)
    .option('--db-synchronize <yes|no>', `Auto-sync DB schema: Yes or No (default: ${SETUP_DEFAULTS.solidApiDatabaseSynchronize})`)
    .option('--db-exists <yes|no>',      `Database already exists: Yes or No (default: ${SETUP_DEFAULTS.databaseExists})`)
    .option('--ui-port <port>',          `Frontend port (default: ${SETUP_DEFAULTS.solidUiPort})`)
    .option('--beta',                    'Force beta release channel for @solidxai/* packages (default: auto-detected from installed solidctl)')
    .action(async (options) => {
      try {
        const showLogs: boolean = options.verbose || false;
        const isNonInteractive: boolean = options.interactive === false;

        let answers: SetupAnswers;

        if (isNonInteractive) {
          answers = buildAnswersFromOptions(options);
        } else {
          console.log(chalk.cyan("Hello, Let's setup your SolidX project!"));
          answers = await inquirer.prompt(setupQuestions);
          answers.solidxVersion = detectSolidxVersion();

          const portConflict = validateCreateAppPorts(
            answers.solidApiPort,
            answers.solidUiPort,
          );
          if (portConflict) {
            failCreateApp(portConflict);
          }
        }

        if (answers.databaseExists === 'Yes') {
          const dbCheckSpinner = ora(`Verifying database "${answers.solidApiDatabaseName}" exists...`).start();
          try {
            const exists = await verifyDatabaseExists(answers);
            if (!exists) {
              dbCheckSpinner.fail(
                `Database "${answers.solidApiDatabaseName}" does not exist. ` +
                `Please create it first, or choose "No" when asked if the database already exists to have it created automatically.`
              );
              process.exit(1);
            }
            dbCheckSpinner.succeed(`Database "${answers.solidApiDatabaseName}" verified`);
          } catch (err: any) {
            dbCheckSpinner.fail(`Could not connect to database server: ${err?.message ?? err}`);
            process.exit(1);
          }
        }

        if (answers.databaseExists === 'No') {
          const dbSpinner = ora(`Creating database "${answers.solidApiDatabaseName}"...`).start();
          try {
            await createDatabaseIfNotExists(answers);
            dbSpinner.succeed(`Database "${answers.solidApiDatabaseName}" created`);
          } catch (err: any) {
            dbSpinner.fail(`Failed to create database: ${err?.message ?? err}`);
            process.exit(1);
          }
        }

        const projectName = kebabCase(answers.projectName.trim());
        const properAppName = startCase(answers.projectName.trim());
        const targetPath = path.join(process.cwd(), projectName);

        // Check if the folder already exists
        if (fs.existsSync(targetPath)) {
          console.log(
            chalk.red(`Error: Directory ${projectName} already exists.`),
          );
          process.exit(1);
        }

        const templatesPath = getTemplatesPath();
        const isBeta = answers.solidxVersion === 'beta';

        const stepOutput = (stepLabel: string) => (line: string) => {
          spinner.text = `${stepLabel} ${chalk.dim('> ' + line)}`;
        };

        // Step 1: Copy base templates and install backend
        let spinner = ora('Step 1: Setting up boilerplate for the backend...').start();
        await copyTemplate(
          templatesPath,
          targetPath,
          EXCLUDED_DIRS_FOR_INITIAL_COPY,
        );
        await copyTemplate(
          path.join(templatesPath, SOURCE_TEMPLATE_FOLDER_API),
          path.join(targetPath, TARGET_FOLDER_API),
        );
        if (isBeta) {
          updateSolidxPackageVersions(targetPath, TARGET_FOLDER_API, 'beta');
        }
        await installFromPath(
          path.join(targetPath, TARGET_FOLDER_API),
          showLogs,
          stepOutput('Step 1: Setting up boilerplate for the backend...'),
        );
        spinner.succeed('Step 1: Backend boilerplate ready');

        // Step 2: Copy and install frontend
        spinner = ora('Step 2: Setting up boilerplate for the frontend...').start();
        await copyTemplate(
          path.join(templatesPath, SOURCE_TEMPLATE_FOLDER_UI),
          path.join(targetPath, TARGET_FOLDER_UI),
        );
        if (isBeta) {
          updateSolidxPackageVersions(targetPath, TARGET_FOLDER_UI, 'beta');
        }
        await installFromPath(
          path.join(targetPath, TARGET_FOLDER_UI),
          showLogs,
          stepOutput('Step 2: Setting up boilerplate for the frontend...'),
        );
        spinner.succeed('Step 2: Frontend boilerplate ready');

        // Step 3: Update package names
        spinner = ora('Step 3: Configuring project packages...').start();
        updatePackageName(
          targetPath,
          TARGET_FOLDER_UI,
          `@${projectName}/${TARGET_FOLDER_UI}`,
        );
        updatePackageName(
          targetPath,
          TARGET_FOLDER_API,
          `@${projectName}/${TARGET_FOLDER_API}`,
        );
        updatePortInPackageJson(targetPath, TARGET_FOLDER_UI, answers.solidUiPort);
        spinner.succeed('Step 3: Package configuration updated');

        // Step 4: Generate .env files
        spinner = ora('Step 4: Generating environment files...').start();
        const backendPath = path.join(targetPath, TARGET_FOLDER_API);
        // Bootstrapping (build + seed below) needs the schema to exist, so
        // synchronize is forced on for this initial write regardless of the
        // user's choice. It's restored to the user's actual choice once
        // seeding succeeds (Step 6).
        generateEnvFileFromConfig(
          backendPath,
          getBackendEnvConfig({ ...answers, solidApiDatabaseSynchronize: 'Yes' }, properAppName),
        );
        const frontendPath = path.join(targetPath, TARGET_FOLDER_UI);
        generateEnvFileFromConfig(frontendPath, getFrontendEnvJson(answers, properAppName));
        spinner.succeed('Step 4: Environment files generated');

        // Step 5: Build the SolidX project
        spinner = ora('Step 5: Building SolidX project...').start();
        try {
          execSync('solidctl build', { cwd: targetPath, stdio: 'pipe' });
          spinner.succeed('Step 5: Build complete');
        } catch (err: any) {
          spinner.fail(`Step 5: Build failed — ${err?.stderr?.toString().trim() || err?.message || err}`);
          process.exit(1);
        }

        // Step 6: Seed the database
        spinner = ora('Step 6: Seeding database...').start();
        try {
          execSync('solidctl seed', { cwd: targetPath, stdio: 'pipe' });
          spinner.succeed('Step 6: Database seeded');
        } catch (err: any) {
          spinner.fail(`Step 6: Seed failed — ${err?.stderr?.toString().trim() || err?.message || err}`);
          process.exit(1);
        }

        // Bootstrap is done — restore the user's actual synchronize choice.
        if (answers.solidApiDatabaseSynchronize !== 'Yes') {
          setEnvValue(path.join(backendPath, '.env'), 'DEFAULT_DATABASE_SYNCHRONIZE', 'false');
        }

        console.log(
          chalk.green(
            `\nProject ${chalk.cyan(projectName)} created successfully!`,
          ),
        );

        console.log(chalk.yellow('\nDefault Admin Credentials:'));
        console.log(chalk.magenta('Username:'), chalk.green('sa'));
        console.log(chalk.magenta('Password:'), chalk.green('Admin@3214$'));

        console.log(chalk.cyan('\nNext steps — start the dev server:'));
        console.log(`  ${chalk.magenta('solidctl start:dev')}\n`);
        console.log(`  ${chalk.dim('API      ')}  ${chalk.blue(`http://localhost:${answers.solidApiPort}`)}`);
        console.log(`  ${chalk.dim('API Ref  ')}  ${chalk.blue(`http://localhost:${answers.solidApiPort}/docs`)}`);
        console.log(`  ${chalk.dim('UI       ')}  ${chalk.blue(`http://localhost:${answers.solidUiPort}`)}\n`);
        console.log(`  ${chalk.dim('Docs     ')}  ${chalk.blue('https://docs.solidxai.com')}\n`);
      } catch (err) {
        console.error('Error:', err);
        process.exit(1);
      }
    });
}
