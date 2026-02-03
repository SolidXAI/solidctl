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

  if (process.platform === 'win32') {
    // Windows: Create .cmd and .ps1 files
    const shimCmd = path.join(solidctlBinDir, 'solid.cmd');
    const shimCmdContent = `@echo off\r\nnode "${shimJs}" %*\r\n`;
    fs.writeFileSync(shimCmd, shimCmdContent, 'utf8');

    const shimPs1 = path.join(solidctlBinDir, 'solid.ps1');
    const shimPs1Content = `#!/usr/bin/env pwsh
$shimPath = "${shimJs}"  
& node $shimPath @args
exit $LASTEXITCODE
`;
    fs.writeFileSync(shimPs1, shimPs1Content, 'utf8');

    return { solidctlBinDir, shimCmd, shimPs1 };
  } else {
    // POSIX: Create executable shell script
    const shimPosix = path.join(solidctlBinDir, 'solid');
    const shimPosixContent = "#!/usr/bin/env node\nrequire('./solid-shim.js');\n";
    fs.writeFileSync(shimPosix, shimPosixContent, 'utf8');
    fs.chmodSync(shimPosix, 0o755);

    return { solidctlBinDir, shimPosix };
  }
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

function ensureGlobalSolid(shimFiles: any, shimDir: string) {
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

    try {
      if (process.platform === 'win32') {
        // Windows: Copy both .cmd and .ps1 files
        const destCmd = path.join(dir, 'solid.cmd');
        const destPs1 = path.join(dir, 'solid.ps1');

        fs.rmSync(destCmd, { force: true });
        fs.rmSync(destPs1, { force: true });

        console.log(`▶ [WIN32] Copying ${shimFiles.shimCmd} -> ${destCmd}`);
        fs.copyFileSync(shimFiles.shimCmd, destCmd);

        console.log(`▶ [WIN32] Copying ${shimFiles.shimPs1} -> ${destPs1}`);
        fs.copyFileSync(shimFiles.shimPs1, destPs1);

        return { linked: true, location: dir, viaPath: false };
      } else {
        // POSIX: Create symlink
        const dest = path.join(dir, 'solid');
        fs.rmSync(dest, { force: true });

        console.log(`▶ [POSIX] Creating symlink ${dest} -> ${shimFiles.shimPosix}`);
        fs.symlinkSync(shimFiles.shimPosix, dest);

        return { linked: true, location: dir, viaPath: false };
      }
    } catch {
      continue;
    }
  }

  return { linked: false, location: shimDir, viaPath: false };
}

/**
 * 1. Create symlink or copy to one of the below executables from the 1st writable PATH directory
 * 2. Windows: ~/.solidctl/bin/solid.cmd and ~/.solidctl/bin/solid.ps1
 *    POSIX: ~/.solidctl/bin/solid
 * 3. All of these execute ~/.solidctl/bin/solid-shim.js
 * 4. ~/.solidctl/bin/solid-shim.js uses ~/.solidctl/solid-current to point directly to <consuming-project-root>/solid-api/dist/main-cli.js
 * @param program
 */
export function registerBuildCommand(program: Command) {
  program
    .command('build')
    .description('Build Solid API and set up Solid CLI')
    .action(() => {
      validateProjectRoot();
      const projectRoot = process.cwd();

      console.log('▶ Building project');
      exec('npm run build', `${projectRoot}/solid-api`);

      console.log('▶ Ensuring CLI files are executable');
      const mainCli = path.join(projectRoot, 'solid-api', 'dist', 'main-cli.js');
      chmodIfExists(mainCli);

      console.log('▶ Updating solid CLI shim');
      const shimFiles = ensureSolidShim(mainCli);

      console.log('▶ Linking solid CLI for global use');
      const linkResult = ensureGlobalSolid(shimFiles, shimFiles.solidctlBinDir);
      if (!linkResult.linked) {
        console.warn(`⚠️  Add ${shimFiles.solidctlBinDir} to PATH to use "solid" globally.`);
      }

      console.log('▶ Adding local bin to PATH');
      process.env.PATH = `${shimFiles.solidctlBinDir}${path.delimiter}${process.env.PATH || ''}`;
      console.log('▶ Verifying solid CLI availability');
      const solidCommand = process.platform === 'win32' ? 'solid.cmd' : 'solid';
      const result = spawnSync(solidCommand, ['--help'], {
        stdio: 'ignore',
        env: process.env,
        shell: process.platform === 'win32' ? true : false, 
      });

      if (result.error) {
        console.error('❌ solid CLI not found');
        process.exit(1);
      }

      console.log('✔ solid CLI ready');
    });
}
