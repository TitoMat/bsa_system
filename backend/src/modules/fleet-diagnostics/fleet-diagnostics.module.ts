import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportationRequest } from '../transportation/entities/transportation-request.entity';
import { TransportAssignment } from '../transportation/entities/transport-assignment.entity';
import { FleetAssignment } from '../dispatch/entities/fleet-assignment.entity';
import { Driver } from '../catalog/drivers/driver.entity';
import { Car } from '../catalog/cars/car.entity';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { FleetAssignmentDiagnosticsService } from './fleet-assignment-diagnostics.service';
import { AssignmentDiagnosticsController } from './assignment-diagnostics.controller';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { PermissionsModule } from '../../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransportationRequest,
      TransportAssignment,
      FleetAssignment,
      Driver,
      Car,
    ]),
    SchedulingModule,
    PermissionsModule,
  ],
  controllers: [AssignmentDiagnosticsController],
  providers: [
    FleetAssignmentDiagnosticsService,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class FleetDiagnosticsModule {}
