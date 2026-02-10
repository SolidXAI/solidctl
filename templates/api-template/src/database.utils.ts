/**
 * Configures the PostgreSQL type parser to handle INT8 (BIGINT) values as JavaScript numbers.
 *
 * By default, pg returns INT8 values as strings to avoid precision loss with large numbers.
 * This configuration converts them to integers, which is suitable when your INT8 values
 * are within JavaScript's safe integer range.
 *
 * @see https://github.com/typeorm/typeorm/issues/8583
 */
export function configurePgInt8TypeParser(): void {
  try {
    const types = require('pg').types;
    types.setTypeParser(types.builtins.INT8, (val: string) => parseInt(val, 10));
  } catch {
    // If pg is not installed, we can ignore this.
    // It is only relevant if you are using Postgres with TypeORM.
  }
}
