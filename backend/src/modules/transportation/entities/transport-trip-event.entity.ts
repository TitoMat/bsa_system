import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransportationRequest } from './transportation-request.entity';
import { TransportAssignment } from './transport-assignment.entity';
import { Driver } from '../../catalog/drivers/driver.entity';

export type TripEventType =
  | 'ASSIGNMENT_ACCEPTED'
  | 'ASSIGNMENT_DECLINED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP'
  | 'PASSENGER_ONBOARD'
  | 'TRIP_STARTED'
  | 'STOP_ARRIVAL'
  | 'DESTINATION_ARRIVAL'
  | 'TRIP_COMPLETED'
  | 'DELAY_REPORTED'
  | 'INCIDENT_REPORTED'
  | 'VEHICLE_PROBLEM_REPORTED';

@Entity({ name: 'transport_trip_events' })
export class TransportTripEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'request_id' })
  @Index()
  requestId!: string;

  @ManyToOne(() => TransportationRequest, (r) => r.tripEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: TransportationRequest;

  @Column({ type: 'uuid', name: 'assignment_id', nullable: true })
  assignmentId!: string | null;

  @ManyToOne(() => TransportAssignment, { nullable: true })
  @JoinColumn({ name: 'assignment_id' })
  assignment!: TransportAssignment | null;

  @Column({ type: 'uuid', name: 'driver_id', nullable: true })
  driverId!: string | null;

  @ManyToOne(() => Driver, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver | null;

  @Column({ type: 'varchar', length: 40, name: 'event_type' })
  eventType!: TripEventType;

  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    name: 'attachment_url',
    nullable: true,
  })
  attachmentUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
