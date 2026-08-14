import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * R1 — Driver + Vehicle domain normalization (fleet scheduler preparation).
 *
 * Additive ALTER TABLE statements only:
 *   drivers: assignment_pool, auto_assign_enabled, allow_general_use_when_executive_away
 *   cars:    coding_day, assignment_pool, auto_assign_enabled,
 *            allow_general_use_when_executive_away
 *
 * Safety:
 * - NO table drops, NO column drops, NO row deletes, NO entity renames.
 * - NOT NULL + DEFAULT backfills existing rows with the canonical defaults:
 *     assignment_pool                = 'GENERAL' (never auto-classify EXECUTIVE)
 *     auto_assign_enabled            = true
 *     allow_general_use_when_executive_away = false
 *     coding_day                     = 'NONE'
 * - ADD COLUMN IF NOT EXISTS keeps the migration idempotent with dev
 *   databases where the dev-only synchronize bootstrap already created the
 *   columns.
 *
 * Rollback (down) drops ONLY the R1-added columns; no other schema is touched.
 */
export class R1FleetAssignmentFields1786543200000 implements MigrationInterface {
  name = 'R1FleetAssignmentFields1786543200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "drivers"
        ADD COLUMN IF NOT EXISTS "assignment_pool" varchar(20) NOT NULL DEFAULT 'GENERAL',
        ADD COLUMN IF NOT EXISTS "auto_assign_enabled" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "allow_general_use_when_executive_away" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "cars"
        ADD COLUMN IF NOT EXISTS "coding_day" varchar(10) NOT NULL DEFAULT 'NONE',
        ADD COLUMN IF NOT EXISTS "assignment_pool" varchar(20) NOT NULL DEFAULT 'GENERAL',
        ADD COLUMN IF NOT EXISTS "auto_assign_enabled" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "allow_general_use_when_executive_away" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "drivers"
        DROP COLUMN IF EXISTS "assignment_pool",
        DROP COLUMN IF EXISTS "auto_assign_enabled",
        DROP COLUMN IF EXISTS "allow_general_use_when_executive_away"
    `);

    await queryRunner.query(`
      ALTER TABLE "cars"
        DROP COLUMN IF EXISTS "coding_day",
        DROP COLUMN IF EXISTS "assignment_pool",
        DROP COLUMN IF EXISTS "auto_assign_enabled",
        DROP COLUMN IF EXISTS "allow_general_use_when_executive_away"
    `);
  }
}
