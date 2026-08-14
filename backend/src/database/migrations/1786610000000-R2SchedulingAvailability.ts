import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * R2 — Scheduling & Availability Foundation.
 *
 * Additive DDL ONLY. No table drops, no column drops, no row deletes.
 * CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS keep this idempotent
 * with dev databases where the dev-only synchronize bootstrap already created
 * the objects.
 *
 * 1. driver_duty_schedules
 *    - UNIQUE (driver_id, schedule_date): one duty-date record per driver per
 *      local calendar day — DB-enforced, no read-then-write race.
 *    - FK drivers(id) ON DELETE CASCADE.
 *    - CHECK shift_start <> shift_end (zero-length shifts are invalid;
 *      overnight shifts where shift_end <= shift_start are VALID).
 * 2. vehicle_availability_blocks
 *    - FK cars(id) ON DELETE CASCADE.
 *    - CHECK end_at > start_at (invalid intervals rejected at the DB level).
 *    - Composite index (vehicle_id, start_at, end_at) for window scans.
 * 3. transportation_requests.expected_end_at (timestamptz, nullable) — the
 *    canonical service-window end (request-provided, never Maps-derived).
 *    - CHECK expected_end_at > scheduled_pickup_at (nullable-safe).
 */
export class R2SchedulingAvailability1786610000000 implements MigrationInterface {
  name = 'R2SchedulingAvailability1786610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "driver_duty_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "driver_id" uuid NOT NULL,
        "schedule_date" date NOT NULL,
        "shift_start" character varying(5) NOT NULL,
        "shift_end" character varying(5) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'ON_DUTY',
        "notes" text,
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_driver_duty_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "uq_driver_duty_schedule_date" UNIQUE ("driver_id", "schedule_date"),
        CONSTRAINT "ck_driver_shift_not_zero_length" CHECK ("shift_start" <> "shift_end"),
        CONSTRAINT "fk_driver_duty_schedules_driver" FOREIGN KEY ("driver_id")
          REFERENCES "drivers"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_driver_duty_schedules_created_by" FOREIGN KEY ("created_by_user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_driver_duty_schedules_driver_date"
        ON "driver_duty_schedules" ("driver_id", "schedule_date")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vehicle_availability_blocks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "vehicle_id" uuid NOT NULL,
        "start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "reason" character varying(30) NOT NULL,
        "notes" text,
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_vehicle_availability_blocks" PRIMARY KEY ("id"),
        CONSTRAINT "ck_vehicle_block_end_after_start" CHECK ("end_at" > "start_at"),
        CONSTRAINT "fk_vehicle_availability_blocks_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "cars"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_vehicle_availability_blocks_created_by" FOREIGN KEY ("created_by_user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_vehicle_blocks_vehicle_start_end"
        ON "vehicle_availability_blocks" ("vehicle_id", "start_at", "end_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        ADD COLUMN IF NOT EXISTS "expected_end_at" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP CONSTRAINT IF EXISTS "ck_transportation_requests_expected_end_after_pickup",
        ADD CONSTRAINT "ck_transportation_requests_expected_end_after_pickup"
          CHECK ("expected_end_at" IS NULL OR "expected_end_at" > "scheduled_pickup_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP CONSTRAINT IF EXISTS "ck_transportation_requests_expected_end_after_pickup"
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP COLUMN IF EXISTS "expected_end_at"
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "vehicle_availability_blocks"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_duty_schedules"`);
  }
}
