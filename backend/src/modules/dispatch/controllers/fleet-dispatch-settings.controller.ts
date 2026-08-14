import { Body, Controller, Get, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FleetDispatchSettingsService } from '../services/fleet-dispatch-settings.service';
import { FleetDispatchService } from '../services/fleet-dispatch.service';
import { FleetOperationsAnalyticsService } from '../services/fleet-operations-analytics.service';
import { UpdateDispatchSettingsDto } from '../dto/update-dispatch-settings.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../permissions/permissions.guard';
import { Permissions } from '../../../permissions/permissions.decorator';
import { PERMISSIONS } from '../../../permissions/permission.constants';

@Controller('fleet/dispatch-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Fleet Dispatch Settings')
export class FleetDispatchSettingsController {
  constructor(private readonly settingsService: FleetDispatchSettingsService) {}

  @Get()
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH)
  @ApiOperation({ summary: 'Read fleet dispatch settings' })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH)
  @ApiOperation({ summary: 'Update fleet dispatch settings' })
  updateSettings(@Req() req: any, @Body() dto: UpdateDispatchSettingsDto) {
    return this.settingsService.updateSettings(
      { sub: req.user.sub, email: req.user.email },
      dto,
    );
  }
}

@Controller('fleet/dispatch')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Fleet Dispatch')
export class FleetDispatchSummaryController {
  constructor(private readonly dispatchService: FleetDispatchService) {}

  @Get('executive-resources')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_MONITOR)
  @ApiOperation({
    summary:
      'Executive fleet resource summary for Fleet Monitoring (drivers, vehicles, reservation mode)',
  })
  executiveResources() {
    return this.dispatchService.getExecutiveResourcesSummary();
  }
}

@Controller('fleet/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Fleet Analytics')
export class FleetAnalyticsController {
  constructor(
    private readonly analyticsService: FleetOperationsAnalyticsService,
  ) {}

  @Get('operations')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_MONITOR)
  @ApiOperation({ summary: 'Fleet operations analytics (R5C)' })
  getOperations(
    @Query('period') period?: string,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
    @Query('assignmentPool') assignmentPool?: string,
  ) {
    return this.analyticsService.getAnalytics({
      period: (period as any) ?? 'today',
      startAt,
      endAt,
      assignmentPool: assignmentPool as any,
    });
  }
}
