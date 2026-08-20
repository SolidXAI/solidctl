import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import {
  exportModulePackage,
  loadSolidModulePublishConfig,
  resolveSolidModuleConfig,
  SolidModulePublishConfig,
  validateModulePackage,
} from '../module-package';

function readRootVersion(projectRoot: string): string | undefined {
  const packagePath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return undefined;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as {
    version?: string;
  };
  return packageJson.version;
}

export function registerModuleCommand(program: Command): void {
  const moduleCommand = program
    .command('module')
    .description('Export and validate SolidX extension module packages');

  moduleCommand
    .command('export [module-name]')
    .description('Export a SolidX extension module from the local project')
    .option(
      '-v, --module-version <version>',
      'Module version (defaults to the root package version)',
    )
    .option('-o, --output <path>', 'Output .sldx path')
    .action(
      async (
        moduleName: string | undefined,
        options: { moduleVersion?: string; output?: string },
      ) => {
        const projectRoot = process.cwd();
        const configured = loadSolidModulePublishConfig(projectRoot);
        const publishConfig: SolidModulePublishConfig =
          configured ||
          ({
            type: 'solidx-module',
            moduleName: moduleName || '',
          } satisfies SolidModulePublishConfig);

        if (moduleName && configured && moduleName !== configured.moduleName) {
          publishConfig.moduleName = moduleName;
        }
        if (!publishConfig.moduleName) {
          throw new Error(
            'Provide a module name or configure publish.moduleName in solidctl.config.json.',
          );
        }

        const version = options.moduleVersion || readRootVersion(projectRoot);
        if (!version) {
          throw new Error(
            'Provide --module-version or add a version to the root package.json.',
          );
        }

        const result = await exportModulePackage({
          projectRoot,
          config: resolveSolidModuleConfig(projectRoot, publishConfig),
          version,
          outputPath: options.output,
        });

        console.log(`Created ${result.filePath}`);
        console.log(`SHA-256: ${result.sha256}`);
      },
    );

  moduleCommand
    .command('validate <file>')
    .description('Validate a SolidX extension module package')
    .option('-n, --module-name <name>', 'Expected module name')
    .option('-v, --module-version <version>', 'Expected module version')
    .action(
      async (
        file: string,
        options: { moduleName?: string; moduleVersion?: string },
      ) => {
        const manifest = await validateModulePackage(path.resolve(file), {
          expectedModuleName: options.moduleName,
          expectedVersion: options.moduleVersion,
        });
        console.log(
          `Valid ${manifest.module.name} module package, version ${manifest.module.version || 'unversioned'}`,
        );
      },
    );
}
