// backend/src/audit/audit-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  actorId!: string;

  @Column()
  actorEmail!: string;

  @Column()
  action!: string; // CREATE_USER, UPDATE_USER, etc.

  @Column({ nullable: true })
  targetId?: string;

  @Column({ nullable: true })
  targetType?: string; // USER, PROJECT, etc.

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
