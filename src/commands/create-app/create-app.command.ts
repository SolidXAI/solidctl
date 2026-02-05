import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { setupQuestions, SetupAnswers } from './setup-questions.js';
import {
  copyAndInstallTemplate,
  copyTemplate,
  EXCLUDED_DIRS_FOR_INITIAL_COPY,
  generateEnvFileFromConfig,
  getBackendEnvConfig,
  getFrontendEnvJson,
  getTemplatesPath,
  prettyOutput,
  SOURCE_TEMPLATE_FOLDER_API,
  SOURCE_TEMPLATE_FOLDER_UI,
  TARGET_FOLDER_API,
  TARGET_FOLDER_UI,
  updatePackageName,
  updatePortInPackageJson,
} from './helpers.js';

function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function registerCreateAppCommand(program: Command) {
  program
    .command('create-app')
    .description(
      'Scaffold a new Solid project with backend (NestJS) and frontend (Next.js)',
    )
    .option('--verbose', 'Show detailed logs during installation')
    .action(async (options) => {
      try {
        const showLogs: boolean = options.verbose || false;

        console.log(chalk.cyan("Hello, Let's setup your Solid project!"));

        const answers: SetupAnswers = await inquirer.prompt(setupQuestions);

        const projectName = kebabCase(answers.projectName.trim());
        const targetPath = path.join(process.cwd(), projectName);

        // Check if the folder already exists
        if (fs.existsSync(targetPath)) {
          console.log(
            chalk.red(`Error: Directory ${projectName} already exists.`),
          );
          process.exit(1);
        }

        // Step 1: Copy base templates (dot-files, shared config)
        console.log(
          prettyOutput('\nStep 1', 'Setting up boilerplate for the backend'),
        );
        const templatesPath = getTemplatesPath();
        await copyTemplate(
          templatesPath,
          targetPath,
          EXCLUDED_DIRS_FOR_INITIAL_COPY,
        );

        // Step 2: Copy and install backend (NestJS)
        await copyAndInstallTemplate(
          path.join(templatesPath, SOURCE_TEMPLATE_FOLDER_API),
          path.join(targetPath, TARGET_FOLDER_API),
          showLogs,
        );

        // Step 3: Copy and install frontend (Next.js)
        console.log(
          prettyOutput('Step 2', 'Setting up boilerplate for the frontend'),
        );
        await copyAndInstallTemplate(
          path.join(templatesPath, SOURCE_TEMPLATE_FOLDER_UI),
          path.join(targetPath, TARGET_FOLDER_UI),
          showLogs,
        );

        // Step 4: Update package names
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

        // Step 5: Generate .env files
        const backendPath = path.join(targetPath, TARGET_FOLDER_API);
        console.log(
          prettyOutput(
            'Step 3',
            `Generating .env file for the backend at ${chalk.cyan(backendPath)}`,
          ),
        );
        generateEnvFileFromConfig(backendPath, getBackendEnvConfig(answers));

        const frontendPath = path.join(targetPath, TARGET_FOLDER_UI);
        console.log(
          prettyOutput(
            'Step 4',
            `Generating .env file for the frontend at ${chalk.cyan(frontendPath)}`,
          ),
        );
        generateEnvFileFromConfig(frontendPath, getFrontendEnvJson(answers));

        // Step 6: Print next steps
        console.log(
          chalk.green(
            `Project ${chalk.cyan(projectName)} created successfully!`,
          ),
        );
        console.log(
          chalk.cyan(
            '\nEnsure the database is created and connection is established correctly.',
          ),
        );
        console.log(chalk.cyan('\nNext steps:'));
        console.log(
          prettyOutput(
            ' npx @solidx/solidctl@latest build',
            'This will build the Solid project',
          ),
        );
        console.log(
          prettyOutput(
            ' npx @solidx/solidctl@latest seed',
            'This will seed the database with the required metadata',
          ),
        );

        console.log(chalk.cyan('\nRun the api:'));
        console.log(
          prettyOutput(
            `cd ${projectName}/${TARGET_FOLDER_API}`,
            'Navigate into api directory',
          ),
        );
        console.log(
          prettyOutput(
            'npm run solidx:dev',
            `Starts the backend in development mode with live reload on @http://localhost:${answers.solidApiPort}`,
          ),
        );
        console.log(
          prettyOutput(
            'npm run build && npm run start',
            `Builds and starts the backend in production mode on @http://localhost:${answers.solidApiPort}`,
          ),
        );
        console.log(
          chalk.cyan(
            `Api documentation is available on @http://localhost:${answers.solidApiPort}/docs`,
          ),
        );

        console.log(chalk.cyan('\nRun the frontend:'));
        console.log(
          prettyOutput(
            `cd ${projectName}/${TARGET_FOLDER_UI}`,
            'Navigate into ui directory',
          ),
        );
        console.log(
          prettyOutput(
            'npm run solidx:dev',
            `Starts the frontend in development mode with live reload on @http://localhost:${answers.solidUiPort}`,
          ),
        );
        console.log(
          prettyOutput(
            'npm run build && npm run start',
            `Builds and starts the frontend in production mode on @http://localhost:${answers.solidUiPort}`,
          ),
        );
      } catch (err) {
        console.error('Error:', err);
        process.exit(1);
      }
    });
}
