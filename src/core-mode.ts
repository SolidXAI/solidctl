import fs from 'fs';
import os from 'os';
import path from 'path';

/** Path, inside the consuming project's installed core, that proves the core supports --core. */
export const CORE_MODE_HELPER_PATH = path.join('node_modules', '@solidxai', 'core', 'dist', 'helpers', 'solid-core-dev-paths.js');
/** The code-builder copy that --core generates with: the one local-upgrade keeps current. */
export const CODE_BUILDER_COLLECTION_PATH = path.join('node_modules', '@solidxai', 'code-builder', 'dist', 'collection.json');

type CoreModeEnv = { SOLIDX_CORE_REPO_ROOT: string };

function fail(message: string): never {
  console.error(`❌ --core: ${message}`);
  process.exit(1);
}

function assertPackage(dir: string, envVar: string, expected: string) {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fail(`${envVar}=${dir} is not a checkout (no package.json). Check out the ${expected} repo or fix the variable.`);
  }
  let name: unknown;
  try {
    name = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).name;
  } catch {
    fail(`${pkgPath} is not valid JSON.`);
  }
  if (name !== expected) {
    fail(`${envVar}=${dir} is package ${String(name)}, expected ${expected}.`);
  }
}

/** The project the `solid` shim will actually run (from ~/.solidctl/solid-current), or undefined. */
export function getShimProjectRoot(homeDir = os.homedir()): string | undefined {
  const pointer = path.join(homeDir, '.solidctl', 'solid-current');
  if (!fs.existsSync(pointer)) return undefined;
  const target = fs.readFileSync(pointer, 'utf8').trim(); // <project>/solid-api/dist/main-cli.js
  return target ? path.resolve(target, '..', '..', '..') : undefined;
}

/** Validate everything --core needs and return the env to add. Exits the process on any problem. */
export function getCoreModeEnv(projectRoot: string, homeDir = os.homedir()): CoreModeEnv {
  const core = process.env.SOLID_CORE_MODULE_PATH?.trim();
  if (!core) {
    fail('set SOLID_CORE_MODULE_PATH to your local core checkout.');
  }

  const coreRoot = path.resolve(core!);
  assertPackage(coreRoot, 'SOLID_CORE_MODULE_PATH', '@solidxai/core');

  const shimRoot = getShimProjectRoot(homeDir);
  const real = (p: string) => {
    try {
      return fs.realpathSync(p);
    } catch {
      return path.resolve(p);
    }
  };
  if (!shimRoot || real(shimRoot) !== real(projectRoot)) {
    fail(`the solid CLI points at ${shimRoot ?? '(nothing)'}, not this project. Run \`solidctl build\` here first.`);
  }

  if (!fs.existsSync(path.join(projectRoot, 'solid-api', CORE_MODE_HELPER_PATH))) {
    fail('the installed @solidxai/core does not support --core. Run `solidctl local-upgrade --core && solidctl build` first.');
  }

  if (!fs.existsSync(path.join(projectRoot, 'solid-api', CODE_BUILDER_COLLECTION_PATH))) {
    fail('the installed @solidxai/code-builder is missing. Run `solidctl local-upgrade --code-builder` first.');
  }

  return { SOLIDX_CORE_REPO_ROOT: coreRoot };
}
