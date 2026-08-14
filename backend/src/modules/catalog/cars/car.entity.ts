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
  DEFAULT_CODING_DAY,
  DEFAULT_ALLOW_GENERAL_USE_WHEN_EXECUTIVE_AWAY,
  type CodingDay,
  type FleetAssignmentPool,
} from '../fleet-domain';

export type CarType =
  | 'Sedan'
  | 'SUV'
  | 'Van'
  | 'Truck'
  | 'Hatchback'
  | 'Coupe'
  | 'Wagon'
  | 'Other';
export type VehicleStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

export const VEHICLE_STATUSES = [
  'OPERATIONAL',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
] as const;

@Entity({ name: 'cars' })
export class Car {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  make!: string;

  @Column({ type: 'varchar', length: 255 })
  model!: string;

  @Column({ type: 'int', nullable: true })
  year!: number | null;

  @Column({ type: 'varchar', length: 50, name: 'plate_number' })
  plateNumber!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'car_type', default: 'Other' })
  carType!: CarType;

  @Column({ type: 'varchar', length: 500, name: 'photo_url', nullable: true })
  photoUrl!: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'int', name: 'seating_capacity', default: 5 })
  seatingCapacity!: number;

  @Column({
    type: 'varchar',
    length: 30,
    name: 'vehicle_status',
    default: 'OPERATIONAL',
  })
  vehicleStatus!: VehicleStatus;

  @Column({ type: 'date', name: 'registration_expiry', nullable: true })
  registrationExpiry!: string | null;

  @Column({ type: 'date', name: 'insurance_expiry', nullable: true })
  insuranceExpiry!: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'coding_day',
    default: DEFAULT_CODING_DAY,
  })
  codingDay!: CodingDay;

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
