export interface ISolidxMigration {
  /**
   * Idempotency check. Called by the migration runner before apply().
   * Return true if the migration's effect is already present in the project.
   * The runner will skip apply() and record the migration as applied.
   */
  isApplied(projectPath: string): boolean | Promise<boolean>;

  /**
   * Apply the migration to the consuming project.
   * Must log every action clearly with console.log.
   * Must be as non-regressive as possible — prefer adding/updating over removing.
   */
  apply(projectPath: string): void | Promise<void>;
}
