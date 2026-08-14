import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DEFAULT_ASSIGNMENT_POOL,
  DEFAULT_AUTO_ASSIGN_ENABLED,
  DEFAULT_ALLOW_GENERAL_USE_WHEN_EXECUTIVE_AWAY,
  type FleetAssignmentPool,
} from '../fleet-domain';

export type DriverDutyStatus =
  | 'ON_DUTY'
  | 'OFF_DUTY'
  | 'ON_LEAVE'
  | 'ON_BREAK'
  | 'SUSPENDED';

export const DRIVER_DUTY_STATUSES = [
  'ON_DUTY',
  'OFF_DUTY',
  'ON_LEAVE',
  'ON_BREAK',
  'SUSPENDED',
] as const;

@Entity({ name: 'drivers' })
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, name: 'license_number' })
  licenseNumber!: string;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'contact_number',
    nullable: true,
  })
  contactNumber!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'duty_status',
    default: 'OFF_DUTY',
  })
  dutyStatus!: DriverDutyStatus;

  @Column({ type: 'date', name: 'license_expiry', nullable: true })
  licenseExpiry!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    name: 'current_latitude',
    nullable: true,
  })
  currentLatitude!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    name: 'current_longitude',
    nullable: true,
  })
  currentLongitude!: number | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'assignment_pool',
    default: DEFAULT_ASSIGNMENT_POOL,
  })
  assignmentPool!: FleetAssignmentPool;

  @Column({
    type: 'boolean',
    name: 'auto_assign_enabled',
    default: DEFAULT_AUTO_ASSIGN_ENABLED,
  })
  autoAssignEnabled!: boolean;

  @Column({
    type: 'boolean',
    name: 'allow_general_use_when_executive_away',
    default: DEFAULT_ALLOW_GENERAL_USE_WHEN_EXECUTIVE_AWAY,
  })
  allowGeneralUseWhenExecutiveAway!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
