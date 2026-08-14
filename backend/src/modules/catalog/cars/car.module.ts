import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { MulterModule } from '@nestjs/platform-express';
import { Car } from './car.entity';
import { CarService } from './car.service';
import { CarController } from './car.controller';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { AuditCoreModule } from '../../../audit/audit-core.module';
import { PermissionsModule } from '../../../permissions/permissions.module';
import { PermissionsGuard } from '../../../permissions/permissions.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Car]),
    AuditCoreModule,
    PermissionsModule,
    MulterModule.register({ storage: undefined }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            (configService.get<string>('JWT_EXPIRES_IN') as StringValue) ||
            ('1h' as StringValue),
        },
      }),
    }),
  ],
  controllers: [CarController],
  providers: [
    CarService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    Reflector,
  ],
})
export class CarModule {}
