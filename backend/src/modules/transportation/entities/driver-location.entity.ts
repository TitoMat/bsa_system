import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Driver } from '../../catalog/drivers/driver.entity';
import { Car } from '../../catalog/cars/car.entity';
import { TransportationRequest } from '../entities/transportation-request.entity';

@Entity({ name: 'driver_locations' })
export class DriverLocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'driver_id' })
  @Index()
  driverId!: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @Column({ type: 'uuid', name: 'vehicle_id', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => Car, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Car | null;

  @Column({ type: 'uuid', name: 'request_id', nullable: true })
  requestId!: string | null;

  @ManyToOne(() => TransportationRequest, { nullable: true })
  @JoinColumn({ name: 'request_id' })
  request!: TransportationRequest | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 1,
    name: 'speed_kph',
    nullable: true,
  })
  speedKph!: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 1,
    name: 'heading_degrees',
    nullable: true,
  })
  headingDegrees!: number | null;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 1,
    name: 'accuracy_meters',
    nullable: true,
  })
  accuracyMeters!: number | null;

  @Column({ type: 'timestamptz', name: 'recorded_at' })
  recordedAt!: Date;

  @Column({ type: 'timestamptz', name: 'received_at' })
  receivedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
