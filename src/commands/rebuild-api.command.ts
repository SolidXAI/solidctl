import { Command } from 'commander';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { validateProjectRoot } from 'src/helper';

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
    .command('rebuild-api')
    .description('Rebuild Solid API and ensure solid CLI is available')
    .action(() => {
      validateProjectRoot();
      const projectRoot = process.cwd();

      console.log('▶ Building project');
      exec('npm run build', `${projectRoot}/solid-api`);

      console.log('▶ Ensuring CLI files are executable');
      const mainCli = path.join(projectRoot, 'solid-api', 'dist', 'main-cli.js');
      const binSolid = path.join(projectRoot, 'solid-api', 'bin', 'solid');

      // console.log(`-- ${mainCli}`);
      // console.log(`-- ${binSolid}`);
      chmodIfExists(mainCli);
      chmodIfExists(binSolid);

      console.log('▶ Adding local bin to PATH');
      process.env.PATH = `${path.join(projectRoot, 'solid-api', 'bin')}${path.delimiter}${process.env.PATH}`;
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