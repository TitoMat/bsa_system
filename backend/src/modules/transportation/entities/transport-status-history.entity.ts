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
import type { TransportationRequestStatus } from './transportation-request.entity';
import { User } from '../../../users/user.entity';

export type StatusChangeSource =
  | 'REQUESTER'
  | 'APPROVER'
  | 'DISPATCHER'
  | 'DRIVER'
  | 'SYSTEM';

@Entity({ name: 'transport_status_history' })
export class TransportStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'request_id' })
  @Index()
  requestId!: string;

  @ManyToOne(() => TransportationRequest, (r) => r.statusHistories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: TransportationRequest;

  @Column({
    type: 'varchar',
    length: 30,
    name: 'previous_status',
    nullable: true,
  })
  previousStatus!: TransportationRequestStatus | null;

  @Column({ type: 'varchar', length: 30, name: 'new_status' })
  newStatus!: TransportationRequestStatus;

  @Column({ type: 'uuid', name: 'changed_by_user_id', nullable: true })
  changedByUserId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedBy!: User | null;

  @Column({ type: 'timestamptz', name: 'changed_at' })
  changedAt!: Date;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number | null;

  @Column({ type: 'varchar', length: 20, default: 'SYSTEM' })
  source!: StatusChangeSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
