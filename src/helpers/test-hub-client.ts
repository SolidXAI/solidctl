import fs from 'fs';
import os from 'os';
import path from 'path';
import { kebabCase } from 'lodash';

/** The secret the SolidX app checks for when Test Hub loads seed data before a run. */
export const TEST_DATA_SECRET_KEY = 'TEST_DATA_API_KEY';

/**
 * Reads the admin API key that `solid seed` wrote for a consuming project, from ~/.solidx/<project>/mcp.json.
 * `solid seed` names the folder after the project folder as it is; `solidctl mcp install` kebab-cases it. Both are tried,
 * the exact name first.
 */
export function readAdminApiKeyForProject(projectRoot: string): string {
  const folderName = path.basename(projectRoot);
  const names = Array.from(new Set([folderName, kebabCase(folderName)]));
  const baseDir = path.join(process.env.HOME ?? os.homedir(), '.solidx');
  const keyFile = names.map((name) => path.join(baseDir, name, 'mcp.json')).find((file) => fs.existsSync(file));
  if (!keyFile) {
    throw new Error(
      `No API key found at ${names.map((name) => `~/.solidx/${name}/mcp.json`).join(' or ')}. Run \`solid seed\` in the consuming project first.`,
    );
  }
  const parsed = JSON.parse(fs.readFileSync(keyFile, 'utf8')) as { solidxAdminApiKey?: { apiKey?: string } };
  const key = parsed.solidxAdminApiKey?.apiKey;
  if (!key) {
    throw new Error(`${keyFile.replace(os.homedir(), '~')} has no solidxAdminApiKey.apiKey.`);
  }
  return key;
}

/** The name of the application to run: the env override, else the one in the project's Test Hub metadata, else the default. */
export function resolveTestHubApplicationName(projectRoot: string, override: string | undefined, fallback: string): string {
  if (override && override.trim()) return override.trim();
  const file = path.join(projectRoot, 'solid-api', 'src', 'test-hub', 'metadata', 'test-hub-metadata.json');
  if (!fs.existsSync(file)) return fallback;
  const metadata = JSON.parse(fs.readFileSync(file, 'utf8')) as { testHubApplications?: Array<{ name?: string }> };
  const names = (metadata.testHubApplications ?? []).map((app) => app.name).filter((name): name is string => !!name);
  if (names.length > 1) {
    throw new Error(
      `${file} lists several Test Hub applications (${names.join(', ')}). Set SOLIDX_RELEASE_TEST_HUB_APP to the one to run.`,
    );
  }
  return names[0] ?? fallback;
}

export interface TestRunSummary {
  id: number;
  status: string;
  total?: number;
  passed?: number;
  failed?: number;
  /** Why the run failed, when it says so: a failed seed-data load, a refused start, or the first failing scenario. */
  error?: string;
}

export interface FailedScenario {
  scenarioId?: string;
  name?: string;
  error?: string;
}

/** The API's responses are usually wrapped in { data }. Unwrap them so callers see the record or the list. */
const unwrap = (json: any) => (json && typeof json === 'object' && 'data' in json ? json.data : json);

/** The run's output is saved as JSON text; its `error` says why the run failed. */
const runErrorOf = (runOutput: unknown): string | undefined => {
  try {
    const parsed = typeof runOutput === 'string' ? JSON.parse(runOutput) : runOutput;
    const error = (parsed as { error?: unknown } | null)?.error;
    return typeof error === 'string' && error ? error : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Calls a running SolidX API (the consuming project's own API) with the admin key. It only does what the release
 * flow needs: find the Test Hub application, store and link its test-data secret, start a run, poll it, and list
 * the scenarios that failed.
 */
export class TestHubClient {
  constructor(private readonly options: { baseUrl: string; apiKey: string }) {}

  private async request(method: string, route: string, body?: unknown): Promise<any> {
    const url = `${this.options.baseUrl.replace(/\/+$/, '')}${route}`;
    const headers: Record<string, string> = { 'solidx-api-key': this.options.apiKey };
    if (body !== undefined) headers['content-type'] = 'application/json';

    let res: Response;
    try {
      res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch (error) {
      throw new Error(`${method} ${route} could not reach ${this.options.baseUrl}: ${(error as Error).message}`);
    }

    const text = await res.text();
    let json: any;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    if (!res.ok) {
      const detail = json?.message ?? json?.error ?? text;
      throw new Error(`${method} ${route} failed with HTTP ${res.status}: ${Array.isArray(detail) ? detail.join('; ') : detail}`);
    }
    return json;
  }

  /** The one Test Hub application with this name. Fails when there is none or more than one. */
  async findApplicationByName(name: string): Promise<{ id: number; name: string }> {
    const json = await this.request('GET', `/api/application?filters[name][$eq]=${encodeURIComponent(name)}`);
    const records: any[] = unwrap(json)?.records ?? [];
    if (records.length !== 1) {
      throw new Error(`Expected one Test Hub application named "${name}", found ${records.length}. Register it in Test Hub first.`);
    }
    return { id: Number(records[0].id), name: String(records[0].name) };
  }

  /**
   * Stores the value in the test-data secret and makes sure the secret is linked to the application. The seed creates the
   * secret row (inactive, empty) and links it, from the application's metadata, so it must already exist. Fails if it does not.
   */
  async setTestDataSecret(applicationId: number, value: string): Promise<void> {
    const json = await this.request('GET', `/api/secret?filters[key][$eq]=${encodeURIComponent(TEST_DATA_SECRET_KEY)}`);
    const records: any[] = unwrap(json)?.records ?? [];
    if (records.length === 0) {
      throw new Error(`The ${TEST_DATA_SECRET_KEY} secret does not exist. Check that the application's Test Hub metadata lists it, then run \`solid seed\`.`);
    }
    const secretId = Number(records[0].id);
    await this.request('PATCH', `/api/secret/${secretId}`, { value, status: 'active' });

    // `seed` links the secret from the application's metadata, and the link command adds a row without checking for an
    // existing one (a second link fails with a duplicate key), so link only when it is not linked yet.
    const application = unwrap(await this.request('GET', `/api/application/${applicationId}?populate[0]=secrets`));
    const alreadyLinked = (application?.secrets ?? []).some((secret: { id: number }) => Number(secret.id) === secretId);
    if (!alreadyLinked) {
      await this.request('PATCH', `/api/application/${applicationId}`, { secretsIds: [secretId], secretsCommand: 'link' });
    }
  }

  /** Starts a run of the application with the given tags. Returns the Test Hub run id. */
  async startRun(applicationId: number, includeTags: string[]): Promise<number> {
    const json = await this.request('POST', `/api/test-hub/applications/${applicationId}/run`, { includeTags, headless: false });
    const testRunId = Number((json?.testRunId ?? unwrap(json)?.testRunId) as number);
    if (!testRunId) {
      throw new Error('Test Hub did not return a run id for the started run.');
    }
    return testRunId;
  }

  async getRun(testRunId: number): Promise<TestRunSummary> {
    const json = await this.request('GET', `/api/test-run/${testRunId}`);
    const run = unwrap(json);
    return {
      id: Number(run.id),
      status: String(run.status),
      total: run.total,
      passed: run.passed,
      failed: run.failed,
      error: runErrorOf(run.runOutput),
    };
  }

  /** getRun, tried again a few times when the call itself fails (a dropped connection or a restart), not when the run has failed. */
  async getRunWithRetry(testRunId: number, attempts = 3, delayMs = 3000): Promise<TestRunSummary> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await this.getRun(testRunId);
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw lastError;
  }

  async cancelRun(testRunId: number): Promise<void> {
    await this.request('POST', `/api/test-hub/applications/runs/${testRunId}/cancel`);
  }

  async listFailedScenarios(testRunId: number): Promise<FailedScenario[]> {
    const route =
      `/api/test-run-scenario?filters[testRun][id][$eq]=${testRunId}&filters[status][$eq]=failed&limit=200`;
    const records: any[] = unwrap(await this.request('GET', route))?.records ?? [];
    return records.map((r) => ({ scenarioId: r.scenarioId, name: r.name, error: r.error }));
  }
}
