import { applyDecorators } from '@nestjs/common';
import { ApiExtension, ApiResponse } from '@nestjs/swagger';

export function ApiPermissions(...permissions: string[]) {
  const permissionList = permissions.join(', ');

  return applyDecorators(
    ApiExtension('x-permissions', permissions),
    ApiResponse({
      status: 403,
      description: `Forbidden. Required permissions: ${permissionList}`,
    }),
  );
}
