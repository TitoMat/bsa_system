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

export type PassengerType = 'EMPLOYEE' | 'GUEST' | 'VIP' | 'VENDOR';

@Entity({ name: 'transport_passengers' })
export class TransportPassenger {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'request_id' })
  requestId!: string;

  @ManyToOne(() => TransportationRequest, (r) => r.passengers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: TransportationRequest;

  @Column({ type: 'uuid', name: 'employee_id', nullable: true })
  employeeId!: string | null;

  @Column({ type: 'varchar', length: 200, name: 'passenger_name' })
  passengerName!: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'contact_number',
    nullable: true,
  })
  contactNumber!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'passenger_type',
    default: 'EMPLOYEE',
  })
  passengerType!: PassengerType;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
