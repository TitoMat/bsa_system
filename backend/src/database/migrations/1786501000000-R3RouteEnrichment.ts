import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * R3 — Route Enrichment + Assignment Diagnostics.
 *
 * Additive DDL ONLY. No table drops, no column drops, no row deletes.
 * ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS keep this idempotent
 * with dev databases where the dev-only synchronize bootstrap already created
 * the objects.
 *
 * 1. transportation_requests.route_provider (varchar 20, nullable) — which
 *    routing engine produced the snapshot (OSRM / Valhalla).
 * 2. transportation_requests.route_calculated_at (timestamptz, nullable) —
 *    when the route snapshot was last calculated.
 *    (estimated_distance_meters / estimated_duration_seconds /
 *    route_geometry already exist from the original schema.)
 * 3. Indexes justified by R3 conflict + workload queries:
 *    - transport_assignments (driver_id, status): driver conflict lookups.
 *    - transport_assignments (vehicle_id, status): vehicle conflict lookups.
 *    - transportation_requests (scheduled_pickup_at): date-range windows
 *      used by monitoring/calendar/diagnostics date filters.
 */
export class R3RouteEnrichment1786501000000 implements MigrationInterface {
  name = 'R3RouteEnrichment1786501000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        ADD COLUMN IF NOT EXISTS "route_provider" character varying(20)
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        ADD COLUMN IF NOT EXISTS "route_calculated_at" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transport_assignments_driver_status"
        ON "transport_assignments" ("driver_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transport_assignments_vehicle_status"
        ON "transport_assignments" ("vehicle_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transportation_requests_pickup_at"
        ON "transportation_requests" ("scheduled_pickup_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_transportation_requests_pickup_at"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_transport_assignments_vehicle_status"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_transport_assignments_driver_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP COLUMN IF EXISTS "route_calculated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "transportation_requests"
        DROP COLUMN IF EXISTS "route_provider"
    `);
  }
}
