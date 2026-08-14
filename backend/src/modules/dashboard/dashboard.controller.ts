import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { Permissions } from '../../permissions/permissions.decorator';
import { ApiPermissions } from '../../common/swagger/api-permissions.decorator';
import { PERMISSIONS } from '../../permissions/permission.constants';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('system-status')
  @Permissions(PERMISSIONS.DASHBOARD_VIEW)
  @ApiPermissions(PERMISSIONS.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Check system status' })
  @ApiResponse({ status: 200, description: 'System status returned' })
  getSystemStatus() {
    return this.dashboardService.getSystemStatus();
  }
}