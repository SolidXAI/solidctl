import { collectExplicitDbFlags } from './setup.command';

// Only the valid-input paths are covered here: the validation branches call
// failSetup(), which is process.exit(1) and would take the jest worker with it.
describe('collectExplicitDbFlags', () => {
  it('returns nothing when no --db-* flag was passed', () => {
    expect(collectExplicitDbFlags({})).toEqual({});
    expect(collectExplicitDbFlags({ skipBuild: true, verbose: true })).toEqual(
      {},
    );
  });

  it('collects every DB flag the user passed explicitly', () => {
    expect(
      collectExplicitDbFlags({
        dbClient: 'MySQL',
        dbHost: 'db.internal',
        dbPort: '3306',
        dbName: 'app_db',
        dbUsername: 'app_user',
        dbPassword: 'pw',
      }),
    ).toEqual({
      solidApiDatabaseClient: 'MySQL',
      solidApiDatabaseHost: 'db.internal',
      solidApiDatabasePort: '3306',
      solidApiDatabaseName: 'app_db',
      solidApiDatabaseUsername: 'app_user',
      solidApiDatabasePassword: 'pw',
    });
  });

  // Regression: a flag for a field the .env.example already fills must still
  // be collected, otherwise resolveAnswersFromExample carries the example's
  // value over and the flag is silently discarded.
  it('collects a flag regardless of whether that field needed prompting', () => {
    expect(collectExplicitDbFlags({ dbUsername: 'override_user' })).toEqual({
      solidApiDatabaseUsername: 'override_user',
    });
  });

  it('keeps an explicitly empty password rather than treating it as unset', () => {
    expect(collectExplicitDbFlags({ dbPassword: '' })).toEqual({
      solidApiDatabasePassword: '',
    });
  });
});
