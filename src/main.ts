#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { AppModule } from './app.module';
import { checkForUpdates } from './version-check';
import { registerLocalUpgradeCommand } from './commands/local-upgrade.command';
import { registerBuildCommand } from './commands/build.command';
import { registerUpgradeCommand } from './commands/upgrade.command';
import { registerSeedCommand } from './commands/seed.command';
import { registerInfoCommand } from './commands/info.command';
import { registerTestCommand } from './commands/test.command';
import { registerCreateAppCommand } from './commands/create-app/create-app.command';
import { registerReleaseCommand } from './commands/release.command';
import { registerLegacyMigrateCommand } from './commands/legacy-migrate.command';
import { registerGenerateCommand } from './commands/generate.command';
import { registerMcpCommand } from './commands/mcp.command';
import { registerAgentCommand } from './commands/agent.command';
import { registerMigrationCommand } from './commands/migration.command';
import { registerStartCommand } from './commands/start.command';

function getCliVersion(): string {
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf-8'),
    ) as { version?: string };
    return packageJson.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    AppModule,
    { logger: false }, // CLI usually doesn't need Nest logs
  );

  const program = new Command();

  program
    .name('solidctl')
    .description('Solidctl tool')
    .version(getCliVersion());

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
  registerMigrationCommand(program);
  registerMcpCommand(program);
  registerAgentCommand(program);
  registerStartCommand(program);

  program.hook('preAction', async () => {
    await checkForUpdates();
  });

  await program.parseAsync(process.argv);

  await appContext.close();
}

void bootstrap();
