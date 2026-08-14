import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Param,
  UseGuards,
  UseFilters,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransportationService } from './transportation.service';
import { CreateTransportationRequestDto } from './dto/create-transportation-request.dto';
import { UpdateTransportationRequestDto } from './dto/update-transportation-request.dto';
import { QueryTransportationRequestDto } from './dto/query-transportation-request.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import {
  ApproveRequestDto,
  RejectRequestDto,
  CancelRequestDto,
  CompleteRequestDto,
} from './dto/action-request.dto';
import {
  CreateAssignmentDto,
  AcceptAssignmentDto,
  DeclineAssignmentDto,
} from './dto/assignment.dto';
import { CreateTripEventDto } from './dto/trip-event.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { Permissions } from '../../permissions/permissions.decorator';
import { PERMISSIONS } from '../../permissions/permission.constants';
import { TransportationRouteService } from './services/transportation-route.service';
import { FleetMapStateService } from './services/fleet-map-state.service';

@Controller('transportation-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Transportation Requests')
export class TransportationController {
  constructor(
    private readonly transportationService: TransportationService,
    private readonly routeService: TransportationRouteService,
    private readonly fleetMapStateService: FleetMapStateService,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_CREATE)
  @ApiOperation({ summary: 'Create a transportation request' })
  create(@Req() req: any, @Body() dto: CreateTransportationRequestDto) {
    return this.transportationService.create(req.user, dto);
  }

  @Get()
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'List transportation requests' })
  findAll(@Query() query: QueryTransportationRequestDto) {
    return this.transportationService.findAll(query);
  }

  @Get('calendar')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({
    summary: 'Get lean calendar events in a scheduled-pickup range',
  })
  getCalendarEvents(@Query() query: CalendarQueryDto) {
    return this.transportationService.getCalendarEvents(query.from, query.to);
  }

  @Get('monitoring/summary')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_MONITOR)
  @ApiOperation({ summary: 'Get monitoring summary counts' })
  getMonitoringSummary() {
    return this.transportationService.getMonitoringSummary();
  }

  @Get('monitoring/board')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_MONITOR)
  @ApiOperation({ summary: 'Get dispatch board data (R5A)' })
  getMonitoringBoard() {
    return this.transportationService.getMonitoringBoard();
  }

  @Get('monitoring/map-state')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_MONITOR)
  @ApiOperation({ summary: 'Get fleet vehicle map state (R6)' })
  @ApiResponse({ status: 200, description: 'Fleet map state snapshot' })
  getMonitoringMapState() {
    return this.fleetMapStateService.getMapState();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'Get transportation request by ID' })
  findById(@Param('id') id: string) {
    return this.transportationService.findById(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_EDIT_OWN)
  @ApiOperation({ summary: 'Update transportation request' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTransportationRequestDto,
  ) {
    return this.transportationService.update(req.user, id, dto);
  }

  @Post(':id/submit')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_CREATE)
  @ApiOperation({ summary: 'Submit a transportation request' })
  submit(@Req() req: any, @Param('id') id: string) {
    return this.transportationService.submit(req.user, id);
  }

  @Post(':id/approve')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_APPROVE)
  @ApiOperation({ summary: 'Approve a transportation request' })
  approve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveRequestDto,
  ) {
    return this.transportationService.approve(req.user, id, dto.remarks);
  }

  @Post(':id/reject')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_REJECT)
  @ApiOperation({ summary: 'Reject a transportation request' })
  reject(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
  ) {
    return this.transportationService.reject(req.user, id, dto.remarks);
  }

  @Post(':id/cancel')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_CANCEL_OWN)
  @ApiOperation({ summary: 'Cancel a transportation request' })
  cancel(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CancelRequestDto,
  ) {
    return this.transportationService.cancel(req.user, id, dto.reason);
  }

  @Post(':id/complete')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_COMPLETE)
  @ApiOperation({ summary: 'Complete a transportation request' })
  complete(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteRequestDto,
  ) {
    return this.transportationService.complete(req.user, id, dto.remarks);
  }

  @Post(':id/route/calculate')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_EDIT_OWN)
  @ApiOperation({
    summary:
      'Calculate and persist the route snapshot for a request (explicit action)',
  })
  calculateRoute(@Req() req: any, @Param('id') id: string) {
    return this.routeService.calculateForRequest(id, {
      sub: req.user.sub,
      email: req.user.email,
    });
  }

  @Get(':id/assignments')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'List assignments for a request' })
  getAssignments(@Param('id') id: string) {
    return this.transportationService.getAssignments(id);
  }

  @Post(':id/assignments')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_ASSIGN)
  @ApiOperation({ summary: 'Assign driver and vehicle to a request' })
  createAssignment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.transportationService.assignDriverAndVehicle(req.user, id, dto);
  }

  @Post(':id/assignments/:assignmentId/accept')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'Driver accepts an assignment' })
  acceptAssignment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.transportationService.driverAccept(req.user, id, assignmentId);
  }

  @Post(':id/assignments/:assignmentId/decline')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'Driver declines an assignment' })
  declineAssignment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: DeclineAssignmentDto,
  ) {
    return this.transportationService.driverDecline(
      req.user,
      id,
      assignmentId,
      dto.reason,
    );
  }

  @Post(':id/reassign')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_ASSIGN)
  @ApiOperation({ summary: 'Auto-reassign available driver and vehicle' })
  reassign(@Req() req: any, @Param('id') id: string) {
    return this.transportationService.autoAssignAvailable(req.user, id);
  }

  @Get(':id/events')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'List trip events for a request' })
  getEvents(@Param('id') id: string) {
    return this.transportationService.getEvents(id);
  }

  @Post(':id/events')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'Create a trip event' })
  createEvent(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateTripEventDto,
  ) {
    return this.transportationService.createEvent(req.user, id, dto);
  }

  @Get(':id/status-history')
  @Permissions(PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN)
  @ApiOperation({ summary: 'Get status history for a request' })
  getStatusHistory(@Param('id') id: string) {
    return this.transportationService.getStatusHistory(id);
  }
}
