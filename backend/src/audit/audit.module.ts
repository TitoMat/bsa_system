// backend/src/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuditCoreModule } from './audit-core.module';

@Module({
  imports: [
    ConfigModule,
    AuditCoreModule,
    PermissionsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET') as Secret;
        const expiresIn = (configService.get<string>('JWT_EXPIRES_IN') ||
          '1h') as SignOptions['expiresIn'];

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuditController],
  providers: [JwtAuthGuard, RolesGuard, Reflector],
})
export class AuditModule {}
