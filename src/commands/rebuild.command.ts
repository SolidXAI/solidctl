import { Command } from 'commander';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function exec(cmd: string, cwd?: string) {
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
}

function chmodIfExists(file: string) {
  if (!fs.existsSync(file)) {
    throw new Error(`Required file not found: ${file}`);
  }
  fs.chmodSync(file, 0o755);
}

export function registerRebuildCommand(program: Command) {
  program
    .command('rebuild')
    .description('Rebuild Solid API and ensure solid CLI is available')
    .action(() => {
      const projectRoot = process.cwd();

      console.log('▶ Building project');
      exec('npm run build');

      console.log('▶ Ensuring CLI files are executable');
      chmodIfExists(path.join(projectRoot, 'dist/main-cli.js'));
      chmodIfExists(path.join(projectRoot, 'bin/solid'));

      console.log('▶ Adding local bin to PATH');
      process.env.PATH = `${path.join(projectRoot, 'bin')}${path.delimiter}${process.env.PATH}`;

      console.log('▶ Verifying solid CLI availability');
      const result = spawnSync('solid', ['--help'], {
        stdio: 'ignore',
        env: process.env,
      });

      if (result.error) {
        console.error('❌ solid CLI not found');
        process.exit(1);
      }

      console.log('✔ solid CLI ready');
    });
}