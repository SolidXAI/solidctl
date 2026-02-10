import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { setupQuestions, SetupAnswers } from './setup-questions';
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
} from './helpers';

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
      'Scaffold a new SolidX project with backend (NestJS) and frontend (Next.js)',
    )
    .option('--verbose', 'Show detailed logs during installation')
    .action(async (options) => {
      try {
        const showLogs: boolean = options.verbose || false;

        console.log(chalk.cyan("Hello, Let's setup your SolidX project!"));

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
            `cd ${projectName}`,
            'Navigate into the project root directory',
          ),
        );
        console.log(
          prettyOutput(
            'npx @solidxai/solidctl@latest build && npx @solidxai/solidctl@latest seed',
            'This will build the SolidX project and seed the database with the required metadata',
          ),
        );

        console.log(chalk.cyan('\nRun the api and frontend in separate terminals:'));

        console.log(chalk.cyan('\n  Terminal 1 (API):'));
        console.log(
          prettyOutput(
            `cd ${TARGET_FOLDER_API} && npm run solidx:dev`,
            `Starts the backend at http://localhost:${answers.solidApiPort} (docs at /docs)`,
          ),
        );

        console.log(chalk.cyan('\n  Terminal 2 (Frontend):'));
        console.log(
          prettyOutput(
            `cd ${TARGET_FOLDER_UI} && npm run solidx:dev`,
            `Starts the frontend at http://localhost:${answers.solidUiPort}`,
          ),
        );

        console.log(
          chalk.cyan('\nFor production builds:'),
        );

        console.log(chalk.cyan('\n  API:'));
        console.log(
          prettyOutput(
            `cd ${TARGET_FOLDER_API} && npm run build && npm run start`,
            `Builds and starts the API server at http://localhost:${answers.solidApiPort}`,
          ),
        );

        console.log(chalk.cyan('\n  Frontend:'));
        console.log(
          prettyOutput(
            `cd ${TARGET_FOLDER_UI} && npm run build`,
            `Builds the frontend — serve ${TARGET_FOLDER_UI}/dist with your web server (Nginx, Apache, etc.)`,
          ),
        );
      } catch (err) {
        console.error('Error:', err);
        process.exit(1);
      }
    });
}
