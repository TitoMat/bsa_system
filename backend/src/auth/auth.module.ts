// backend/src/auth/auth.module.ts
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

import { AuthController } from './../auth/auth.controller';
import { AuthService } from './../auth/auth.service';
import { JwtStrategy } from './../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';

import { User } from '../users/user.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuditCoreModule } from '../audit/audit-core.module';
import { RedisService } from '../common/redis/redis.service';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    PermissionsModule,
    AuditCoreModule,
    TypeOrmModule.forFeature([User, AuditLog]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not configured.');
        }
        return {
          secret,
          signOptions: {
            expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
              '1h') as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RedisService,
    LoginRateLimitGuard,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
