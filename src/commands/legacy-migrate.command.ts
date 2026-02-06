import { Command } from 'commander';
import { execSync } from 'child_process';
import { validateProjectRoot } from '../helper';
import * as fs from 'fs';
import * as path from 'path';

interface PackageMapping {
  oldPackage: string;
  newPackage: string;
  cwd: string;
  isDev: boolean;
}

interface ImportMapping {
  oldImport: string;
  newImport: string;
  directory: string;
  extensions: string[];
}

const PACKAGE_MAPPINGS: PackageMapping[] = [
  {
    oldPackage: '@solidstarters/solid-core',
    newPackage: '@solidxai/core',
    cwd: 'solid-api',
    isDev: false,
  },
  {
    oldPackage: '@solidstarters/solid-code-builder',
    newPackage: '@solidxai/code-builder',
    cwd: 'solid-api',
    isDev: true,
  },
  {
    oldPackage: '@solidstarters/solid-core-ui',
    newPackage: '@solidxai/core-ui',
    cwd: 'solid-ui',
    isDev: false,
  },
];

const IMPORT_MAPPINGS: ImportMapping[] = [
  {
    oldImport: '@solidstarters/solid-core',
    newImport: '@solidxai/core',
    directory: 'solid-api/src',
    extensions: ['.ts'],
  },
  {
    oldImport: '@solidstarters/solid-core-ui',
    newImport: '@solidxai/core-ui',
    directory: 'solid-ui/src',
    extensions: ['.ts', '.tsx'],
  },
];

function getAllFiles(
  dir: string,
  extensions: string[],
  files: string[] = [],
): string[] {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      getAllFiles(fullPath, extensions, files);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function replaceImportsInFile(
  filePath: string,
  oldImport: string,
  newImport: string,
  dryRun: boolean,
): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (!content.includes(oldImport)) {
    return false;
  }

  const newContent = content.split(oldImport).join(newImport);

  if (!dryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return true;
}

export function registerLegacyMigrateCommand(program: Command) {
  program
    .command('legacy-migrate')
    .description(
      'Migrate from @solidstarters packages to @solidxai packages',
    )
    .option('--dry-run', 'Show what would be changed without executing')
    .option('--skip-verify', 'Skip the build verification step')
    .action((options) => {
      validateProjectRoot();

      const dryRun = options.dryRun || false;
      const skipVerify = options.skipVerify || false;

      if (dryRun) {
        console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
      }

      // Phase 1: Package Migration
      console.log('📦 Phase 1: Package Migration\n');

      for (const mapping of PACKAGE_MAPPINGS) {
        const { oldPackage, newPackage, cwd, isDev } = mapping;

        // Check if old package exists in package.json
        const packageJsonPath = path.join(cwd, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          console.log(`  ⚠️  Skipping ${oldPackage} - ${packageJsonPath} not found`);
          continue;
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = packageJson.dependencies || {};
        const devDeps = packageJson.devDependencies || {};

        if (!deps[oldPackage] && !devDeps[oldPackage]) {
          console.log(`  ⚠️  Skipping ${oldPackage} - not installed in ${cwd}`);
          continue;
        }

        // Uninstall old package
        const uninstallCmd = `npm uninstall ${oldPackage}`;
        console.log(`  ▶ Uninstalling ${oldPackage} from ${cwd}`);
        console.log(`    $ ${uninstallCmd}`);

        if (!dryRun) {
          execSync(uninstallCmd, { cwd, stdio: 'inherit' });
        }

        // Install new package
        const installFlag = isDev ? '-D' : '';
        const installCmd = `npm install ${installFlag} ${newPackage}`.trim();
        console.log(`  ▶ Installing ${newPackage} in ${cwd}`);
        console.log(`    $ ${installCmd}`);

        if (!dryRun) {
          execSync(installCmd, { cwd, stdio: 'inherit' });
        }

        console.log('');
      }

      // Phase 2: Import Replacement
      console.log('📝 Phase 2: Import Replacement\n');

      let totalFilesModified = 0;

      for (const mapping of IMPORT_MAPPINGS) {
        const { oldImport, newImport, directory, extensions } = mapping;

        console.log(`  ▶ Replacing "${oldImport}" → "${newImport}" in ${directory}`);

        const files = getAllFiles(directory, extensions);
        let filesModified = 0;

        for (const file of files) {
          const wasModified = replaceImportsInFile(file, oldImport, newImport, dryRun);
          if (wasModified) {
            filesModified++;
            const relativePath = path.relative(process.cwd(), file);
            console.log(`    ✓ ${relativePath}`);
          }
        }

        console.log(`    Modified ${filesModified} file(s)\n`);
        totalFilesModified += filesModified;
      }

      console.log(`  Total files modified: ${totalFilesModified}\n`);

      // Phase 3: Verification
      if (skipVerify) {
        console.log('⏭️  Skipping verification (--skip-verify)\n');
      } else {
        console.log('🔨 Phase 3: Build Verification\n');

        const verifyDirs = ['solid-api', 'solid-ui'];

        for (const dir of verifyDirs) {
          console.log(`  ▶ Building ${dir}`);
          console.log(`    $ npm run build`);

          if (!dryRun) {
            try {
              execSync('npm run build', { cwd: dir, stdio: 'inherit' });
              console.log(`    ✅ ${dir} build succeeded\n`);
            } catch (error) {
              console.error(`    ❌ ${dir} build failed\n`);
              console.error('Migration completed but verification failed. Please check the errors above.');
              process.exit(1);
            }
          } else {
            console.log(`    (skipped in dry-run mode)\n`);
          }
        }
      }

      if (dryRun) {
        console.log('✅ Dry run completed. Run without --dry-run to apply changes.');
      } else {
        console.log('✅ Legacy migration completed successfully!');
      }
    });
}
