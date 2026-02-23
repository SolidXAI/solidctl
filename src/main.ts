#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import { AppModule } from './app.module';
import { registerBuildCommand } from './commands/build.command';
import { registerCreateAppCommand } from './commands/create-app/create-app.command';
import { registerGenerateCommand } from './commands/generate.command';
import { registerInfoCommand } from './commands/info.command';
import { registerLegacyMigrateCommand } from './commands/legacy-migrate.command';
import { registerLocalUpgradeCommand } from './commands/local-upgrade.command';
import { registerMcpCommand } from './commands/mcp.command';
import { registerMigrateCommand } from './commands/migrate/migrate.command';
import { registerReleaseCommand } from './commands/release.command';
import { registerSeedCommand } from './commands/seed.command';
import { registerTestCommand } from './commands/test.command';
import { registerUpgradeCommand } from './commands/upgrade.command';

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
  registerGenerateCommand(program);
  registerMcpCommand(program);
  registerMigrateCommand(program);
  await program.parseAsync(process.argv);

  await appContext.close();
}

bootstrap();
