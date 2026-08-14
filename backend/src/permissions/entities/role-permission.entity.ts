// backend/src/permissions/entities/role-permission.entity.ts
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
@Entity('role_permissions')
@Index(['role', 'permission'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  role: string;

  @Column()
  permission: string;
}
