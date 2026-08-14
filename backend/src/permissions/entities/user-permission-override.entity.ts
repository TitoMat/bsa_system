// backend/src/permissions/entities/user-permission-override.entity.ts
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum UserPermissionOverrideEffect {
  ALLOW = 'allow',
  DENY = 'deny',
}

@Entity('user_permission_overrides')
@Index(['userId', 'permission'], { unique: true })
export class UserPermissionOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  permission: string;

  @Column({
    type: 'enum',
    enum: UserPermissionOverrideEffect,
  })
  effect: UserPermissionOverrideEffect;

  @Column({ type: 'varchar', length: 80, nullable: true })
  inheritedRole?: string | null;
}
