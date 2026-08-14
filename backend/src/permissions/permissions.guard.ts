// backend/src/permissions/permissions.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_ANY_KEY, PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionsService } from './permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const anyPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ANY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredPermissions.length && !anyPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | {
          sub?: string;
          role?: string;
        }
      | undefined;

    if (!user?.sub || !user?.role) {
      throw new ForbiddenException('Unauthorized');
    }

    const contextInfo = await this.permissionsService.getPermissionCheckContext(
      user.sub,
      user.role,
    );
    const allowed =
      requiredPermissions.every((permission) =>
        contextInfo.permissions.includes(permission),
      ) &&
      (!anyPermissions.length ||
        anyPermissions.some((permission) =>
          contextInfo.permissions.includes(permission),
        ));

    if (!allowed) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !contextInfo.permissions.includes(permission),
      );
      const missingAnyPermissions =
        anyPermissions.length &&
        !anyPermissions.some((permission) =>
          contextInfo.permissions.includes(permission),
        )
          ? anyPermissions
          : [];

      this.logger.warn(
        [
          'Permission denied',
          `userId=${user.sub}`,
          `tokenRole=${contextInfo.tokenRole}`,
          `resolvedRole=${contextInfo.resolvedRole}`,
          `permissionCount=${contextInfo.permissions.length}`,
          `required=${requiredPermissions.join(',')}`,
          `requiredAny=${anyPermissions.join(',')}`,
          `missing=${missingPermissions.join(',')}`,
          `missingAny=${missingAnyPermissions.join(',')}`,
        ].join(' '),
      );

      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
