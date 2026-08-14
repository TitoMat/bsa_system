import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { TransportStop } from './transport-stop.entity';
import { TransportPassenger } from './transport-passenger.entity';
import { TransportAssignment } from './transport-assignment.entity';
import { TransportStatusHistory } from './transport-status-history.entity';
import { TransportTripEvent } from './transport-trip-event.entity';
import type { FleetAssignmentPool } from '../../catalog/fleet-domain';

export type TransportationRequestType =
  | 'OFFICIAL_TRIP'
  | 'EMPLOYEE_TRANSPORT'
  | 'AIRPORT_TRANSFER'
  | 'DELIVERY'
  | 'EMERGENCY'
  | 'OTHER';

export type TransportationPriority = 'NORMAL' | 'URGENT' | 'EMERGENCY';

export type TransportationTripType = 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_STOP';

export type TransportationRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'FOR_DISPATCH'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_DECLINED'
  | 'REASSIGNMENT_REQUIRED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP'
  | 'PASSENGER_ONBOARD'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DESTINATION'
  | 'DELAYED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'VEHICLE_BREAKDOWN'
  | 'INCIDENT_REPORTED';

@Entity({ name: 'transportation_requests' })
export class TransportationRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, name: 'request_number' })
  requestNumber!: string;

  @Column({
    type: 'varchar',
    length: 30,
    name: 'request_type',
    default: 'OFFICIAL_TRIP',
  })
  requestType!: TransportationRequestType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  purpose!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'NORMAL' })
  priority!: TransportationPriority;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'trip_type',
    default: 'ONE_WAY',
  })
  tripType!: TransportationTripType;

  @Column({ type: 'uuid', name: 'requested_by_user_id' })
  @Index()
  requestedByUserId!: string;

  @ManyToOne(() => User)
  requestedBy!: User;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'requestor_name',
    nullable: true,
  })
  requestorName!: string | null;

  @Column({
    type: 'varchar',
    length: 320,
    name: 'requestor_email',
    nullable: true,
  })
  requestorEmail!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'department_id',
    nullable: true,
  })
  departmentId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'cost_center' })
  costCenter!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'contact_number',
    nullable: true,
  })
  contactNumber!: string | null;

  @Column({ type: 'int', name: 'passenger_count', default: 1 })
  passengerCount!: number;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'preferred_vehicle_type',
    nullable: true,
  })
  preferredVehicleType!: string | null;

  /**
   * R4 — Declared assignment pool for this request (default GENERAL).
   * Governs which resources the auto engine may pick (see dispatch domain).
   */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'requested_assignment_pool',
    default: 'GENERAL',
  })
  requestedAssignmentPool!: FleetAssignmentPool;

  /**
   * R4 — Compatibility projection of the ACTIVE fleet assignment. Written in
   * the same transaction as the canonical fleet_assignments row. Consumers
   * that predate R4 keep working; fleet_assignments is the source of truth.
   */
  @Column({ type: 'uuid', name: 'assigned_driver_id', nullable: true })
  @Index()
  assignedDriverId!: string | null;

  @Column({ type: 'uuid', name: 'assigned_vehicle_id', nullable: true })
  @Index()
  assignedVehicleId!: string | null;

  @Column({ type: 'text', name: 'special_instructions', nullable: true })
  specialInstructions!: string | null;

  @Column({ type: 'timestamptz', name: 'scheduled_pickup_at' })
  scheduledPickupAt!: Date;

  @Column({ type: 'timestamptz', name: 'expected_return_at', nullable: true })
  expectedReturnAt!: Date | null;

  /**
   * R2: manual/request-provided expected completion time. The canonical
   * service-window end (see scheduling/domain/service-window.ts). NEVER
   * derived from Maps estimates — travel-time derivation is out of R2 scope.
   */
  @Column({ type: 'timestamptz', name: 'expected_end_at', nullable: true })
  expectedEndAt!: Date | null;

  @Column({ type: 'varchar', length: 500, name: 'pickup_address' })
  pickupAddress!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'pickup_latitude' })
  pickupLatitude!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    name: 'pickup_longitude',
  })
  pickupLongitude!: number;

  @Column({ type: 'varchar', length: 500, name: 'destination_address' })
  destinationAddress!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    name: 'destination_latitude',
  })
  destinationLatitude!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    name: 'destination_longitude',
  })
  destinationLongitude!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'estimated_distance_meters',
    nullable: true,
  })
  estimatedDistanceMeters!: number | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'estimated_duration_seconds',
    nullable: true,
  })
  estimatedDurationSeconds!: number | null;

  @Column({ type: 'jsonb', name: 'route_geometry', nullable: true })
  routeGeometry!: Record<string, unknown> | null;

  /**
   * R3: routing provider that produced the snapshot (OSRM / Valhalla) and the
   * instant the snapshot was calculated. Maps remains the source of route
   * computation; these columns only retain the historical estimate.
   */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'route_provider',
    nullable: true,
  })
  routeProvider!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'route_calculated_at',
    nullable: true,
  })
  routeCalculatedAt!: Date | null;

  @Column({ type: 'varchar', length: 30, default: 'DRAFT' })
  @Index()
  status!: TransportationRequestStatus;

  @Column({ type: 'timestamptz', name: 'submitted_at', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'approved_at', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', name: 'cancellation_reason', nullable: true })
  cancellationReason!: string | null;

  @Column({ type: 'text', name: 'completion_remarks', nullable: true })
  completionRemarks!: string | null;

  @OneToMany(() => TransportStop, (stop) => stop.request, { cascade: true })
  stops!: TransportStop[];

  @OneToMany(() => TransportPassenger, (p) => p.request, { cascade: true })
  passengers!: TransportPassenger[];

  @OneToMany(() => TransportAssignment, (a) => a.request)
  assignments!: TransportAssignment[];

  @OneToMany(() => TransportStatusHistory, (h) => h.request)
  statusHistories!: TransportStatusHistory[];

  @OneToMany(() => TransportTripEvent, (e) => e.request)
  tripEvents!: TransportTripEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
