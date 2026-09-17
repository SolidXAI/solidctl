import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import { validateProjectRoot, validateProjectScript } from '../../helper';
import { isInteractiveSession } from '../../utils/interactive';
import {
  isValidPortValue,
  validateCreateAppPorts,
} from '../../utils/dev-ports';
import { runBuild } from '../build.command';
import { runSeed } from '../seed.command';
import { DEV_SERVICE_SCRIPTS, StartSupervisor } from '../start.command';
import {
  createDatabaseIfNotExists,
  generateEnvFileFromConfig,
  getBackendEnvConfig,
  getFrontendEnvJson,
  installFromPath,
  setEnvValue,
  verifyDatabaseExists,
} from '../create-app/helpers';
import { DATABASE_CLIENTS } from '../create-app/setup-questions';
import {
  buildDatabaseUrl,
  buildEnvFromExample,
  defaultDbPortForClient,
  DB_ENV_KEYS,
  DbField,
  inferProjectName,
  inferUiPort,
  MinimalPackageJson,
  parseEnvFile,
  planEnvWrite,
  properAppNameFor,
  resolveAnswersFromExample,
  toCreateAppAnswers,
  toDbTypeEnvValue,
} from './helpers';
import {
  setupDbQuestions,
  SETUP_DB_DEFAULTS,
  SetupProjectAnswers,
} from './setup-questions';

export interface SetupOptions {
  start?: boolean;
  interactive?: boolean;
  verbose?: boolean;
  skipInstall?: boolean;
  skipBuild?: boolean;
  skipSeed?: boolean;
  forceEnv?: boolean;
  dbClient?: string;
  dbHost?: string;
  dbPort?: string;
  dbName?: string;
  dbUsername?: string;
  dbPassword?: string;
}

const DB_FIELD_ANSWER_KEY: Record<DbField, keyof SetupProjectAnswers> = {
  client: 'solidApiDatabaseClient',
  host: 'solidApiDatabaseHost',
  port: 'solidApiDatabasePort',
  name: 'solidApiDatabaseName',
  username: 'solidApiDatabaseUsername',
  password: 'solidApiDatabasePassword',
};

const DB_FIELD_OPTION_KEY: Record<DbField, keyof SetupOptions> = {
  client: 'dbClient',
  host: 'dbHost',
  port: 'dbPort',
  name: 'dbName',
  username: 'dbUsername',
  password: 'dbPassword',
};

function failSetup(message: string): never {
  console.error(chalk.red(message));
  process.exit(1);
}

/** Fails fast rather than letting inquirer hang on non-TTY stdin (see utils/interactive.ts). */
function ensurePromptable() {
  if (!isInteractiveSession()) {
    failSetup(
      'This step requires interactive input but no TTY was detected.\n' +
        'Re-run with --no-interactive and the relevant --db-* flags (or accept the defaults).',
    );
  }
}

/** Non-interactive counterpart to the full setupDbQuestions prompt — mirrors create-app's own flag validation. */
function buildSetupAnswersFromOptions(
  options: SetupOptions,
): SetupProjectAnswers {
  const dbClient = options.dbClient ?? SETUP_DB_DEFAULTS.solidApiDatabaseClient;
  if (
    options.dbClient !== undefined &&
    !DATABASE_CLIENTS.includes(dbClient as (typeof DATABASE_CLIENTS)[number])
  ) {
    failSetup(
      `Invalid --db-client "${dbClient}". Must be one of: ${DATABASE_CLIENTS.join(', ')}`,
    );
  }

  const dbPort = options.dbPort ?? defaultDbPortForClient(dbClient);
  if (options.dbPort !== undefined && !isValidPortValue(dbPort)) {
    failSetup(
      `Invalid --db-port value "${dbPort}". Must be a port number 1-65535.`,
    );
  }

  return {
    solidApiDatabaseClient: dbClient,
    solidApiDatabaseHost:
      options.dbHost ?? SETUP_DB_DEFAULTS.solidApiDatabaseHost,
    solidApiDatabasePort: dbPort,
    solidApiDatabaseName:
      options.dbName ?? SETUP_DB_DEFAULTS.solidApiDatabaseName,
    solidApiDatabaseUsername:
      options.dbUsername ?? SETUP_DB_DEFAULTS.solidApiDatabaseUsername,
    solidApiDatabasePassword:
      options.dbPassword ?? SETUP_DB_DEFAULTS.solidApiDatabasePassword,
  };
}

/**
 * Collect every DB value the user passed explicitly as a --db-* flag.
 *
 * An explicit flag always wins, whether or not the field was flagged as
 * needing a prompt — otherwise `--db-username` would be silently discarded
 * for a project whose .env.example already fills that key in.
 */
export function collectExplicitDbFlags(
  options: SetupOptions,
): Partial<SetupProjectAnswers> {
  const explicit: Partial<SetupProjectAnswers> = {};

  for (const field of Object.keys(DB_FIELD_ANSWER_KEY) as DbField[]) {
    const optionValue = options[DB_FIELD_OPTION_KEY[field]] as
      | string
      | undefined;
    if (optionValue === undefined) {
      continue;
    }

    if (
      field === 'client' &&
      !DATABASE_CLIENTS.includes(
        optionValue as (typeof DATABASE_CLIENTS)[number],
      )
    ) {
      failSetup(
        `Invalid --db-client "${optionValue}". Must be one of: ${DATABASE_CLIENTS.join(', ')}`,
      );
    }

    if (field === 'port' && !isValidPortValue(optionValue)) {
      failSetup(
        `Invalid --db-port value "${optionValue}". Must be a port number 1-65535.`,
      );
    }

    (explicit as Record<string, string>)[DB_FIELD_ANSWER_KEY[field]] =
      optionValue;
  }

  return explicit;
}

/** Prompts for the DB fields planEnvWrite flagged as needing a value, minus any supplied by flag. */
async function gatherDbAnswers(
  fields: DbField[],
  options: SetupOptions,
  isNonInteractive: boolean,
): Promise<Partial<SetupProjectAnswers>> {
  const explicit = collectExplicitDbFlags(options);
  const remaining = fields.filter(
    (field) => explicit[DB_FIELD_ANSWER_KEY[field]] === undefined,
  );

  if (!remaining.length || isNonInteractive) {
    return explicit;
  }

  ensurePromptable();
  const answerKeys = new Set<string>(
    remaining.map((field) => DB_FIELD_ANSWER_KEY[field]),
  );
  const filteredQuestions = setupDbQuestions.filter((question) =>
    answerKeys.has(question.name),
  );
  const prompted = (await inquirer.prompt(
    filteredQuestions,
  )) as Partial<SetupProjectAnswers>;

  return { ...prompted, ...explicit };
}

export function registerSetupCommand(program: Command) {
  program
    .command('setup')
    .description(
      'Install, configure, build, and seed an already-bootstrapped SolidX project, then start it',
    )
    .option('--no-start', 'Skip starting the dev servers after setup')
    .option(
      '--no-interactive',
      'Skip all prompts and use defaults (or provided flags)',
    )
    .option('--verbose', 'Show detailed logs during installation')
    .option('--skip-install', 'Skip npm install for solid-api and solid-ui')
    .option('--skip-build', 'Skip solidctl build')
    .option('--skip-seed', 'Skip solidctl seed')
    .option('--force-env', 'Regenerate .env files even if they already exist')
    .option(
      '--db-client <client>',
      `Database: PostgreSQL, MySQL or MSSQL (default: ${SETUP_DB_DEFAULTS.solidApiDatabaseClient})`,
    )
    .option(
      '--db-host <host>',
      `Database host (default: ${SETUP_DB_DEFAULTS.solidApiDatabaseHost})`,
    )
    .option(
      '--db-port <port>',
      'Database port (default: 5432/PostgreSQL, 3306/MySQL, 1433/MSSQL)',
    )
    .option(
      '--db-name <name>',
      `Database name (default: ${SETUP_DB_DEFAULTS.solidApiDatabaseName})`,
    )
    .option(
      '--db-username <username>',
      `Database username (default: ${SETUP_DB_DEFAULTS.solidApiDatabaseUsername})`,
    )
    .option(
      '--db-password <password>',
      `Database password (default: ${SETUP_DB_DEFAULTS.solidApiDatabasePassword})`,
    )
    .action(async (options: SetupOptions) => {
      try {
        await runSetup(options);
      } catch (err) {
        console.error(chalk.red('Error:'), err);
        process.exit(1);
      }
    });
}

async function runSetup(options: SetupOptions) {
  const isNonInteractive = options.interactive === false;

  // Step 0: Gate
  validateProjectRoot();
  validateProjectScript('solid-api', 'solidx:dev');
  validateProjectScript('solid-ui', 'solidx:dev');

  const projectRoot = process.cwd();
  const backendPath = path.join(projectRoot, 'solid-api');
  const frontendPath = path.join(projectRoot, 'solid-ui');
  const backendEnvPath = path.join(backendPath, '.env');
  const backendEnvExamplePath = path.join(backendPath, '.env.example');
  const frontendEnvPath = path.join(frontendPath, '.env');
  const frontendEnvExamplePath = path.join(frontendPath, '.env.example');

  // Step 1: Inspect
  const apiPackageJson = fs.readJsonSync(
    path.join(backendPath, 'package.json'),
  ) as MinimalPackageJson;
  const uiPackageJson = fs.readJsonSync(
    path.join(frontendPath, 'package.json'),
  ) as MinimalPackageJson;
  const projectName = inferProjectName(apiPackageJson, projectRoot);
  const properAppName = properAppNameFor(projectName);
  const uiPort = inferUiPort(uiPackageJson);

  const backendEnvExists = fs.existsSync(backendEnvPath);
  const exampleContent = fs.existsSync(backendEnvExamplePath)
    ? fs.readFileSync(backendEnvExamplePath, 'utf8')
    : null;

  // PORT lives only in .env / .env.example — prefer the file setup is about to
  // use as its source, so the port conflict check, the generated solid-ui/.env
  // and the reported URLs all agree with what solid-api will actually bind to.
  const apiPortSource = backendEnvExists
    ? 'solid-api/.env'
    : exampleContent !== null
      ? 'solid-api/.env.example'
      : null;
  const apiPort =
    (backendEnvExists
      ? parseEnvFile(fs.readFileSync(backendEnvPath, 'utf8')).PORT
      : exampleContent !== null
        ? parseEnvFile(exampleContent).PORT
        : undefined) || '3000';

  console.log(chalk.cyan('Setting up your SolidX project...'));
  console.log(chalk.dim(`  Project name  ${projectName}`));
  console.log(
    chalk.dim(
      `  API port      ${apiPort}${apiPortSource ? ` (from ${apiPortSource})` : ' (default)'}`,
    ),
  );
  console.log(
    chalk.dim(`  UI port       ${uiPort} (from solid-ui/package.json)`),
  );

  // Step 2: Environment
  const envPlan = planEnvWrite({
    envExists: backendEnvExists,
    exampleContent,
    forceEnv: Boolean(options.forceEnv),
  });

  let dbAnswers: SetupProjectAnswers;
  let pendingSynchronizeRestore: string | null = null;

  if (envPlan.action === 'skip-existing') {
    console.log(
      chalk.dim(
        '\nsolid-api/.env already exists — leaving it untouched (use --force-env to regenerate).',
      ),
    );
    const existingEnv = parseEnvFile(fs.readFileSync(backendEnvPath, 'utf8'));
    dbAnswers = resolveAnswersFromExample(existingEnv, {});
  } else if (envPlan.action === 'from-example') {
    console.log(
      chalk.dim('\nFound solid-api/.env.example — filling in the gaps.'),
    );
    if (envPlan.otherBlankKeys.length) {
      console.warn(
        chalk.yellow(
          `⚠ .env.example leaves these keys blank; fill them in manually after setup: ${envPlan.otherBlankKeys.join(', ')}`,
        ),
      );
    }

    const prompted = await gatherDbAnswers(
      envPlan.promptDbFields,
      options,
      isNonInteractive,
    );
    dbAnswers = resolveAnswersFromExample(envPlan.parsed, prompted);

    const overrides: Record<string, string> = {
      [DB_ENV_KEYS.host]: dbAnswers.solidApiDatabaseHost,
      [DB_ENV_KEYS.port]: dbAnswers.solidApiDatabasePort,
      [DB_ENV_KEYS.name]: dbAnswers.solidApiDatabaseName,
      [DB_ENV_KEYS.username]: dbAnswers.solidApiDatabaseUsername,
      [DB_ENV_KEYS.password]: dbAnswers.solidApiDatabasePassword,
      SOLID_CORE_DB_TYPE: toDbTypeEnvValue(dbAnswers.solidApiDatabaseClient),
      DATABASE_URL: buildDatabaseUrl(dbAnswers),
      // Bootstrapping (build + seed below) needs the schema to exist, so
      // synchronize is forced on here regardless of the example's value.
      // It's restored to that value once seeding succeeds.
      DEFAULT_DATABASE_SYNCHRONIZE: 'true',
    };

    const originalSynchronize = envPlan.parsed.DEFAULT_DATABASE_SYNCHRONIZE;
    if (
      originalSynchronize !== undefined &&
      originalSynchronize.toLowerCase() !== 'true'
    ) {
      pendingSynchronizeRestore = originalSynchronize;
    }

    fs.writeFileSync(
      backendEnvPath,
      buildEnvFromExample(exampleContent as string, overrides),
    );
    console.log(chalk.green('Generated solid-api/.env from .env.example'));
  } else {
    console.warn(
      chalk.yellow(
        `\n⚠ ${
          backendEnvExists
            ? 'Regenerating solid-api/.env from the template (--force-env), discarding its current contents.'
            : 'No solid-api/.env or .env.example found.'
        } Prompting for database settings — ` +
          'other settings this project may use (RabbitMQ, OAuth, SMTP, Redis, ...) will need to be added manually.',
      ),
    );

    if (isNonInteractive) {
      dbAnswers = buildSetupAnswersFromOptions(options);
    } else {
      ensurePromptable();
      console.log(chalk.cyan("\nLet's configure your database connection:"));
      dbAnswers = (await inquirer.prompt(
        setupDbQuestions,
      )) as SetupProjectAnswers;
    }

    const createAppAnswers = toCreateAppAnswers(dbAnswers, {
      projectName,
      apiPort,
      uiPort,
    });
    const backendEnvConfig = getBackendEnvConfig(
      createAppAnswers,
      properAppName,
    );
    generateEnvFileFromConfig(backendPath, {
      ...backendEnvConfig,
      'Default DB Configuration': {
        ...backendEnvConfig['Default DB Configuration'],
        SOLID_CORE_DB_TYPE: toDbTypeEnvValue(dbAnswers.solidApiDatabaseClient),
        DATABASE_URL: buildDatabaseUrl(dbAnswers),
      },
    });
    console.log(chalk.green('Generated solid-api/.env'));
  }

  // Frontend .env follows the same skip/example/generate policy, independently of the backend.
  const frontendEnvExists = fs.existsSync(frontendEnvPath);
  if (frontendEnvExists && !options.forceEnv) {
    console.log(
      chalk.dim(
        'solid-ui/.env already exists — leaving it untouched (use --force-env to regenerate).',
      ),
    );
  } else if (fs.existsSync(frontendEnvExamplePath)) {
    fs.writeFileSync(
      frontendEnvPath,
      buildEnvFromExample(fs.readFileSync(frontendEnvExamplePath, 'utf8'), {}),
    );
    console.log(chalk.green('Generated solid-ui/.env from .env.example'));
  } else {
    const createAppAnswers = toCreateAppAnswers(dbAnswers, {
      projectName,
      apiPort,
      uiPort,
    });
    generateEnvFileFromConfig(
      frontendPath,
      getFrontendEnvJson(createAppAnswers, properAppName),
    );
    console.log(chalk.green('Generated solid-ui/.env'));
  }

  // Step 3: Ports
  const portConflict = validateCreateAppPorts(apiPort, uiPort);
  if (portConflict) {
    failSetup(portConflict);
  }

  // Step 4: Database
  if (dbAnswers.solidApiDatabaseClient !== 'PostgreSQL') {
    console.warn(
      chalk.yellow(
        `\n⚠ The SolidX API template only ships a PostgreSQL driver today. solid-api is likely to fail ` +
          `to boot against ${dbAnswers.solidApiDatabaseClient} until that's addressed upstream.`,
      ),
    );
  }

  const createAppAnswers = toCreateAppAnswers(dbAnswers, {
    projectName,
    apiPort,
    uiPort,
  });
  const dbSpinner = ora(
    `Verifying database "${dbAnswers.solidApiDatabaseName}"...`,
  ).start();
  try {
    const exists = await verifyDatabaseExists(createAppAnswers);
    if (exists) {
      dbSpinner.succeed(
        `Database "${dbAnswers.solidApiDatabaseName}" verified`,
      );
    } else {
      dbSpinner.stop();
      let shouldCreate = isNonInteractive;
      if (!isNonInteractive) {
        ensurePromptable();
        ({ shouldCreate } = (await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldCreate',
            message: `Database "${dbAnswers.solidApiDatabaseName}" does not exist. Create it now?`,
            default: true,
          },
        ])) as { shouldCreate: boolean });
      }

      if (!shouldCreate) {
        failSetup('Aborted: database does not exist.');
      }

      const createSpinner = ora(
        `Creating database "${dbAnswers.solidApiDatabaseName}"...`,
      ).start();
      await createDatabaseIfNotExists(createAppAnswers);
      createSpinner.succeed(
        `Database "${dbAnswers.solidApiDatabaseName}" created`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dbSpinner.fail(`Could not verify/create database: ${message}`);
    process.exit(1);
  }

  // Step 5: Install
  if (!options.skipInstall) {
    const showLogs = Boolean(options.verbose);

    // installFromPath rethrows on a failed npm install; fail the spinner
    // explicitly so a network/registry error doesn't leave it spinning.
    const install = async (target: string, label: string) => {
      const spinner = ora(`Installing ${label} dependencies...`).start();
      try {
        await installFromPath(target, showLogs, (line) => {
          spinner.text = `Installing ${label} dependencies... ${chalk.dim('> ' + line)}`;
        });
        spinner.succeed(`${label} dependencies installed`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(`Failed to install ${label} dependencies: ${message}`);
        process.exit(1);
      }
    };

    await install(backendPath, 'solid-api');
    await install(frontendPath, 'solid-ui');
  }

  // Step 6: Build
  if (!options.skipBuild) {
    console.log(chalk.cyan('\nBuilding solid-api...'));
    try {
      runBuild(projectRoot, {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`❌ Build failed: ${message}`));
      process.exit(1);
    }
  }

  // Step 7: Seed
  if (!options.skipSeed) {
    console.log(chalk.cyan('\nSeeding database...'));
    runSeed(projectRoot, []);
  }

  // Bootstrap is done — restore the synchronize value the .env.example asked
  // for. This runs even when seeding was skipped, so --skip-seed can't leave
  // the project pinned to the forced-on value.
  if (pendingSynchronizeRestore !== null) {
    setEnvValue(
      backendEnvPath,
      'DEFAULT_DATABASE_SYNCHRONIZE',
      pendingSynchronizeRestore,
    );
  }

  // Step 8: Report
  console.log(chalk.green(`\n${projectName} is set up!`));
  console.log(chalk.yellow('\nDefault Admin Credentials:'));
  console.log(chalk.magenta('Username:'), chalk.green('sa'));
  console.log(chalk.magenta('Password:'), chalk.green('Admin@3214$'));
  console.log(
    `\n  ${chalk.dim('API      ')}  ${chalk.blue(`http://localhost:${apiPort}`)}`,
  );
  console.log(
    `  ${chalk.dim('API Ref  ')}  ${chalk.blue(`http://localhost:${apiPort}/docs`)}`,
  );
  console.log(
    `  ${chalk.dim('UI       ')}  ${chalk.blue(`http://localhost:${uiPort}`)}\n`,
  );

  // Step 9: Start
  if (options.start === false) {
    console.log(`Next: ${chalk.magenta('solidctl start:dev')}`);
    return;
  }

  console.log(chalk.cyan('Starting SolidX dev processes...\n'));
  const supervisor = new StartSupervisor(
    projectRoot,
    DEV_SERVICE_SCRIPTS,
    {},
    true,
  );
  await supervisor.start();
}
