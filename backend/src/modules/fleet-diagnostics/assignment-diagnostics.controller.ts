import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { Permissions } from '../../permissions/permissions.decorator';
import { PERMISSIONS } from '../../permissions/permission.constants';
import { FleetAssignmentDiagnosticsService } from './fleet-assignment-diagnostics.service';

/**
 * READ-ONLY assignment diagnostics (R3 Steps 22–23).
 *
 * GET /transportation-requests/:id/assignment-diagnostics
 *
 * No database writes, no candidate mutation, no assignments. Route
 * calculation stays a SEPARATE explicit operation (POST
 * /transportation-requests/:id/route/calculate) so diagnostics never trigger
 * hidden side effects.
 */
@Controller('transportation-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Assignment Diagnostics')
export class AssignmentDiagnosticsController {
  constructor(
    private readonly diagnosticsService: FleetAssignmentDiagnosticsService,
  ) {}

  @Get(':id/assignment-diagnostics')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'Read-only assignment diagnostics for a request' })
  getDiagnostics(@Param('id') id: string) {
    return this.diagnosticsService.getDiagnostics(id);
  }
}
