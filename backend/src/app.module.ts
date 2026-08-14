import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { PermissionsModule } from './permissions/permissions.module';
import { DriverModule } from './modules/catalog/drivers/driver.module';
import { CarModule } from './modules/catalog/cars/car.module';
import { MapsModule } from './modules/maps/maps.module';
import { TransportationModule } from './modules/transportation/transportation.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { FleetDiagnosticsModule } from './modules/fleet-diagnostics/fleet-diagnostics.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

import { SeedService } from './database/seed.service';
import { User } from './users/user.entity';
// Single canonical TypeORM configuration shared with the migration CLI
// (src/database/data-source.ts). The runtime must never drift from the CLI.
import { dataSourceOptions } from './database/data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      useFactory: () => dataSourceOptions,
    }),

    TypeOrmModule.forFeature([User]),

    AuthModule,
    UsersModule,
    AuditModule,
    PermissionsModule,
    DriverModule,
    CarModule,
    MapsModule,
    TransportationModule,
    SchedulingModule,
    FleetDiagnosticsModule,
    DispatchModule,
    DashboardModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
