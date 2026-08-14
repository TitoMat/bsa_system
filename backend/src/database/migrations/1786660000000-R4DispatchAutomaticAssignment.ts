import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * R4 — Dispatch & Automatic Assignment Engine.
 *
 * Additive DDL ONLY. No table drops, no column drops, no row deletes
 * (see release gates in doc/r4-dispatch-automatic-assignment-engine.md).
 *
 * 1. fleet_assignments — canonical assignment records.
 *    - Partial unique index uq_fleet_assignments_one_active_per_request:
 *      at most ONE ACTIVE row per transportation_request_id — the DB-level
 *      guarantee behind the engine's "already assigned" idempotency.
 *    - Conflict window indexes (driver_id/vehicle_id, status, start, end) so
 *      the engine's in-transaction overlap check stays a bounded scan.
 *    - CHECKs: service_end_at > service_start_at; status/method/strategy
 *      vocabularies locked to the R4 domain.
 * 2. fleet_dispatch_settings — single-row (id = 1) settings table with
 *    rollout-safe defaults: auto dispatch OFF, executive fleet reserved.
 * 3. transportation_requests
 *    - requested_assignment_pool (default GENERAL) — the pool the requester
 *      asks the engine to draw from.
 *    - assigned_driver_id / assigned_vehicle_id — R4 compatibility projection
 *      of the ACTIVE fleet assignment, kept in sync by the engine in the same
 *      transaction. Never written directly by other paths.
 */
export class R4DispatchAutomaticAssignment1786660000000 implements MigrationInterface {
  name = 'R4DispatchAutomaticAssignment1786660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fleet_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transportation_request_id" uuid NOT NULL,
        "driver_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "service_start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "service_end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "assignment_method" character varying(20) NOT NULL DEFAULT 'AUTOMATIC',
        "assignment_strategy" character varying(20) NOT NULL DEFAULT 'FAIR_RANDOM',
        "status" character varying(20) NOT NULL DEFAULT 'ACTIVE',
        "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "assigned_by_user_id" uuid,
        "superseded_at" TIMESTAMP WITH TIME ZONE,
        "superseded_by_user_id" uuid,
        "supersede_reason" character varying(500),
        "override_reason" text,
        "decision_metadata" jsonb,
        "dispatch_notes" text,
        "expected_departure_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_fleet_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "ck_fleet_assignment_service_order"
          CHECK ("service_end_at" > "service_start_at"),
        CONSTRAINT "ck_fleet_assignment_method"
          CHECK ("assignment_method" IN ('AUTOMATIC', 'MANUAL', 'OVERRIDE', 'REASSIGNMENT')),
        CONSTRAINT "ck_fleet_assignment_strategy"
          CHECK ("assignment_strategy" IN ('FAIR_RANDOM', 'PURE_RANDOM', 'MANUAL')),
        CONSTRAINT "ck_fleet_assignment_status"
          CHECK ("status" IN ('ACTIVE', 'SUPERSEDED', 'COMPLETED', 'CANCELLED')),
        CONSTRAINT "fk_fleet_assignments_request" FOREIGN KEY ("transportation_request_id")
          REFERENCES "transportation_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_fleet_assignments_driver" FOREIGN KEY ("driver_id")
          REFERENCES "drivers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_fleet_assignments_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "cars"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_fleet_assignments_assigned_by" FOREIGN KEY ("assigned_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_fleet_assignments_one_active_per_request"
        ON "fleet_assignments" ("transportation_request_id")
        WHERE "status" = 'ACTIVE'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fleet_assignments_driver_window"
        ON "fleet_assignments" ("driver_id", "status", "service_start_at", "service_end_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fleet_assignments_vehicle_window"
        ON "fleet_assignments" ("vehicle_id", "status", "service_start_at", "service_end_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fleet_assignments_request_status"
        ON "fleet_assignments" ("transportation_request_id", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fleet_dispatch_settings" (
        "id" integer NOT NULL DEFAULT 1,
        "auto_dispatch_enabled" boolean NOT NULL DEFAULT false,
        "executive_reservation_mode" boolean NOT NULL DEFAULT true,
        "default_assignment_strategy" character varying(20) NOT NULL DEFAULT 'FAIR_RANDOM',
        "updated_by_user_id" uuid,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_fleet_dispatch_settings" PRIMARY KEY ("id"),
        CONSTRAINT "ck_fleet_dispatch_settings_single_row" CHECK ("id" = 1),
        CONSTRAINT "ck_fleet_dispatch_settings_strategy"
          CHECK ("default_assignment_strategy" IN ('FAIR_RANDOM', 'PURE_RANDOM', 'MANUAL')),
        CONSTRAINT "fk_fleet_dispatch_settings_updated_by" FOREIGN KEY ("updated_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO "fleet_dispatch_settings" ("id")
      VALUES (1)
      ON CONFLICT ("id") DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        ADD COLUMN IF NOT EXISTS "requested_assignment_pool" character varying(20) NOT NULL DEFAULT 'GENERAL'
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP CONSTRAINT IF EXISTS "ck_transportation_requests_assignment_pool",
        ADD CONSTRAINT "ck_transportation_requests_assignment_pool"
          CHECK ("requested_assignment_pool" IN ('GENERAL', 'EXECUTIVE', 'SPECIAL'))
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        ADD COLUMN IF NOT EXISTS "assigned_driver_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        ADD COLUMN IF NOT EXISTS "assigned_vehicle_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transportation_requests_assigned_driver"
        ON "transportation_requests" ("assigned_driver_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transportation_requests_assigned_vehicle"
        ON "transportation_requests" ("assigned_vehicle_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_transportation_requests_assigned_vehicle"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_transportation_requests_assigned_driver"`,
    );
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP COLUMN IF EXISTS "assigned_vehicle_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP COLUMN IF EXISTS "assigned_driver_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP CONSTRAINT IF EXISTS "ck_transportation_requests_assignment_pool"
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP COLUMN IF EXISTS "requested_assignment_pool"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "fleet_dispatch_settings"`);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_fleet_assignments_one_active_per_request"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "fleet_assignments"`);
  }
}
