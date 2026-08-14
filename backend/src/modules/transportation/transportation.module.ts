import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportationController } from './transportation.controller';
import { TransportationService } from './transportation.service';
import { TransportationRouteService } from './services/transportation-route.service';
import { FleetMapStateService } from './services/fleet-map-state.service';
import { MapsModule } from '../maps/maps.module';
import { TransportationRequest } from './entities/transportation-request.entity';
import { TransportStop } from './entities/transport-stop.entity';
import { TransportPassenger } from './entities/transport-passenger.entity';
import { TransportAssignment } from './entities/transport-assignment.entity';
import { TransportStatusHistory } from './entities/transport-status-history.entity';
import { TransportTripEvent } from './entities/transport-trip-event.entity';
import { DriverLocation } from './entities/driver-location.entity';
import { Driver } from '../catalog/drivers/driver.entity';
import { Car } from '../catalog/cars/car.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { PermissionsModule } from '../../permissions/permissions.module';
import { AuditCoreModule } from '../../audit/audit-core.module';
import { DispatchModule } from '../dispatch/dispatch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransportationRequest,
      TransportStop,
      TransportPassenger,
      TransportAssignment,
      TransportStatusHistory,
      TransportTripEvent,
      DriverLocation,
      Driver,
      Car,
    ]),
    PermissionsModule,
    AuditCoreModule,
    MapsModule,
    DispatchModule,
  ],
  controllers: [TransportationController],
  providers: [
    TransportationService,
    TransportationRouteService,
    FleetMapStateService,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class TransportationModule {}
