import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransportationRequest } from '../../transportation/entities/transportation-request.entity';
import { Driver } from '../../catalog/drivers/driver.entity';
import { Car } from '../../catalog/cars/car.entity';
import type {
  AssignmentMethod,
  AssignmentStrategy,
  FleetAssignmentStatus,
} from '../domain/dispatch-domain';

/**
 * R4 — Canonical fleet assignment record.
 *
 * THIS table is the single source of truth for who drives what, when. The
 * legacy transport_assignments rows are retained read-only for pre-R4
 * history; every new dispatch decision is written here (usually inside the
 * same transaction that advances the request status).
 *
 * Invariants enforced by migration + engine:
 *   - at most ONE ACTIVE row per transportation_request_id
 *     (partial unique index uq_fleet_assignments_one_active_per_request)
 *   - no overlapping ACTIVE rows per driver or per vehicle
 *     (engine check inside the transaction after row locks; indexes below)
 *   - serviceStartAt < serviceEndAt
 */
@Entity({ name: 'fleet_assignments' })
@Index('idx_fleet_assignments_request_status', [
  'transportationRequestId',
  'status',
])
export class FleetAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'transportation_request_id' })
  transportationRequestId!: string;

  @ManyToOne(() => TransportationRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transportation_request_id' })
  transportationRequest!: TransportationRequest;

  @Column({ type: 'uuid', name: 'driver_id' })
  driverId!: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @Column({ type: 'uuid', name: 'vehicle_id' })
  vehicleId!: string;

  @ManyToOne(() => Car)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Car;

  /**
   * Canonical service window — derived from the request via
   * scheduling/domain/service-window at dispatch time.
   */
  @Column({ type: 'timestamptz', name: 'service_start_at' })
  serviceStartAt!: Date;

  @Column({ type: 'timestamptz', name: 'service_end_at' })
  serviceEndAt!: Date;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'assignment_method',
    default: 'AUTOMATIC',
  })
  assignmentMethod!: AssignmentMethod;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'assignment_strategy',
    default: 'FAIR_RANDOM',
  })
  assignmentStrategy!: AssignmentStrategy;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: FleetAssignmentStatus;

  @Column({ type: 'timestamptz', name: 'assigned_at' })
  assignedAt!: Date;

  @Column({
    type: 'uuid',
    name: 'assigned_by_user_id',
    nullable: true,
  })
  assignedByUserId!: string | null;

  @Column({ type: 'timestamptz', name: 'superseded_at', nullable: true })
  supersededAt!: Date | null;

  @Column({ type: 'uuid', name: 'superseded_by_user_id', nullable: true })
  supersededByUserId!: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    name: 'supersede_reason',
    nullable: true,
  })
  supersedeReason!: string | null;

  @Column({ type: 'text', name: 'override_reason', nullable: true })
  overrideReason!: string | null;

  /**
   * Engine transparency: strategy + eligible counts + selected workload
   * scores + pool/reservation context + route snapshot used for the pick.
   * Populated for AUTOMATIC / REASSIGNMENT decisions only.
   */
  @Column({ type: 'jsonb', name: 'decision_metadata', nullable: true })
  decisionMetadata!: Record<string, unknown> | null;

  // Manual/override carrier fields (parity with the legacy assignment DTO).
  @Column({ type: 'text', name: 'dispatch_notes', nullable: true })
  dispatchNotes!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'expected_departure_at',
    nullable: true,
  })
  expectedDepartureAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
