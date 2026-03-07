export interface AvailableMigration {
  id: string;
  srNo: number;
  description: string;
  /** Name of the class in MIGRATION_REGISTRY that implements ISolidxMigration */
  step: string;
  /** Format: "yyyy-MM-dd HH:mm:ss" */
  publishedOn: string;
}

export interface AppliedMigration {
  id: string;
  srNo: number;
  /** Format: "yyyy-MM-dd HH:mm:ss" */
  appliedOn: string;
}

export interface MigrateOptions {
  dryRun?: boolean;
  list?: boolean;
  id?: string;
  force?: boolean;
}
