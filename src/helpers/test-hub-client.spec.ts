import fs from 'fs';
import os from 'os';
import path from 'path';
import { readAdminApiKeyForProject, resolveTestHubApplicationName, TestHubClient } from './test-hub-client';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('readAdminApiKeyForProject', () => {
  let home: string;
  const originalHome = process.env.HOME;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'solidctl-home-'));
    process.env.HOME = home;
  });
  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('reads the admin key from the kebab-cased project folder', () => {
    const dir = path.join(home, '.solidx', 'solid-library-management');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'mcp.json'), JSON.stringify({ solidxAdminApiKey: { apiKey: 'sldx_test' } }));

    expect(readAdminApiKeyForProject('/work/Solid Library Management')).toBe('sldx_test');
  });

  it('prefers the folder named exactly like the project, which is where `solid seed` writes it', () => {
    for (const [name, apiKey] of [['Solid_LM', 'sldx_exact'], ['solid-lm', 'sldx_kebab']]) {
      const dir = path.join(home, '.solidx', name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'mcp.json'), JSON.stringify({ solidxAdminApiKey: { apiKey } }));
    }

    expect(readAdminApiKeyForProject('/work/Solid_LM')).toBe('sldx_exact');
  });

  it('fails naming both locations it tried when there is no key file', () => {
    expect(() => readAdminApiKeyForProject('/work/Solid_LM')).toThrow(
      '~/.solidx/Solid_LM/mcp.json or ~/.solidx/solid-lm/mcp.json',
    );
  });
});

describe('resolveTestHubApplicationName', () => {
  let root: string;
  const writeMetadata = (apps: unknown) => {
    const dir = path.join(root, 'solid-api', 'src', 'test-hub', 'metadata');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'test-hub-metadata.json'), JSON.stringify({ testHubApplications: apps }));
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'solidctl-project-'));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('uses the override when one is given', () => {
    writeMetadata([{ name: 'From metadata' }]);
    expect(resolveTestHubApplicationName(root, ' Override ', 'Fallback')).toBe('Override');
  });

  it('uses the only application in the project\'s metadata', () => {
    writeMetadata([{ name: 'SolidX Library Management' }]);
    expect(resolveTestHubApplicationName(root, undefined, 'Fallback')).toBe('SolidX Library Management');
  });

  it('asks for an override when the metadata lists several applications', () => {
    writeMetadata([{ name: 'A' }, { name: 'B' }]);
    expect(() => resolveTestHubApplicationName(root, undefined, 'Fallback')).toThrow('SOLIDX_RELEASE_TEST_HUB_APP');
  });

  it('falls back when the metadata has no application or no file', () => {
    expect(resolveTestHubApplicationName(root, undefined, 'Fallback')).toBe('Fallback');
    writeMetadata([]);
    expect(resolveTestHubApplicationName(root, undefined, 'Fallback')).toBe('Fallback');
  });
});

describe('TestHubClient', () => {
  let fetchMock: jest.Mock;
  const client = () => new TestHubClient({ baseUrl: 'http://localhost:8080/', apiKey: 'sldx_test' });

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  it('sends the admin key header and trims the base URL', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { records: [{ id: 3, name: 'SolidX Library Management' }] } }));

    await expect(client().findApplicationByName('SolidX Library Management')).resolves.toEqual({
      id: 3,
      name: 'SolidX Library Management',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'http://localhost:8080/api/application?filters[name][$eq]=SolidX%20Library%20Management',
    );
    expect(init.headers['solidx-api-key']).toBe('sldx_test');
  });

  it('fails when the application name matches none or several applications', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { records: [] } }));
    await expect(client().findApplicationByName('X')).rejects.toThrow('found 0');
  });

  it('stops when the test-data secret was never seeded', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { records: [] } }));
    await expect(client().setTestDataSecret(3, 'sldx_test')).rejects.toThrow('does not exist');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stores the value and activates the secret, then links it when the application does not have it yet', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ data: { records: [{ id: 9, key: 'TEST_DATA_API_KEY' }] } }))
      .mockResolvedValueOnce(json({ data: { id: 9 } }))
      .mockResolvedValueOnce(json({ data: { id: 3, secrets: [] } }))
      .mockResolvedValueOnce(json({ data: { id: 3 } }));

    await client().setTestDataSecret(3, 'sldx_test');

    const [patchSecretUrl, patchSecret] = fetchMock.mock.calls[1];
    expect(patchSecretUrl).toBe('http://localhost:8080/api/secret/9');
    expect(patchSecret.method).toBe('PATCH');
    expect(JSON.parse(patchSecret.body)).toEqual({ value: 'sldx_test', status: 'active' });

    expect(fetchMock.mock.calls[2][0]).toBe('http://localhost:8080/api/application/3?populate[0]=secrets');
    const [linkUrl, link] = fetchMock.mock.calls[3];
    expect(linkUrl).toBe('http://localhost:8080/api/application/3');
    expect(JSON.parse(link.body)).toEqual({ secretsIds: [9], secretsCommand: 'link' });
  });

  it('does not link again when the seed already linked the secret, which would fail with a duplicate key', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ data: { records: [{ id: 9, key: 'TEST_DATA_API_KEY' }] } }))
      .mockResolvedValueOnce(json({ data: { id: 9 } }))
      .mockResolvedValueOnce(json({ data: { id: 3, secrets: [{ id: 9 }] } }));

    await client().setTestDataSecret(3, 'sldx_test');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.some(([, init]) => init.method === 'PATCH' && JSON.parse(init.body).secretsCommand)).toBe(false);
  });

  it('starts a run and returns its id', async () => {
    fetchMock.mockResolvedValueOnce(json({ testRunId: 42, status: 'running' }));

    await expect(client().startRun(3, ['api-all-flows'])).resolves.toBe(42);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ includeTags: ['api-all-flows'], headless: false });
  });

  it('reads a run from its wrapped response', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { id: 42, status: 'succeeded', total: 151, passed: 151, failed: 0 } }));

    await expect(client().getRun(42)).resolves.toEqual({ id: 42, status: 'succeeded', total: 151, passed: 151, failed: 0 });
  });

  it('reads why a run failed from its output, such as a failed seed-data load', async () => {
    const runOutput = JSON.stringify({ ok: false, error: 'seed data load failed: the application answered HTTP 404' });
    fetchMock.mockResolvedValueOnce(json({ data: { id: 42, status: 'failed', runOutput } }));

    await expect(client().getRun(42)).resolves.toMatchObject({
      status: 'failed',
      error: 'seed data load failed: the application answered HTTP 404',
    });
  });

  it('has no error for a run whose output is empty or not JSON', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { id: 1, status: 'running', runOutput: null } }));
    fetchMock.mockResolvedValueOnce(json({ data: { id: 1, status: 'running', runOutput: 'plain text' } }));

    expect((await client().getRun(1)).error).toBeUndefined();
    expect((await client().getRun(1)).error).toBeUndefined();
  });

  it('tries a failed poll again, and returns the run once a try works', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(json({ data: { id: 42, status: 'running' } }));

    await expect(client().getRunWithRetry(42, 3, 0)).resolves.toMatchObject({ status: 'running' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up with the last error after the allowed tries', async () => {
    fetchMock.mockRejectedValue(new Error('connection reset'));

    await expect(client().getRunWithRetry(42, 3, 0)).rejects.toThrow('could not reach');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reports the HTTP status and the API message when a call fails', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'Application not found' }, 404));

    await expect(client().getRun(42)).rejects.toThrow('GET /api/test-run/42 failed with HTTP 404: Application not found');
  });
});
