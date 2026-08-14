import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverDutySchedule } from './entities/driver-duty-schedule.entity';
import { VehicleAvailabilityBlock } from './entities/vehicle-availability-block.entity';
import { Driver } from '../catalog/drivers/driver.entity';
import { Car } from '../catalog/cars/car.entity';
import { DriverDutyScheduleService } from './services/driver-duty-schedule.service';
import { VehicleAvailabilityBlockService } from './services/vehicle-availability-block.service';
import { FleetAvailabilityService } from './services/fleet-availability.service';
import { DriverDutyScheduleController } from './controllers/driver-duty-schedule.controller';
import { VehicleAvailabilityBlockController } from './controllers/vehicle-availability-block.controller';
import { FleetAvailabilityController } from './controllers/fleet-availability.controller';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { PermissionsModule } from '../../permissions/permissions.module';
import { AuditCoreModule } from '../../audit/audit-core.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DriverDutySchedule,
      VehicleAvailabilityBlock,
      Driver,
      Car,
    ]),
    PermissionsModule,
    AuditCoreModule,
  ],
  controllers: [
    DriverDutyScheduleController,
    VehicleAvailabilityBlockController,
    FleetAvailabilityController,
  ],
  providers: [
    DriverDutyScheduleService,
    VehicleAvailabilityBlockService,
    FleetAvailabilityService,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [FleetAvailabilityService],
})
export class SchedulingModule {}
