import { Command } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { validateProjectRoot } from '../helper';

function exec(cmd: string, cwd?: string) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function ensureEnv(vars: string[]) {
  const missing = vars.filter(v => !process.env[v]);
  if (missing.length) {
    console.error(
      `❌ Missing required env vars: ${missing.join(', ')}`
    );
    process.exit(1);
  }
}

function packAndInstall(packagePath: string, installPath: string) {
  if (!packagePath || !installPath) {
    throw new Error('packagePath and installPath are required');
  }

  const absPackagePath = path.resolve(packagePath);
  const absInstallPath = path.resolve(installPath);
  const vendorDir = path.join(absInstallPath, 'local_packages');

  console.log(`\n▶ Packing ${absPackagePath}`);

  // 1) clean tgz
  fs.readdirSync(absPackagePath)
    .filter(f => f.endsWith('.tgz'))
    .forEach(f => fs.unlinkSync(path.join(absPackagePath, f)));

  // 2) npm pack
  exec('npm pack', absPackagePath);

  // 3) find latest tgz
  const tgz = fs.readdirSync(absPackagePath)
    .filter(f => f.endsWith('.tgz'))
    .sort()
    .pop();

  if (!tgz) {
    throw new Error(`npm pack did not produce a .tgz in ${absPackagePath}`);
  }

  fs.mkdirSync(vendorDir, { recursive: true });

  const srcTgz = path.join(absPackagePath, tgz);
  const dstTgz = path.join(vendorDir, tgz);

  fs.copyFileSync(srcTgz, dstTgz);

  console.log(`▶ Installing ${dstTgz}`);
  exec(`npm i "${dstTgz}"`, absInstallPath);
}

export function registerLocalUpgradeCommand(program: Command) {
  program
    .command('local-upgrade')
    .description(
      'Upgrade Solid using locally checked-out Solid core repositories'
    )
    .addHelpText(
      'after',
      `
Required environment variables:
  SOLID_CORE_MODULE_PATH     Path to Solid core repository
  SOLID_UI_PATH              Path to Solid UI repository
  SOLID_CODE_BUILDER_PATH    Path to Solid code builder repository
`
    ).option('--core', 'Upgrade solid-core')
    .option('--ui', 'Upgrade solid-ui')
    .option('--code-builder', 'Upgrade solid-code-builder')
    .option('--new-ui', 'Upgrade new-solid-ui')
    .action((options) => {
      validateProjectRoot();
      ensureEnv([
        'SOLID_CORE_MODULE_PATH',
        'SOLID_UI_PATH',
        'SOLID_CODE_BUILDER_PATH',
      ]);

      const buildCore = options.core;
      const buildUi = options.ui;
      const buildNewUi = options.newUi;
      const buildCodeBuilder = options.codeBuilder;

      const nothingSelected =
        !buildCore && !buildUi && !buildCodeBuilder;

      const doCore = buildCore || nothingSelected;
      const doUi = buildUi || nothingSelected;
      const doCodeBuilder = buildCodeBuilder || nothingSelected;

      if (doCore) {
        console.log('\n=== solid-core-module → solid-api ===');
        packAndInstall(
          process.env.SOLID_CORE_MODULE_PATH!,
          './solid-api'
        );
      }

      if (doUi) {
        console.log('\n=== solid-ui → solid-ui ===');
        packAndInstall(
          process.env.SOLID_UI_PATH!,
          './solid-ui'
        );
      }

      if (buildNewUi) {
        console.log('\n=== solid-ui → new-solid-ui ===');
        packAndInstall(
          process.env.SOLID_UI_PATH!,
          './new-solid-ui'
        );
      }

      if (doCodeBuilder) {
        console.log('\n=== solid-code-builder → solid-api ===');
        packAndInstall(
          process.env.SOLID_CODE_BUILDER_PATH!,
          './solid-api'
        );
      }

      console.log('\n✅ Local dependency upgrade complete.');
    });
}