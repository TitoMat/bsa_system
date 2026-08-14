import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../permissions/permissions.guard';
import { Permissions } from '../../../permissions/permissions.decorator';
import { PERMISSIONS } from '../../../permissions/permission.constants';
import { FleetAvailabilityService } from '../services/fleet-availability.service';
import { CheckAvailabilityDto } from '../dto/check-availability.dto';

/**
 * Read-only availability evaluation — no side effects, never assigns.
 */
@Controller('fleet-availability')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Fleet Availability')
export class FleetAvailabilityController {
  constructor(private readonly availabilityService: FleetAvailabilityService) {}

  @Get('drivers/:id')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_ASSIGN)
  @ApiOperation({
    summary: 'Evaluate driver availability for an interval (read-only)',
  })
  checkDriver(@Param('id') id: string, @Query() query: CheckAvailabilityDto) {
    return this.availabilityService.checkDriver(
      id,
      new Date(query.startAt),
      new Date(query.endAt),
    );
  }

  @Get('cars/:id')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_ASSIGN)
  @ApiOperation({
    summary: 'Evaluate vehicle availability for an interval (read-only)',
  })
  checkVehicle(@Param('id') id: string, @Query() query: CheckAvailabilityDto) {
    return this.availabilityService.checkVehicle(
      id,
      new Date(query.startAt),
      new Date(query.endAt),
      query.passengers,
    );
  }
}
