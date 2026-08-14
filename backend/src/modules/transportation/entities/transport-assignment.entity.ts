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
import { TransportationRequest } from './transportation-request.entity';
import { Driver } from '../../catalog/drivers/driver.entity';
import { Car } from '../../catalog/cars/car.entity';
import { User } from '../../../users/user.entity';

export type AssignmentStatus =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'REASSIGNED'
  | 'CANCELLED';

@Entity({ name: 'transport_assignments' })
export class TransportAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'request_id' })
  @Index()
  requestId!: string;

  @ManyToOne(() => TransportationRequest, (r) => r.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: TransportationRequest;

  @Column({ type: 'uuid', name: 'driver_id' })
  @Index()
  driverId!: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @Column({ type: 'uuid', name: 'vehicle_id' })
  @Index()
  vehicleId!: string;

  @ManyToOne(() => Car)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Car;

  @Column({ type: 'uuid', name: 'assigned_by_user_id' })
  assignedByUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedBy!: User;

  @Column({ type: 'timestamptz', name: 'assigned_at' })
  assignedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'OFFERED' })
  status!: AssignmentStatus;

  @Column({ type: 'timestamptz', name: 'driver_responded_at', nullable: true })
  driverRespondedAt!: Date | null;

  @Column({ type: 'text', name: 'decline_reason', nullable: true })
  declineReason!: string | null;

  @Column({ type: 'text', name: 'dispatch_notes', nullable: true })
  dispatchNotes!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'expected_departure_at',
    nullable: true,
  })
  expectedDepartureAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'actual_departure_at', nullable: true })
  actualDepartureAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
