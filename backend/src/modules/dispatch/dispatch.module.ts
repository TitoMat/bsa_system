import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../../permissions/permissions.module';
import { AuditCoreModule } from '../../audit/audit-core.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { TransportationRequest } from '../transportation/entities/transportation-request.entity';
import { TransportAssignment } from '../transportation/entities/transport-assignment.entity';
import { TransportStatusHistory } from '../transportation/entities/transport-status-history.entity';
import { Driver } from '../catalog/drivers/driver.entity';
import { Car } from '../catalog/cars/car.entity';
import { FleetAssignment } from './entities/fleet-assignment.entity';
import { FleetDispatchSettings } from './entities/fleet-dispatch-settings.entity';
import { FleetDispatchService } from './services/fleet-dispatch.service';
import { FleetDispatchSettingsService } from './services/fleet-dispatch-settings.service';
import { FleetRedispatchService } from './services/fleet-redispatch.service';
import { FleetOperationsAnalyticsService } from './services/fleet-operations-analytics.service';
import { ASSIGNMENT_RANDOM_SOURCE } from './dispatch.constants';
import { CryptoAssignmentRandomSource } from './services/assignment-random.source';
import { DispatchController } from './controllers/dispatch.controller';
import {
  FleetDispatchSettingsController,
  FleetDispatchSummaryController,
  FleetAnalyticsController,
} from './controllers/fleet-dispatch-settings.controller';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FleetAssignment,
      FleetDispatchSettings,
      TransportationRequest,
      TransportAssignment,
      TransportStatusHistory,
      Driver,
      Car,
    ]),
    PermissionsModule,
    AuditCoreModule,
    SchedulingModule,
  ],
  controllers: [
    DispatchController,
    FleetDispatchSettingsController,
    FleetDispatchSummaryController,
    FleetAnalyticsController,
  ],
  providers: [
    FleetDispatchService,
    FleetDispatchSettingsService,
    FleetRedispatchService,
    FleetOperationsAnalyticsService,
    {
      provide: ASSIGNMENT_RANDOM_SOURCE,
      useClass: CryptoAssignmentRandomSource,
    },
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [FleetDispatchService],
})
export class DispatchModule {}
