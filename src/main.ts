#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import { AppModule } from './app.module';
import { registerLocalUpgradeCommand } from './commands/local-upgrade.command';
import { registerRebuildCommand } from './commands/rebuild-api.command';
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

  program
    .command('hello')
    .description('Say hello')
    .option('-n, --name <name>', 'Name', 'World')
    .action((options) => {
      console.log(`Hello ${options.name}!`);
    });

  registerUpgradeCommand(program);
  registerRebuildCommand(program);
  registerLocalUpgradeCommand(program);
  await program.parseAsync(process.argv);

  await appContext.close();
}

bootstrap();