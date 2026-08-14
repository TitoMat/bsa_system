import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Car } from '../../catalog/cars/car.entity';
import { User } from '../../../users/user.entity';
import type { VehicleBlockReason } from '../domain/scheduling-domain';

/**
 * Temporal unavailability of a vehicle (R2 Step 5).
 *
 * Deliberately SEPARATE from `cars.vehicle_status`:
 * - vehicle_status is RESOURCE STATE (OPERATIONAL / MAINTENANCE /
 *   OUT_OF_SERVICE), mutating it is a materials-managed decision.
 * - a block here is TEMPORAL STATE (the vehicle is reserved/unavailable for a
 *   concrete interval).
 * Creating a block NEVER mutates vehicle_status, and vice versa.
 *
 * end_at > start_at is enforced both in the service layer and by a DB CHECK.
 * Historical blocks are never deleted automatically.
 */
@Entity({ name: 'vehicle_availability_blocks' })
@Check('ck_vehicle_block_end_after_start', '"end_at" > "start_at"')
@Index('idx_vehicle_blocks_vehicle_start_end', [
  'vehicleId',
  'startAt',
  'endAt',
])
export class VehicleAvailabilityBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'vehicle_id' })
  vehicleId!: string;

  @ManyToOne(() => Car, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Car;

  @Column({ type: 'timestamptz', name: 'start_at' })
  startAt!: Date;

  @Column({ type: 'timestamptz', name: 'end_at' })
  endAt!: Date;

  @Column({ type: 'varchar', length: 30 })
  reason!: VehicleBlockReason;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
