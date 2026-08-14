import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * R0A — Empty schema baseline (fleet refactor safety pass).
 *
 * Purpose: adopt TypeORM migrations onto an EXISTING database whose schema was
 * previously created by `synchronize` (or manually). This migration performs no
 * DDL. Running `migration:run` only records the baseline row in the
 * `migrations` table so that subsequent `migration:generate` runs diff the
 * entities against the live schema and produce only forward (non-destructive)
 * changes.
 *
 * Safety rules for this phase:
 * - No table drops.
 * - No data deletion.
 * - No entity renames.
 *
 * Fresh databases (no existing schema): create the schema with the legacy dev
 * bootstrap (TYPEORM_SYNCHRONIZE=true in non-production), then run
 * `npm run migration:run` to record this baseline. Alternatively generate a
 * full DDL migration from entities with `npm run migration:generate`.
 */
export class R0ABaseline1786492800000 implements MigrationInterface {
  name = 'R0ABaseline1786492800000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally empty — see class comment.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally empty — see class comment.
  }
}
