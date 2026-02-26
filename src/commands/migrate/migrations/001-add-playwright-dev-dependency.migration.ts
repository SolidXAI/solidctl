import * as fs from 'fs';
import * as path from 'path';
import { ISolidxMigration } from '../interfaces/solidx-migration.interface';

/**
 * Adds "playwright": ">=1.0.0" to devDependencies in solid-ui/package.json.
 * isApplied checks whether the entry already exists, making this fully idempotent.
 */
export class AddPlaywrightDevDependencyMigration implements ISolidxMigration {
  private readonly targetSubProject = 'solid-api';
  private readonly packageName = 'playwright';
  private readonly packageVersion = '>=1.0.0';

  isApplied(projectPath: string): boolean {
    const packageJsonPath = path.join(
      projectPath,
      this.targetSubProject,
      'package.json',
    );

    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const devDeps: Record<string, string> = packageJson.devDependencies ?? {};

    return this.packageName in devDeps;
  }

  apply(projectPath: string): void {
    const packageJsonPath = path.join(
      projectPath,
      this.targetSubProject,
      'package.json',
    );

    console.log(
      `    Reading ${this.targetSubProject}/package.json`,
    );
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    if (!packageJson.devDependencies) {
      console.log(`    No devDependencies section found — creating one`);
      packageJson.devDependencies = {};
    }

    console.log(
      `    Adding "${this.packageName}": "${this.packageVersion}" to devDependencies`,
    );
    packageJson.devDependencies[this.packageName] = this.packageVersion;

    console.log(`    Writing updated ${this.targetSubProject}/package.json`);
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n',
      'utf-8',
    );

    console.log(
      `    Run "npm install" inside ${this.targetSubProject} to install the new dependency`,
    );
  }
}
