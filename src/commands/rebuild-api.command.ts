import { Command } from 'commander';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
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

function ensureSolidShim(mainCliPath: string) {
  const homeDir = os.homedir();
  const solidctlDir = path.join(homeDir, '.solidctl');
  const solidctlBinDir = path.join(solidctlDir, 'bin');
  fs.mkdirSync(solidctlBinDir, { recursive: true });

  const pointerFile = path.join(solidctlDir, 'solid-current');
  fs.writeFileSync(pointerFile, `${mainCliPath}\n`, 'utf8');

  const shimJs = path.join(solidctlBinDir, 'solid-shim.js');
  const shimJsSource = path.join(__dirname, '..', 'shims', 'solid-shim.js');
  const shimJsContent = fs.readFileSync(shimJsSource, 'utf8');
  fs.writeFileSync(shimJs, shimJsContent, 'utf8');

  const shimPosix = path.join(solidctlBinDir, 'solid');
  const shimPosixContent = "#!/usr/bin/env node\nrequire('./solid-shim.js');\n";
  fs.writeFileSync(shimPosix, shimPosixContent, { encoding: 'utf8', mode: 0o755 });
  fs.chmodSync(shimPosix, 0o755);

  const shimCmd = path.join(solidctlBinDir, 'solid.cmd');
  const shimCmdContent = '@echo off\r\nnode "%~dp0solid-shim.js" %*\r\n';
  fs.writeFileSync(shimCmd, shimCmdContent, 'utf8');

  return { solidctlBinDir, shimPosix, shimCmd };
}

function isWritableDir(dir: string) {
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      return false;
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureGlobalSolid(shimPosix: string, shimCmd: string, shimDir: string) {

  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  // console.log('▶ Examining path');
  // console.log(JSON.stringify(pathEntries, null, 4));

  if (pathEntries.includes(shimDir)) {
    return { linked: true, location: shimDir, viaPath: true };
  }

  for (const dir of pathEntries) {
    if (!isWritableDir(dir)) {
      continue;
    }

    const dest = path.join(dir, process.platform === 'win32' ? 'solid.cmd' : 'solid');
    try {
      fs.rmSync(dest, { force: true });
      if (process.platform === 'win32') {
        console.log(`▶ [WIN32] Copying file ${shimPosix} -> ${dest}`);
        fs.copyFileSync(shimCmd, dest);
      } else {
        console.log(`▶ [POSIX] Creating symlink ${dest} -> ${shimPosix}`);
        fs.symlinkSync(shimPosix, dest);
      }
      return { linked: true, location: dir, viaPath: false };
    } catch {
      continue;
    }
  }

  return { linked: false, location: shimDir, viaPath: false };
}

/**
 * 1. Create symlink or copy to one of the below executables from the 1st writable PATH directory
 * 2. ~/.solidctl/bin/solid or ~/.solidctl/bin/solid.cmd
 * 3. Both of these simply execute ~/.solidctl/bin/solid-shim.js
 * 4. ~/.solidctl/bin/solid-shim.js uses ~/.solidctl/solid-current to point directly to <consuming-project-root>/solid-api/dist/main-cli.js
 * @param program
 */
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
      chmodIfExists(mainCli);

      console.log('▶ Updating solid CLI shim');
      const { solidctlBinDir, shimPosix, shimCmd } = ensureSolidShim(mainCli);

      console.log('▶ Linking solid CLI for global use');
      const linkResult = ensureGlobalSolid(shimPosix, shimCmd, solidctlBinDir);
      if (!linkResult.linked) {
        console.warn(`⚠️  Add ${solidctlBinDir} to PATH to use "solid" globally.`);
      }

      console.log('▶ Adding local bin to PATH');
      process.env.PATH = `${solidctlBinDir}${path.delimiter}${process.env.PATH || ''}`;
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
