#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import { AppModule } from './app.module';
import { registerLocalUpgradeCommand } from './commands/local-upgrade.command';
import { registerBuildCommand } from './commands/build.command';
import { registerUpgradeCommand } from './commands/upgrade.command';
import { registerSeedCommand } from './commands/seed.command';
import { registerInfoCommand } from './commands/info.command';
import { registerTestCommand } from './commands/test.command';
import { registerCreateAppCommand } from './commands/create-app/create-app.command';
import { registerReleaseCommand } from './commands/release.command';
import { registerLegacyMigrateCommand } from './commands/legacy-migrate.command';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    AppModule,
    { logger: false } // CLI usually doesn't need Nest logs
  );

  const program = new Command();

  program
    .name('solidctl')
    .description('Solidctl tool')
    .version('0.1.0');

  registerUpgradeCommand(program);
  registerBuildCommand(program);
  registerLocalUpgradeCommand(program);
  registerSeedCommand(program);
  registerInfoCommand(program);
  registerTestCommand(program);
  registerCreateAppCommand(program);
  registerReleaseCommand(program);
  registerLegacyMigrateCommand(program);
  await program.parseAsync(process.argv);

  await appContext.close();
}

bootstrap();
