import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { AssignmentStrategy } from '../domain/dispatch-domain';

/**
 * R4 — Fleet dispatch settings. Single-row table (id = 1).
 *
 * Rollout-safe defaults: auto dispatch OFF until an operator flips it; the
 * executive fleet is reserved for executive requests until the boss is away.
 */
@Entity({ name: 'fleet_dispatch_settings' })
export class FleetDispatchSettings {
  @PrimaryColumn({ type: 'int', default: 1 })
  id!: number;

  @Column({ type: 'boolean', name: 'auto_dispatch_enabled', default: false })
  autoDispatchEnabled!: boolean;

  @Column({
    type: 'boolean',
    name: 'executive_reservation_mode',
    default: true,
  })
  executiveReservationMode!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'default_assignment_strategy',
    default: 'FAIR_RANDOM',
  })
  defaultAssignmentStrategy!: AssignmentStrategy;

  @Column({ type: 'uuid', name: 'updated_by_user_id', nullable: true })
  updatedByUserId!: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
