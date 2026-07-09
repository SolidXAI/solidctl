import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { resolveInstallOptions } from './mcp-install.command';

function makeProjectHome(project: string, apiKey: string) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-res-'));
  const dir = path.join(home, '.solidx', project);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeJsonSync(path.join(dir, 'mcp.json'), {
    solidxAdminApiKey: { apiKey },
  });
  return home;
}

describe('resolveInstallOptions', () => {
  let oldHome: string | undefined;
  beforeEach(() => {
    oldHome = process.env.HOME;
  });
  afterEach(() => {
    if (oldHome === undefined) delete process.env.HOME;
    else process.env.HOME = oldHome;
  });

  it('errors when --project is not kebab-case', () => {
    expect(() => resolveInstallOptions({ project: 'NotKebab' })).toThrow(
      /kebab-case/i,
    );
  });

  it('errors when per-project mcp.json is missing and no --api-key', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-res-'));
    process.env.HOME = home;
    expect(() => resolveInstallOptions({ project: 'new-todo-app' })).toThrow(
      /No API key found/i,
    );
  });

  it('reads the key from ~/.solidx/<project>/mcp.json', () => {
    const home = makeProjectHome('new-todo-app', 'sldx_abc123');
    process.env.HOME = home;
    const opts = resolveInstallOptions({ project: 'new-todo-app' });
    expect(opts.apiKey).toBe('sldx_abc123');
    expect(opts.serverName).toBe('solidx-new-todo-app-mcp');
    expect(opts.url).toBe('http://localhost:9000/mcp');
    expect(opts.dryRun).toBe(false);
    expect(opts.force).toBe(false);
  });

  it('accepts explicit --api-key and bypasses file read', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-res-')); // no .solidx
    process.env.HOME = home;
    const opts = resolveInstallOptions({
      project: 'new-todo-app',
      apiKey: 'sldx_override',
    });
    expect(opts.apiKey).toBe('sldx_override');
  });

  it('errors when --api-key does not start with sldx_', () => {
    expect(() =>
      resolveInstallOptions({ project: 'new-todo-app', apiKey: 'nope' }),
    ).toThrow(/sldx_/i);
  });

  it('derives project from basename(cwd) when cwd is a SolidX project root and --project omitted', () => {
    const home = makeProjectHome('derived-name', 'sldx_k');
    process.env.HOME = home;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-cwd-'));
    fs.mkdirSync(path.join(dir, 'solid-api'));
    fs.writeFileSync(path.join(dir, 'solid-api', 'package.json'), '{}');
    fs.mkdirSync(path.join(dir, 'solid-ui'));
    fs.writeFileSync(path.join(dir, 'solid-ui', 'package.json'), '{}');
    const oldCwd = process.cwd();
    // rename temp dir basename so kebabCase(basename(cwd)) === 'derived-name'
    const target = path.join(path.dirname(dir), 'derived-name');
    fs.moveSync(dir, target);
    process.chdir(target);
    try {
      const opts = resolveInstallOptions({});
      expect(opts.projectName).toBe('derived-name');
      expect(opts.apiKey).toBe('sldx_k');
    } finally {
      process.chdir(oldCwd);
      fs.removeSync(target);
    }
  });

  it('errors when --project omitted and cwd is not a SolidX project root', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'solidx-cwd-'));
    const oldCwd = process.cwd();
    process.chdir(tmp);
    try {
      expect(() => resolveInstallOptions({})).toThrow(
        /project root|--project/i,
      );
    } finally {
      process.chdir(oldCwd);
      fs.removeSync(tmp);
    }
  });

  it('overrides server name via --name', () => {
    const home = makeProjectHome('new-todo-app', 'sldx_k');
    process.env.HOME = home;
    const opts = resolveInstallOptions({
      project: 'new-todo-app',
      name: 'custom-server',
    });
    expect(opts.serverName).toBe('custom-server');
  });
});
