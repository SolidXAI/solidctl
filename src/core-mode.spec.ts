import fs from 'fs';
import os from 'os';
import path from 'path';
import { CORE_MODE_HELPER_PATH, getCoreModeEnv } from './core-mode';

describe('getCoreModeEnv', () => {
  const savedCore = process.env.SOLID_CORE_MODULE_PATH;
  const savedBuilder = process.env.SOLID_CODE_BUILDER_PATH;
  let root: string;
  let core: string;
  let builder: string;
  let project: string;
  let home: string;

  const pkg = (dir: string, name: string | null) => {
    fs.mkdirSync(dir, { recursive: true });
    if (name !== null) fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name }));
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-mode-'));
    core = path.join(root, 'core');
    builder = path.join(root, 'builder');
    project = path.join(root, 'project');
    home = path.join(root, 'home');
    pkg(core, '@solidxai/core');
    pkg(builder, '@solidxai/code-builder');
    fs.mkdirSync(project, { recursive: true });
    fs.mkdirSync(path.join(home, '.solidctl'), { recursive: true });
    fs.writeFileSync(path.join(home, '.solidctl', 'solid-current'), path.join(project, 'solid-api', 'dist', 'main-cli.js'));
    const helper = path.join(project, 'solid-api', CORE_MODE_HELPER_PATH);
    fs.mkdirSync(path.dirname(helper), { recursive: true });
    fs.writeFileSync(helper, '');
    process.env.SOLID_CORE_MODULE_PATH = core;
    process.env.SOLID_CODE_BUILDER_PATH = builder;

    jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (savedCore === undefined) delete process.env.SOLID_CORE_MODULE_PATH; else process.env.SOLID_CORE_MODULE_PATH = savedCore;
    if (savedBuilder === undefined) delete process.env.SOLID_CODE_BUILDER_PATH; else process.env.SOLID_CODE_BUILDER_PATH = savedBuilder;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('returns both paths when everything is valid', () => {
    expect(getCoreModeEnv(project, home)).toEqual({
      SOLIDX_CORE_REPO_ROOT: path.resolve(core),
      SOLIDX_CODE_BUILDER_ROOT: path.resolve(builder),
    });
  });

  it('exits when a variable is missing', () => {
    delete process.env.SOLID_CODE_BUILDER_PATH;
    expect(() => getCoreModeEnv(project, home)).toThrow('exit 1');
  });

  it('exits when the core folder is not a checkout', () => {
    process.env.SOLID_CORE_MODULE_PATH = path.join(root, 'missing');
    expect(() => getCoreModeEnv(project, home)).toThrow('exit 1');
  });

  it('exits when a folder has the wrong package name', () => {
    pkg(core, 'some-other-package');
    expect(() => getCoreModeEnv(project, home)).toThrow('exit 1');
  });

  it('exits when the solid CLI points at another project', () => {
    const other = path.join(root, 'other');
    fs.writeFileSync(path.join(home, '.solidctl', 'solid-current'), path.join(other, 'solid-api', 'dist', 'main-cli.js'));
    expect(() => getCoreModeEnv(project, home)).toThrow('exit 1');
  });

  it('exits when the installed core lacks the core-mode helper', () => {
    fs.rmSync(path.join(project, 'solid-api', CORE_MODE_HELPER_PATH));
    expect(() => getCoreModeEnv(project, home)).toThrow('exit 1');
  });
});
