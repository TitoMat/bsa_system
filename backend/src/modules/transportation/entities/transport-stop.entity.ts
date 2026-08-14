import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransportationRequest } from './transportation-request.entity';

@Entity({ name: 'transport_stops' })
export class TransportStop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'request_id' })
  requestId!: string;

  @ManyToOne(() => TransportationRequest, (r) => r.stops, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: TransportationRequest;

  @Column({ type: 'int' })
  sequence!: number;

  @Column({ type: 'varchar', length: 500 })
  address!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number;

  @Column({ type: 'timestamptz', name: 'expected_arrival_at', nullable: true })
  expectedArrivalAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  purpose!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
