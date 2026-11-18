import { getBackendEnvConfig } from './helpers';
import { SetupAnswers } from './setup-questions';

const answers = {
  projectName: 'demo',
  solidApiPort: '3000',
  solidApiDatabaseUsername: 'u',
  solidApiDatabasePassword: 'p',
  solidApiDatabaseName: 'demo',
  solidApiDatabasePort: '5432',
  solidApiDatabaseHost: 'localhost',
  solidApiDatabaseSynchronize: 'Yes',
} as SetupAnswers;

describe('getBackendEnvConfig', () => {
  it('includes a random 64-character hex APP_ENCRYPTION_KEY, different for each app', () => {
    const first = getBackendEnvConfig(answers, 'Demo').Encryption
      .APP_ENCRYPTION_KEY;
    const second = getBackendEnvConfig(answers, 'Demo').Encryption
      .APP_ENCRYPTION_KEY;
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).not.toBe(first);
  });
});
