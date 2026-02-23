import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { AvailableMigration, AppliedMigration, MigrateOptions } from './types';
import { ISolidxMigration } from './interfaces/solidx-migration.interface';

const SOLIDCTL_DIR = '.solidctl';
const APPLIED_MIGRATIONS_FILE = 'applied-migrations.json';
const AVAILABLE_MIGRATIONS_FILE = 'solidx-migrations.json';

// ─── Path helpers ─────────────────────────────────────────────────────────────

function getAvailableMigrationsPath(): string {
  // From dist/commands/migrate/ → up 3 levels to package root
  return path.join(__dirname, '..', '..', '..', AVAILABLE_MIGRATIONS_FILE);
}

function getAppliedMigrationsDir(projectPath: string): string {
  return path.join(projectPath, SOLIDCTL_DIR);
}

function getAppliedMigrationsPath(projectPath: string): string {
  return path.join(projectPath, SOLIDCTL_DIR, APPLIED_MIGRATIONS_FILE);
}

// ─── Dynamic migration registry ───────────────────────────────────────────────

/**
 * Scans compiled migration files in dist/commands/migrate/migrations/ and
 * builds a lookup from class name → constructor. No manual registry needed —
 * dropping a new migration file in is sufficient.
 */
function buildMigrationRegistry(): Record<string, new () => ISolidxMigration> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const registry: Record<string, new () => ISolidxMigration> = {};

  if (!fs.existsSync(migrationsDir)) {
    return registry;
  }

  fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.js'))
    .forEach((file) => {
      const mod = require(path.join(migrationsDir, file)) as Record<
        string,
        unknown
      >;
      for (const [key, value] of Object.entries(mod)) {
        if (typeof value === 'function') {
          registry[key] = value as new () => ISolidxMigration;
        }
      }
    });

  return registry;
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

function readAvailableMigrations(): AvailableMigration[] {
  const filePath = getAvailableMigrationsPath();

  if (!fs.existsSync(filePath)) {
    console.error(
      chalk.red(`Available migrations file not found: ${filePath}`),
    );
    process.exit(1);
  }

  const migrations = JSON.parse(
    fs.readFileSync(filePath, 'utf-8'),
  ) as AvailableMigration[];

  return migrations.sort((a, b) => a.srNo - b.srNo);
}

function readAppliedMigrations(projectPath: string): {
  migrations: AppliedMigration[];
  wasCreated: boolean;
} {
  const filePath = getAppliedMigrationsPath(projectPath);

  if (!fs.existsSync(filePath)) {
    return { migrations: [], wasCreated: true };
  }

  return {
    migrations: JSON.parse(
      fs.readFileSync(filePath, 'utf-8'),
    ) as AppliedMigration[],
    wasCreated: false,
  };
}

function writeAppliedMigrations(
  projectPath: string,
  migrations: AppliedMigration[],
): void {
  const dirPath = getAppliedMigrationsDir(projectPath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(
    getAppliedMigrationsPath(projectPath),
    JSON.stringify(migrations, null, 2) + '\n',
    'utf-8',
  );
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatDateTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function divider(): void {
  console.log(chalk.dim('─'.repeat(60)));
}

// ─── List mode ────────────────────────────────────────────────────────────────

function handleList(
  available: AvailableMigration[],
  applied: AppliedMigration[],
): void {
  const appliedMap = new Map(applied.map((m) => [m.id, m]));

  console.log('');

  for (const migration of available) {
    const entry = appliedMap.get(migration.id);
    const srNo = String(migration.srNo).padStart(3, '0');

    if (entry) {
      console.log(
        `  ${chalk.green('[✓]')} ${chalk.bold(`[${srNo}]`)} ${chalk.cyan(migration.id)}`,
      );
      console.log(`       ${chalk.dim('Published :')} ${migration.publishedOn}`);
      console.log(`       ${chalk.dim('Applied on:')} ${entry.appliedOn}`);
      console.log(`       ${migration.description}`);
    } else {
      console.log(
        `  ${chalk.yellow('[✗]')} ${chalk.bold(`[${srNo}]`)} ${chalk.cyan(migration.id)}`,
      );
      console.log(`       ${chalk.dim('Published :')} ${migration.publishedOn}`);
      console.log(`       ${migration.description}`);
    }

    console.log('');
  }

  divider();
  console.log(
    `  ${chalk.bold(String(applied.length))} of ${chalk.bold(String(available.length))} migrations applied`,
  );
  divider();
  console.log('');
}

// ─── Main runner ──────────────────────────────────────────────────────────────

export async function runMigrations(
  projectPath: string,
  options: MigrateOptions,
): Promise<void> {
  const { dryRun = false, list = false, id, force = false } = options;

  const available = readAvailableMigrations();
  const { migrations: applied, wasCreated } = readAppliedMigrations(projectPath);

  // Header
  divider();
  if (list) {
    console.log(`  ${chalk.bold.cyan('SolidX Migration Status')}`);
  } else {
    console.log(`  ${chalk.bold.cyan('SolidX Migration Runner')}`);
    if (dryRun) {
      console.log(`  ${chalk.yellow('DRY RUN — no changes will be made')}`);
    }
  }
  divider();

  const relativeAppliedPath = path.join(SOLIDCTL_DIR, APPLIED_MIGRATIONS_FILE);
  const fileStatus = wasCreated
    ? chalk.yellow('(will be created)')
    : chalk.green('(found)');

  console.log('');
  console.log(`  ${chalk.dim('Target    :')} ${projectPath}`);
  console.log(
    `  ${chalk.dim('Migrations:')} ${relativeAppliedPath} ${fileStatus}`,
  );
  console.log('');

  if (list) {
    handleList(available, applied);
    return;
  }

  // Scope to a specific migration if --id was provided
  const toProcess = id ? available.filter((m) => m.id === id) : available;

  if (id && toProcess.length === 0) {
    console.log(chalk.red(`  No migration found with ID: ${id}`));
    process.exit(1);
  }

  const appliedSet = new Set(applied.map((m) => m.id));
  const pendingCount = toProcess.filter(
    (m) => !appliedSet.has(m.id) || force,
  ).length;

  console.log(
    `  Available: ${chalk.bold(String(available.length))}   ` +
      `Applied: ${chalk.bold(String(applied.length))}   ` +
      `Pending: ${chalk.bold(String(pendingCount))}`,
  );
  console.log('');
  divider();
  console.log('');

  const registry = buildMigrationRegistry();
  const updatedApplied = [...applied];
  let appliedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const migration = toProcess[i];
    const index = `[${i + 1}/${toProcess.length}]`;

    console.log(`  ${chalk.bold(index)}  ${chalk.cyan(migration.id)}`);
    console.log(`         ${chalk.dim(migration.description)}`);

    // ── Step 1: check applied-migrations.json ─────────────────────────────
    if (appliedSet.has(migration.id) && !force) {
      console.log(`         ${chalk.green('✓')} Already applied — skipping`);
      console.log('');
      skippedCount++;
      continue;
    }

    // ── Step 2: resolve the migration class ───────────────────────────────
    const MigrationClass = registry[migration.step];

    if (!MigrationClass) {
      console.log(
        `         ${chalk.red('✗')} Unknown step "${migration.step}" — not found in migrations directory`,
      );
      console.log('');
      failedCount++;
      continue;
    }

    const instance = new MigrationClass();

    // ── Step 3: idempotency check via isApplied() ─────────────────────────
    if (!force) {
      let alreadyApplied = false;

      try {
        alreadyApplied = await Promise.resolve(instance.isApplied(projectPath));
      } catch (err) {
        console.log(
          `         ${chalk.yellow('⚠')}  isApplied() threw — proceeding with apply: ${String(err)}`,
        );
      }

      if (alreadyApplied) {
        console.log(
          `         ${chalk.green('✓')} Idempotency check passed — effect already present`,
        );

        // Record in applied file even though apply() was not called
        if (!appliedSet.has(migration.id)) {
          const entry: AppliedMigration = {
            id: migration.id,
            srNo: migration.srNo,
            appliedOn: formatDateTime(),
          };
          updatedApplied.push(entry);
          appliedSet.add(migration.id);

          if (!dryRun) {
            writeAppliedMigrations(projectPath, updatedApplied);
          }
        }

        console.log('');
        skippedCount++;
        continue;
      }
    }

    // ── Step 4: dry-run short-circuit ─────────────────────────────────────
    if (dryRun) {
      console.log(`         ${chalk.yellow('→')} Would apply (dry run — skipped)`);
      console.log('');
      continue;
    }

    // ── Step 5: apply ─────────────────────────────────────────────────────
    console.log(`         ${chalk.yellow('→')} Applying...`);
    console.log('');

    try {
      await Promise.resolve(instance.apply(projectPath));

      const entry: AppliedMigration = {
        id: migration.id,
        srNo: migration.srNo,
        appliedOn: formatDateTime(),
      };
      updatedApplied.push(entry);
      appliedSet.add(migration.id);
      writeAppliedMigrations(projectPath, updatedApplied);

      console.log('');
      console.log(`         ${chalk.green('✓')} Applied successfully`);
      appliedCount++;
    } catch (err) {
      console.log('');
      console.log(`         ${chalk.red('✗')} Failed: ${String(err)}`);
      failedCount++;
    }

    console.log('');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  divider();

  const parts: string[] = [];
  if (appliedCount > 0) parts.push(chalk.green(`${appliedCount} applied`));
  if (skippedCount > 0) parts.push(chalk.dim(`${skippedCount} skipped`));
  if (failedCount > 0) parts.push(chalk.red(`${failedCount} failed`));
  if (parts.length === 0) parts.push(chalk.dim('nothing to do'));

  console.log(`  Done — ${parts.join(', ')}`);

  if (dryRun) {
    console.log(`  ${chalk.yellow('(dry run — no changes were made)')}`);
  }

  divider();
  console.log('');

  if (failedCount > 0) {
    process.exit(1);
  }
}
