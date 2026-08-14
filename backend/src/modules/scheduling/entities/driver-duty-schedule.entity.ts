import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Driver } from '../../catalog/drivers/driver.entity';
import { User } from '../../../users/user.entity';
import type { DriverDutyScheduleStatus } from '../domain/scheduling-domain';

/**
 * A concrete duty-date record (R2). One record per driver per calendar date —
 * enforced by the UNIQUE (driver_id, schedule_date) constraint at the DB level
 * so no read-then-write race can create duplicates. Recurring templates are
 * out of scope for R2.
 *
 * Times are LOCAL wall-clock "HH:mm"; overnight shifts are represented by
 * shiftEnd <= shiftStart (see domain/shift-time.ts). Concrete instants are
 * derived on read.
 */
@Entity({ name: 'driver_duty_schedules' })
@Unique('uq_driver_duty_schedule_date', ['driverId', 'scheduleDate'])
export class DriverDutySchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'driver_id' })
  driverId!: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @Column({ type: 'date', name: 'schedule_date' })
  scheduleDate!: string;

  @Column({ type: 'varchar', length: 5, name: 'shift_start' })
  shiftStart!: string;

  @Column({ type: 'varchar', length: 5, name: 'shift_end' })
  shiftEnd!: string;

  @Column({ type: 'varchar', length: 20, default: 'ON_DUTY' })
  status!: DriverDutyScheduleStatus;

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
