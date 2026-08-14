import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../../audit/audit.service';
import { FleetDispatchSettings } from '../entities/fleet-dispatch-settings.entity';
import { UpdateDispatchSettingsDto } from '../dto/update-dispatch-settings.dto';

export type DispatchSettingsSnapshot = {
  autoDispatchEnabled: boolean;
  executiveReservationMode: boolean;
  defaultAssignmentStrategy: string;
  updatedByUserId: string | null;
  updatedAt: string;
};

@Injectable()
export class FleetDispatchSettingsService {
  constructor(
    @InjectRepository(FleetDispatchSettings)
    private readonly settingsRepo: Repository<FleetDispatchSettings>,
    private readonly auditService: AuditService,
  ) {}

  private async ensureRow(): Promise<FleetDispatchSettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepo.create({
        id: 1,
        autoDispatchEnabled: false,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
      });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  async getSettings(): Promise<DispatchSettingsSnapshot> {
    const settings = await this.ensureRow();
    return this.snapshot(settings);
  }

  async updateSettings(
    actor: { sub: string; email: string },
    dto: UpdateDispatchSettingsDto,
  ): Promise<DispatchSettingsSnapshot> {
    const settings = await this.ensureRow();
    const before = this.snapshot(settings);

    if (dto.autoDispatchEnabled !== undefined) {
      settings.autoDispatchEnabled = dto.autoDispatchEnabled;
    }
    if (dto.executiveReservationMode !== undefined) {
      settings.executiveReservationMode = dto.executiveReservationMode;
    }
    if (dto.defaultAssignmentStrategy !== undefined) {
      settings.defaultAssignmentStrategy = dto.defaultAssignmentStrategy;
    }
    settings.updatedByUserId = actor.sub;
    await this.settingsRepo.save(settings);

    const after = this.snapshot(settings);
    if (before.autoDispatchEnabled !== after.autoDispatchEnabled) {
      await this.auditService.log({
        actorId: actor.sub,
        actorEmail: actor.email,
        action: after.autoDispatchEnabled
          ? 'FLEET_DISPATCH_AUTO_ENABLED'
          : 'FLEET_DISPATCH_AUTO_DISABLED',
        targetType: 'fleet_dispatch_settings',
        targetId: '1',
        metadata: { requestId: '1' },
      });
    }
    if (before.executiveReservationMode !== after.executiveReservationMode) {
      await this.auditService.log({
        actorId: actor.sub,
        actorEmail: actor.email,
        action: after.executiveReservationMode
          ? 'FLEET_EXECUTIVE_MODE_ENABLED'
          : 'FLEET_EXECUTIVE_MODE_DISABLED',
        targetType: 'fleet_dispatch_settings',
        targetId: '1',
        metadata: { requestId: '1' },
      });
    }
    if (before.defaultAssignmentStrategy !== after.defaultAssignmentStrategy) {
      await this.auditService.log({
        actorId: actor.sub,
        actorEmail: actor.email,
        action: 'FLEET_STRATEGY_CHANGED',
        targetType: 'fleet_dispatch_settings',
        targetId: '1',
        metadata: {
          previous: before.defaultAssignmentStrategy,
          next: after.defaultAssignmentStrategy,
        },
      });
    }

    return after;
  }

  private snapshot(settings: FleetDispatchSettings): DispatchSettingsSnapshot {
    return {
      autoDispatchEnabled: settings.autoDispatchEnabled,
      executiveReservationMode: settings.executiveReservationMode,
      defaultAssignmentStrategy: settings.defaultAssignmentStrategy,
      updatedByUserId: settings.updatedByUserId,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
