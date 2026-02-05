#!/usr/bin/env node

import { Logger } from "@nestjs/common";
import { existsSync } from "fs";
import { CommandFactory } from "nest-commander";
import { resolve } from "path";
import { AppModule } from "./app.module";
import { configurePgInt8TypeParser } from "./database.utils";

const logger = new Logger("Bootstrap");

// Suppress punycode deprecation warning from dependencies
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return; // Ignore known punycode deprecation from dependencies
  }
  console.warn(warning); // Still show other warnings
});

// ---- Global safety nets (must be first) ----
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

async function bootstrap() {
  // setup log levels...
  const showLogs = process.argv.includes('--verbose') || process.argv.includes('-v');
  // strip before nest-commander runs...
  stripArg('--verbose');
  stripArg('-v');

  // validate project existence
  validateProjectRootPath();

  // Define log levels based on the flag
  const logLevels = showLogs ? ['debug', 'error', 'fatal', 'log', 'verbose', 'warn'] : ['error', 'fatal'];

  const appModule = await AppModule.forRoot();
  // const app = await NestFactory.create(appModule);

  // Create an instance of the application, capture the application context so we can inject it into a service in itself.
  // @ts-ignore
  const app = await CommandFactory.createWithoutRunning(appModule, logLevels);
  // const app = await CommandFactory.createWithoutRunning(AppModule, ['debug', 'error', 'fatal', 'log', 'verbose', 'warn']);
  // const app = await CommandFactory.createWithoutRunning(AppModule, ['error', 'fatal']);

  // Configure pg type parser before running the app
  configurePgInt8TypeParser();

  // Now run the command factory.
  try {
    await CommandFactory.runApplication(app);
  }
  catch (e) {
    process.exit(1);
  }

  // Exit explicitly, make sure that any commands you have created and are using Promises, you do not keep them orphan/dangling.
  process.exit(0);
}

bootstrap();

// Check if the current directory is a valid Solid API project
function validateProjectRootPath() {
  const packageJsonPath = resolve(process.cwd(), "package.json");
  if (!existsSync(packageJsonPath)) {
    logger.log("Does not seem to be a valid solid-api project.");
    process.exit(1);
  }
}

// Utility function to strip a specific argument from process.argv
function stripArg(flag: string) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1) process.argv.splice(idx, 1);
}