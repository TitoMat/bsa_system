import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FleetDispatchService } from '../services/fleet-dispatch.service';
import { FleetRedispatchService } from '../services/fleet-redispatch.service';
import {
  ManualDispatchDto,
  OverrideDispatchDto,
  ReassignDispatchDto,
} from '../dto/dispatch.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../permissions/permissions.guard';
import { Permissions } from '../../../permissions/permissions.decorator';
import { PERMISSIONS } from '../../../permissions/permission.constants';
import { DeclineAssignmentDto } from '../../transportation/dto/assignment.dto';

@Controller('transportation-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Fleet Dispatch')
export class DispatchController {
  constructor(
    private readonly dispatchService: FleetDispatchService,
    private readonly redispatchService: FleetRedispatchService,
  ) {}

  @Post(':id/dispatch/auto')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH)
  @ApiOperation({
    summary:
      'Auto-dispatch: fair-random eligible pair for the request (explicit dispatcher action — bypasses the autoDispatchEnabled gate)',
  })
  auto(@Req() req: any, @Param('id') id: string) {
    return this.dispatchService.dispatchAuto(
      { sub: req.user.sub, email: req.user.email },
      id,
    );
  }

  @Post(':id/dispatch/manual')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH)
  @ApiOperation({
    summary:
      'Manual dispatch: dispatcher-picked driver/vehicle, engine validates safety rules',
  })
  manual(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ManualDispatchDto,
  ) {
    return this.dispatchService.dispatchManual(
      { sub: req.user.sub, email: req.user.email },
      id,
      {
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        dispatchNotes: dto.dispatchNotes,
        expectedDepartureAt: dto.expectedDepartureAt
          ? new Date(dto.expectedDepartureAt)
          : undefined,
      },
    );
  }

  @Post(':id/dispatch/override')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH)
  @ApiOperation({
    summary:
      'Override dispatch: write the given pair past overrideable failures with an auditable reason',
  })
  override(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: OverrideDispatchDto,
  ) {
    return this.dispatchService.dispatchOverride(
      { sub: req.user.sub, email: req.user.email },
      id,
      {
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        overrideReason: dto.overrideReason,
        assignmentStrategy: dto.assignmentStrategy,
      },
    );
  }

  @Post(':id/dispatch/reassign')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH)
  @ApiOperation({
    summary:
      'Reassign: supersede the current ACTIVE assignment and auto-pick a fresh pair',
  })
  reassign(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReassignDispatchDto,
  ) {
    return this.dispatchService.dispatchReassign(
      { sub: req.user.sub, email: req.user.email },
      id,
      dto.reason,
    );
  }

  @Get(':id/dispatch/assignments')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'Fleet assignment history for a request' })
  history(@Param('id') id: string) {
    return this.dispatchService.getFleetAssignments(id);
  }

  @Post(':id/dispatch/assignments/:assignmentId/accept')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'Driver accepts the fleet assignment' })
  accept(
    @Req() req: any,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.dispatchService.acceptAssignment(
      { sub: req.user.sub, email: req.user.email },
      id,
      assignmentId,
    );
  }

  @Post(':id/dispatch/assignments/:assignmentId/decline')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({
    summary:
      'Driver declines the fleet assignment (optional auto-redispatch when enabled)',
  })
  decline(
    @Req() req: any,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: DeclineAssignmentDto,
  ) {
    return this.dispatchService.declineAssignment(
      { sub: req.user.sub, email: req.user.email },
      id,
      assignmentId,
      dto.reason,
    );
  }

  // ─── R5B: Redispatch ──────────────────────────────────────────────────

  @Get(':id/redispatch/state')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_MONITOR)
  @ApiOperation({ summary: 'Get redispatch state for a request (R5B)' })
  redispatchState(@Param('id') id: string) {
    return this.redispatchService.getRedispatchState(id);
  }

  @Post(':id/redispatch')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH)
  @ApiOperation({ summary: 'Orchestrated redispatch for a request (R5B)' })
  redispatchRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReassignDispatchDto,
  ) {
    return this.redispatchService.requestRedispatch(
      { sub: req.user.sub, email: req.user.email },
      id,
      dto.reason,
    );
  }
}
