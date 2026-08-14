// backend/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditCoreModule } from '../audit/audit-core.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    AuditCoreModule, // ✅ IMPORTANT: added here
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
  controllers: [UsersController],
  providers: [UsersService, JwtAuthGuard, RolesGuard, Reflector],
  exports: [UsersService],
})
export class UsersModule {}
