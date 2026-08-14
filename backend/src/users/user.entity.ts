// backend/src/users/user.entity.ts
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 190 })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({ type: 'varchar', length: 80, default: 'USER' })
  role!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil!: Date | null;

  @Column({ type: 'boolean', default: true })
  mustChangePassword!: boolean;

  @Column({ type: 'varchar', length: 10, default: 'system' })
  themePreference!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'employee_id' })
  employeeId!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  async comparePassword(plainText: string): Promise<boolean> {
    return bcrypt.compare(plainText, this.password);
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (!this.password) return;

    const alreadyHashed =
      this.password.startsWith('$2b$') || this.password.startsWith('$2a$');

    if (alreadyHashed) return;

    this.password = await bcrypt.hash(this.password, 10);
  }
}
