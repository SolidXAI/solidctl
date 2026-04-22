import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
import mssql from 'mssql';
import { SetupAnswers } from './setup-questions';

export const HIDDEN_TEMPLATES_FOLDER = 'dot-templates';
export const SOURCE_TEMPLATE_FOLDER_API = 'api-template';
export const SOURCE_TEMPLATE_FOLDER_UI = 'ui-template';
export const TARGET_FOLDER_API = 'solid-api';
export const TARGET_FOLDER_UI = 'solid-ui';
export const EXCLUDED_DIRS_FOR_INITIAL_COPY = [
  SOURCE_TEMPLATE_FOLDER_API,
  SOURCE_TEMPLATE_FOLDER_UI,
];

export function getTemplatesPath(): string {
  // From dist/commands/create-app/helpers.js, go up to package root, then into templates/
  const templatesPath = path.join(__dirname, '..', '..', '..', 'templates');
  if (!fs.existsSync(templatesPath)) {
    const error = `Templates folder not found at ${templatesPath}`;
    console.error(chalk.red(error));
    throw new Error(error);
  }
  return templatesPath;
}

export async function copyAndInstallTemplate(
  source: string,
  target: string,
  showLogs: boolean,
  onOutput?: (line: string) => void,
) {
  try {
    await copyTemplate(source, target);
    return installTemplate(target, showLogs, onOutput);
  } catch (error) {
    console.error(chalk.red('Error in copyAndInstallTemplate:'), error);
    throw error;
  }
}

async function installTemplate(
  target: string,
  showLogs: boolean,
  onOutput?: (line: string) => void,
) {
  try {
    const child = execAsync('npm install', { cwd: target });
    if (showLogs && child.child.stdout && child.child.stderr) {
      child.child.stdout.pipe(process.stdout);
      child.child.stderr.pipe(process.stderr);
    } else if (onOutput) {
      const handleData = (data: Buffer) => {
        const lines = data.toString().split(/\r?\n/).filter(Boolean);
        const last = lines[lines.length - 1]?.trim();
        if (last) onOutput(last);
      };
      child.child.stdout?.on('data', handleData);
      child.child.stderr?.on('data', handleData);
    }
    await child;
  } catch (error) {
    console.error(chalk.red('Error during npm install in', target));
    throw error;
  }
}

export async function copyTemplate(
  source: string,
  target: string,
  excludedDirs: string[] = [],
) {
  try {
    await handleCopy(source, target, excludedDirs);
    handleHiddenTemplateFiles(target);
  } catch (error) {
    console.error(
      chalk.red(`Error in copyTemplate: for ${source} to ${target}`),
      error,
    );
    throw error;
  }
}

async function handleCopy(
  source: string,
  target: string,
  excludedDirs: string[] = [],
) {
  await fs.copy(source, target, {
    filter: (src: string) => {
      const relativePath = path.relative(source, src);

      // Always include root path (empty string)
      if (!relativePath) return true;

      // Normalize path separators for cross-platform compatibility
      const normalizedPath = relativePath.split(path.sep).join('/');

      const isExcluded = excludedDirs.some(
        (dir) =>
          normalizedPath === dir || normalizedPath.startsWith(`${dir}/`),
      );

      // Exclude package-lock.json files and node_modules directories
      const filename = path.basename(src);
      if (filename === 'package-lock.json' || filename === 'node_modules') {
        return false;
      }

      return !isExcluded;
    },
  });
}

function handleHiddenTemplateFiles(targetDir: string) {
  if (!fs.lstatSync(targetDir).isDirectory()) {
    return;
  }
  const hiddenTemplatesPath = path.join(targetDir, HIDDEN_TEMPLATES_FOLDER);
  if (!fs.existsSync(hiddenTemplatesPath)) {
    return;
  }
  // Move all the files from dot-templates to the target after removing
  // "dot." prefix and ".template" suffix in the file name
  const files = fs.readdirSync(hiddenTemplatesPath);
  files.forEach((file) => {
    const newFileName = file.replace('dot.', '.').replace('.template', '');
    fs.moveSync(
      path.join(hiddenTemplatesPath, file),
      path.join(targetDir, newFileName),
    );
  });
  fs.removeSync(hiddenTemplatesPath);
}

export function updatePackageName(
  targetPath: string,
  subProject: string,
  packageName: string,
) {
  try {
    const packageJsonPath = path.join(targetPath, subProject, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      const error = `package.json not found at ${packageJsonPath}`;
      console.error(chalk.red(error));
      throw new Error(error);
    }
    const packageJson = fs.readJsonSync(packageJsonPath);
    packageJson.name = packageName;
    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  } catch (error) {
    console.error(chalk.red('Error in updatePackageName:'), error);
    throw error;
  }
}

export function updatePortInPackageJson(
  targetPath: string,
  subProject: string,
  port: string,
) {
  try {
    const packageJsonPath = path.join(targetPath, subProject, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      const error = `package.json not found at ${packageJsonPath}`;
      console.error(chalk.red(error));
      throw new Error(error);
    }
    const packageJson = fs.readJsonSync(packageJsonPath);
    packageJson.scripts.dev = `vite --port ${port}`;
    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  } catch (error) {
    console.error(chalk.red('Error in updatePortInPackageJson:'), error);
    throw error;
  }
}

export async function createDatabaseIfNotExists(answers: SetupAnswers): Promise<void> {
  const { solidApiDatabaseClient: client, solidApiDatabaseHost: host, solidApiDatabasePort: port,
          solidApiDatabaseName: dbName, solidApiDatabaseUsername: user, solidApiDatabasePassword: password } = answers;

  if (client === 'PostgreSQL') {
    const pg = new PgClient({ host, port: parseInt(port), user, password, database: 'postgres' });
    await pg.connect();
    try {
      const res = await pg.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
      if (res.rowCount === 0) {
        await pg.query(`CREATE DATABASE "${dbName}"`);
        console.log(chalk.green(`Database "${dbName}" created successfully.`));
      }
    } finally {
      await pg.end();
    }
  } else if (client === 'MySQL') {
    const conn = await mysql.createConnection({ host, port: parseInt(port), user, password });
    try {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      console.log(chalk.green(`Database \`${dbName}\` created successfully.`));
    } finally {
      await conn.end();
    }
  } else if (client === 'MSSQL') {
    const pool = await mssql.connect({
      server: host, port: parseInt(port), user, password,
      database: 'master',
      options: { trustServerCertificate: true },
    });
    try {
      await pool.request().query(
        `IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}') CREATE DATABASE [${dbName}]`
      );
      console.log(chalk.green(`Database [${dbName}] created successfully.`));
    } finally {
      await pool.close();
    }
  }
}

export function getBackendEnvConfig(answers: SetupAnswers) {
  return {
    General: {
      ENV: 'dev',
      PORT: answers.solidApiPort,
      SOLID_APP_NAME: answers.projectName,
      BASE_URL: `http://localhost:${answers.solidApiPort}`,
    },
    'Default DB Configuration': {
      DEFAULT_DATABASE_USER: answers.solidApiDatabaseUsername,
      DEFAULT_DATABASE_PASSWORD: answers.solidApiDatabasePassword,
      DEFAULT_DATABASE_NAME: answers.solidApiDatabaseName,
      DEFAULT_DATABASE_PORT: answers.solidApiDatabasePort,
      DEFAULT_DATABASE_HOST: answers.solidApiDatabaseHost,
      DEFAULT_DATABASE_SYNCHRONIZE:
        answers.solidApiDatabaseSynchronize === 'Yes' ? 'true' : 'false',
      DEFAULT_DATABASE_LOGGING: 'false',
    },
    'IAM Registration': {
      IAM_PASSWORD_LESS_REGISTRATION: 'false',
      IAM_PASSWORD_LESS_REGISTRATION_VALIDATE_WHAT: 'transactional',
      IAM_ALLOW_PUBLIC_REGISTRATION: 'true',
      IAM_ACTIVATE_USER_ON_REGISTRATION: 'true',
      IAM_DEFAULT_ROLE: 'Admin',
    },
    'IAM JWT': {
      IAM_JWT_TOKEN_AUDIENCE: `http://localhost:${answers.solidApiPort}`,
      IAM_JWT_TOKEN_ISSUER: answers.projectName,
      IAM_JWT_SECRET: generateJwtSecret(),
    },
  };
}

export function getFrontendEnvJson(answers: SetupAnswers) {
  return {
    General: {
      VITE_BACKEND_API_URL: `http://localhost:${answers.solidApiPort}`,
      VITE_API_URL: `http://localhost:${answers.solidApiPort}`,
      VITE_SOLIDX_ENV: 'dev',
      VITE_SOLID_APP_TITLE: answers.projectName,
      VITE_SOLID_APP_DESCRIPTION: '',
    },
  };
}

export function generateEnvFileFromConfig(
  targetPath: string,
  envConfig: Record<string, Record<string, string>>,
) {
  try {
    const envPath = path.join(targetPath, '.env');
    let envContent = '';
    for (const group in envConfig) {
      envContent += `\n# ${group}\n`;
      for (const key in envConfig[group]) {
        const value = envConfig[group][key];
        if (value) {
          envContent += `${key}=${value}\n`;
        }
      }
    }
    fs.writeFileSync(envPath, envContent);
  } catch (error) {
    console.error(chalk.red('Error in generateEnvFileFromConfig:'), error);
    throw error;
  }
}

function generateJwtSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function prettyOutput(
  label: string,
  value: string,
  helpText: string | null = null,
): string {
  const formattedLabel = label ? chalk.magenta(label) : '';
  const paddedLabel = formattedLabel.padEnd(10);
  const outputLabel = formattedLabel ? `${paddedLabel}:` : paddedLabel;
  const formattedHelpText = helpText ? chalk.cyan(`(${helpText})`) : '';
  const outputHelpText = formattedHelpText
    ? `\n${''.padEnd(10)} ${formattedHelpText}`
    : '';
  return `${outputLabel} ${chalk.green(value)}${outputHelpText}\n`;
}
