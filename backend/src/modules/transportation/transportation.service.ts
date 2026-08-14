import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../audit/audit.service';
import { TransportationRequest } from './entities/transportation-request.entity';
import type { TransportationRequestStatus } from './entities/transportation-request.entity';
import { TransportStop } from './entities/transport-stop.entity';
import { TransportPassenger } from './entities/transport-passenger.entity';
import { TransportAssignment } from './entities/transport-assignment.entity';
import { TransportStatusHistory } from './entities/transport-status-history.entity';
import { TransportTripEvent } from './entities/transport-trip-event.entity';
import { Driver } from '../catalog/drivers/driver.entity';
import { Car } from '../catalog/cars/car.entity';
import { FleetDispatchService } from '../dispatch/services/fleet-dispatch.service';
import { CreateTransportationRequestDto } from './dto/create-transportation-request.dto';
import { UpdateTransportationRequestDto } from './dto/update-transportation-request.dto';
import { QueryTransportationRequestDto } from './dto/query-transportation-request.dto';
import { CreateAssignmentDto } from './dto/assignment.dto';
import { CreateTripEventDto } from './dto/trip-event.dto';
import {
  canTransition,
  isFinalStatus,
  isCancellable,
  REQUEST_NUMBER_PREFIX,
} from './transportation.constants';
import { classifyTripPhase } from '../dispatch/utils/tripClassifier';
import { classifyRouteFreshness } from '../dispatch/utils/routeFreshness';

@Injectable()
export class TransportationService {
  private readonly logger = new Logger(TransportationService.name);

  constructor(
    @InjectRepository(TransportationRequest)
    private readonly requestRepo: Repository<TransportationRequest>,
    @InjectRepository(TransportStop)
    private readonly stopRepo: Repository<TransportStop>,
    @InjectRepository(TransportPassenger)
    private readonly passengerRepo: Repository<TransportPassenger>,
    @InjectRepository(TransportAssignment)
    private readonly assignmentRepo: Repository<TransportAssignment>,
    @InjectRepository(TransportStatusHistory)
    private readonly historyRepo: Repository<TransportStatusHistory>,
    @InjectRepository(TransportTripEvent)
    private readonly eventRepo: Repository<TransportTripEvent>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly dispatchService: FleetDispatchService,
  ) {}

  private getActor(req: any) {
    if (!req?.user) throw new BadRequestException('Unauthorized');
    return { sub: req.user.sub, email: req.user.email };
  }

  private validateTripConstraints(
    dto: CreateTransportationRequestDto | UpdateTransportationRequestDto,
  ) {
    if (
      'tripType' in dto &&
      dto.tripType === 'ROUND_TRIP' &&
      !dto.expectedReturnAt
    ) {
      throw new BadRequestException(
        'Round trip requires an expected return date',
      );
    }
    if (
      'scheduledPickupAt' in dto &&
      'expectedReturnAt' in dto &&
      dto.scheduledPickupAt &&
      dto.expectedReturnAt
    ) {
      if (new Date(dto.expectedReturnAt) <= new Date(dto.scheduledPickupAt)) {
        throw new BadRequestException(
          'Expected return must be after scheduled pickup',
        );
      }
    }
    if (
      'scheduledPickupAt' in dto &&
      'expectedEndAt' in dto &&
      dto.scheduledPickupAt &&
      dto.expectedEndAt
    ) {
      if (new Date(dto.expectedEndAt) <= new Date(dto.scheduledPickupAt)) {
        throw new BadRequestException(
          'Expected end must be after scheduled pickup',
        );
      }
    }
    if (
      'expectedReturnAt' in dto &&
      'expectedEndAt' in dto &&
      dto.expectedReturnAt &&
      dto.expectedEndAt
    ) {
      if (new Date(dto.expectedEndAt) <= new Date(dto.expectedReturnAt)) {
        throw new BadRequestException(
          'Expected end must be after expected return pickup',
        );
      }
    }
    if (
      'pickupLatitude' in dto &&
      'destinationLatitude' in dto &&
      dto.pickupLatitude === dto.destinationLatitude &&
      dto.pickupLongitude === dto.destinationLongitude
    ) {
      throw new BadRequestException(
        'Pickup and destination must not be identical',
      );
    }
    if (
      'stops' in dto &&
      dto.tripType === 'MULTI_STOP' &&
      (!dto.stops || dto.stops.length === 0)
    ) {
      throw new BadRequestException(
        'Multi-stop trips require at least one stop',
      );
    }
  }

  async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear().toString();
    const prefix = `${REQUEST_NUMBER_PREFIX}-${year}-`;

    const lastRequest = await this.requestRepo
      .createQueryBuilder('r')
      .where('r.requestNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('r.requestNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (lastRequest) {
      const lastSeq = parseInt(
        lastRequest.requestNumber.split('-').pop() || '0',
        10,
      );
      seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(6, '0')}`;
  }

  async create(
    actor: { sub: string; email: string },
    dto: CreateTransportationRequestDto,
    asDraft = false,
  ) {
    this.validateTripConstraints(dto);

    const request = this.requestRepo.create({
      requestType: dto.requestType,
      title: dto.title,
      purpose: dto.purpose || null,
      priority: dto.priority || 'NORMAL',
      tripType: dto.tripType,
      departmentId: dto.departmentId || null,
      costCenter: dto.costCenter || null,
      contactNumber: dto.contactNumber || null,
      passengerCount: dto.passengerCount,
      preferredVehicleType: dto.preferredVehicleType || null,
      requestedAssignmentPool: dto.requestedAssignmentPool || 'GENERAL',
      specialInstructions: dto.specialInstructions || null,
      scheduledPickupAt: new Date(dto.scheduledPickupAt),
      expectedReturnAt: dto.expectedReturnAt
        ? new Date(dto.expectedReturnAt)
        : null,
      expectedEndAt: dto.expectedEndAt ? new Date(dto.expectedEndAt) : null,
      pickupAddress: dto.pickupAddress,
      pickupLatitude: dto.pickupLatitude,
      pickupLongitude: dto.pickupLongitude,
      destinationAddress: dto.destinationAddress,
      destinationLatitude: dto.destinationLatitude,
      destinationLongitude: dto.destinationLongitude,
      estimatedDistanceMeters: dto.estimatedDistanceMeters ?? null,
      estimatedDurationSeconds: dto.estimatedDurationSeconds ?? null,
      routeGeometry: dto.routeGeometry ?? null,
      requestNumber: await this.generateRequestNumber(),
      requestedByUserId: actor.sub,
      requestorName: dto.requestorName || null,
      requestorEmail: dto.requestorEmail || null,
      status: 'DRAFT',
    } as TransportationRequest);

    const saved = await this.requestRepo.save(request);

    if (dto.stops && dto.stops.length > 0) {
      const stops = dto.stops.map((s) =>
        this.stopRepo.create({
          ...s,
          requestId: saved.id,
        } as unknown as TransportStop),
      );
      await this.stopRepo.save(stops);
    }

    if (dto.passengers && dto.passengers.length > 0) {
      const passengers = dto.passengers.map((p) =>
        this.passengerRepo.create({
          ...p,
          requestId: saved.id,
        } as unknown as TransportPassenger),
      );
      await this.passengerRepo.save(passengers);
    }

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: asDraft
        ? 'TRANSPORTATION_REQUEST_CREATED_DRAFT'
        : 'TRANSPORTATION_REQUEST_CREATED',
      targetId: saved.id,
      targetType: 'transportation_request',
      metadata: { requestNumber: saved.requestNumber, title: saved.title },
    });

    return this.findById(saved.id);
  }

  async findAll(query: QueryTransportationRequestDto) {
    const qb = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.stops', 'stops')
      .leftJoinAndSelect('r.passengers', 'passengers')
      .leftJoinAndSelect('r.assignments', 'assignments')
      .leftJoinAndSelect('assignments.driver', 'driver')
      .leftJoinAndSelect('assignments.vehicle', 'vehicle')
      .leftJoinAndSelect('r.requestedBy', 'requester');

    if (query.search) {
      qb.andWhere(
        '(r.title ILIKE :search OR r.requestNumber ILIKE :search OR r.purpose ILIKE :search OR r.pickupAddress ILIKE :search OR r.destinationAddress ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.status && query.status.length > 0) {
      qb.andWhere('r.status IN (:...status)', { status: query.status });
    }

    if (query.priority && query.priority.length > 0) {
      qb.andWhere('r.priority IN (:...priority)', { priority: query.priority });
    }

    if (query.requestType && query.requestType.length > 0) {
      qb.andWhere('r.requestType IN (:...requestType)', {
        requestType: query.requestType,
      });
    }

    if (query.requesterId) {
      qb.andWhere('r.requestedByUserId = :requesterId', {
        requesterId: query.requesterId,
      });
    }

    if (query.departmentId) {
      qb.andWhere('r.departmentId = :departmentId', {
        departmentId: query.departmentId,
      });
    }

    if (query.driverId) {
      qb.andWhere('assignments.driverId = :driverId', {
        driverId: query.driverId,
      });
    }

    if (query.vehicleId) {
      qb.andWhere('assignments.vehicleId = :vehicleId', {
        vehicleId: query.vehicleId,
      });
    }

    if (query.assigned === true) {
      qb.andWhere('assignments.id IS NOT NULL');
    } else if (query.assigned === false) {
      qb.andWhere('assignments.id IS NULL');
    }

    if (query.activeOnly) {
      qb.andWhere('r.status NOT IN (:...finalStatuses)', {
        finalStatuses: ['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'],
      });
    }

    if (query.scheduledFrom) {
      qb.andWhere('r.scheduledPickupAt >= :scheduledFrom', {
        scheduledFrom: query.scheduledFrom,
      });
    }

    if (query.scheduledTo) {
      qb.andWhere('r.scheduledPickupAt <= :scheduledTo', {
        scheduledTo: query.scheduledTo,
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortDirection = query.sortDirection || 'DESC';
    const allowedSortColumns = [
      'createdAt',
      'updatedAt',
      'scheduledPickupAt',
      'requestNumber',
      'priority',
      'status',
    ];
    const column = allowedSortColumns.includes(sortBy)
      ? `r.${sortBy}`
      : 'r.createdAt';

    qb.orderBy(column, sortDirection)
      .skip(((query.page || 1) - 1) * (query.pageSize || 20))
      .take(query.pageSize || 20);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalPages: Math.ceil(total / (query.pageSize || 20)),
    };
  }

  /**
   * Lean calendar feed — single indexed range scan on scheduled_pickup_at,
   * no route_geometry / stops / passengers payload, no pagination loop.
   * Index: idx_transportation_requests_pickup_at (R3 migration).
   */
  async getCalendarEvents(from?: string, to?: string) {
    type CalendarRow = {
      request_id: string;
      request_number: string;
      title: string;
      priority: string;
      status: string;
      trip_type: string;
      passenger_count: number;
      scheduled_pickup_at: Date;
      expected_end_at: Date | null;
      expected_return_at: Date | null;
      pickup_address: string;
      destination_address: string;
      d_name: string | null;
      v_plate: string | null;
    };

    const qb = this.requestRepo
      .createQueryBuilder('r')
      .leftJoin(
        'fleet_assignments',
        'fa',
        "fa.transportation_request_id = r.id AND fa.status = 'ACTIVE'",
      )
      .leftJoin('drivers', 'd', 'd.id = fa.driver_id')
      .leftJoin('cars', 'v', 'v.id = fa.vehicle_id')
      .select([
        'r.id AS request_id',
        'r.request_number AS request_number',
        'r.title AS title',
        'r.priority AS priority',
        'r.status AS status',
        'r.trip_type AS trip_type',
        'r.passenger_count AS passenger_count',
        'r.scheduled_pickup_at AS scheduled_pickup_at',
        'r.expected_end_at AS expected_end_at',
        'r.expected_return_at AS expected_return_at',
        'r.pickup_address AS pickup_address',
        'r.destination_address AS destination_address',
        'd.name AS d_name',
        'v.plate_number AS v_plate',
      ]);

    if (from) {
      qb.andWhere('r.scheduled_pickup_at >= :from', { from });
    }

    if (to) {
      qb.andWhere('r.scheduled_pickup_at <= :to', { to });
    }

    const rows = await qb
      .orderBy('r.scheduled_pickup_at', 'ASC')
      .getRawMany<CalendarRow>();

    return rows.map((r) => ({
      id: r.request_id,
      requestNumber: r.request_number,
      title: r.title,
      priority: r.priority,
      status: r.status,
      tripType: r.trip_type,
      passengerCount: r.passenger_count,
      scheduledPickupAt: r.scheduled_pickup_at,
      expectedEndAt: r.expected_end_at,
      expectedReturnAt: r.expected_return_at,
      pickupAddress: r.pickup_address,
      destinationAddress: r.destination_address,
      driver: r.d_name,
      vehicle: r.v_plate,
    }));
  }

  async findById(id: string) {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: [
        'stops',
        'passengers',
        'assignments',
        'assignments.driver',
        'assignments.vehicle',
        'requestedBy',
        'statusHistories',
        'statusHistories.changedBy',
      ],
    });

    if (!request)
      throw new NotFoundException('Transportation request not found');
    return request;
  }

  async update(
    actor: { sub: string; email: string },
    id: string,
    dto: UpdateTransportationRequestDto,
  ) {
    const request = await this.findById(id);

    if (isFinalStatus(request.status)) {
      throw new ForbiddenException('Cannot update a request in final status');
    }

    if (request.status !== 'DRAFT' && request.status !== 'SUBMITTED') {
      throw new ForbiddenException(
        'Can only edit requests in Draft or Submitted status',
      );
    }

    this.validateTripConstraints(dto);

    this.applyMutableFields(request, dto);
    const saved = await this.requestRepo.save(request);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'TRANSPORTATION_REQUEST_UPDATED',
      targetId: saved.id,
      targetType: 'transportation_request',
    });

    return this.findById(saved.id);
  }

  /**
   * Whitelist of fields a client may modify through UpdateTransportationRequestDto.
   *
   * Replaces the previous `Object.assign(request, dto)` which could copy any
   * property (including future protected/internal fields) onto the entity.
   * Protected fields are intentionally absent here and can never be written
   * through a general update:
   *
   * - id, requestNumber, status, requestedByUserId
   * - submittedAt, approvedAt, cancelledAt, completedAt
   * - cancellationReason, completionRemarks, createdAt, updatedAt
   * - relations: stops, passengers, assignments, statusHistories, tripEvents
   */
  private applyMutableFields(
    request: TransportationRequest,
    dto: UpdateTransportationRequestDto,
  ): void {
    const fields = [
      'requestType',
      'title',
      'purpose',
      'priority',
      'tripType',
      'requestorName',
      'requestorEmail',
      'departmentId',
      'costCenter',
      'contactNumber',
      'passengerCount',
      'preferredVehicleType',
      'specialInstructions',
      'scheduledPickupAt',
      'expectedReturnAt',
      'expectedEndAt',
      'pickupAddress',
      'pickupLatitude',
      'pickupLongitude',
      'destinationAddress',
      'destinationLatitude',
      'destinationLongitude',
      'estimatedDistanceMeters',
      'estimatedDurationSeconds',
      'routeGeometry',
    ] as const;

    for (const field of fields) {
      const value = dto[field];
      if (value === undefined) continue;

      const target = request as unknown as Record<string, unknown>;
      if (
        field === 'scheduledPickupAt' ||
        field === 'expectedReturnAt' ||
        field === 'expectedEndAt'
      ) {
        target[field] = new Date(value as string);
      } else {
        target[field] = value;
      }
    }
  }

  async submit(actor: { sub: string; email: string }, id: string) {
    await this.transitionStatus(
      actor,
      id,
      'APPROVED' as TransportationRequestStatus,
      'Request submitted and auto-approved',
      'REQUESTER',
    );

    try {
      return await this.autoAssignAvailable(actor, id);
    } catch (error) {
      const remark = this.forDispatchRemark(error);
      this.logger.warn(
        `Auto-assignment failed for request ${id}: ${remark}`,
      );
      await this.transitionStatus(
        actor,
        id,
        'FOR_DISPATCH' as TransportationRequestStatus,
        remark,
        'SYSTEM',
      );
      return this.findById(id);
    }
  }

  async approve(
    actor: { sub: string; email: string },
    id: string,
    remarks?: string,
  ) {
    const request = await this.findById(id);
    if (
      request.status !== 'PENDING_APPROVAL' &&
      request.status !== 'SUBMITTED'
    ) {
      throw new BadRequestException(
        'Request can only be approved from Pending Approval or Submitted status',
      );
    }
    const approved = await this.transitionStatus(
      actor,
      id,
      'APPROVED' as TransportationRequestStatus,
      remarks || 'Request approved',
      'APPROVER',
    );

    try {
      return await this.autoAssignAvailable(actor, id);
    } catch (error) {
      const remark = this.forDispatchRemark(error);
      this.logger.warn(
        `Auto-assignment failed for request ${id}: ${remark}`,
      );
      await this.transitionStatus(
        actor,
        id,
        'FOR_DISPATCH' as TransportationRequestStatus,
        remark,
        'SYSTEM',
      );
      return this.findById(id);
    }
  }

  async reject(
    actor: { sub: string; email: string },
    id: string,
    remarks: string,
  ) {
    if (!remarks) throw new BadRequestException('Rejection reason is required');
    return this.transitionStatus(actor, id, 'REJECTED', remarks, 'APPROVER');
  }

  async cancel(
    actor: { sub: string; email: string },
    id: string,
    reason: string,
  ) {
    const request = await this.findById(id);
    if (!isCancellable(request.status)) {
      throw new BadRequestException(
        `Cannot cancel a request in ${request.status} status`,
      );
    }
    if (!reason)
      throw new BadRequestException('Cancellation reason is required');
    request.cancelledAt = new Date();
    request.cancellationReason = reason;
    await this.requestRepo.save(request);
    return this.transitionStatus(actor, id, 'CANCELLED', reason, 'REQUESTER');
  }

  async complete(
    actor: { sub: string; email: string },
    id: string,
    remarks?: string,
  ) {
    const request = await this.findById(id);
    if (
      request.status !== 'ARRIVED_AT_DESTINATION' &&
      request.status !== 'IN_TRANSIT'
    ) {
      throw new BadRequestException(
        'Request can only be completed after arriving at destination',
      );
    }
    request.completedAt = new Date();
    request.completionRemarks = remarks || null;
    await this.requestRepo.save(request);
    return this.transitionStatus(
      actor,
      id,
      'COMPLETED',
      remarks || 'Trip completed',
      'DRIVER',
    );
  }

  async assignDriverAndVehicle(
    actor: { sub: string; email: string },
    requestId: string,
    dto: CreateAssignmentDto,
  ) {
    const decision = await this.dispatchService.dispatchManual(
      actor,
      requestId,
      {
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        dispatchNotes: dto.dispatchNotes,
        expectedDepartureAt: dto.expectedDepartureAt
          ? new Date(dto.expectedDepartureAt)
          : undefined,
      },
    );
    if (!decision.ok) {
      throw new BadRequestException(
        decision.failures.join('; ') || 'Manual assignment failed',
      );
    }
    return this.findById(requestId);
  }

  async getAssignments(requestId: string) {
    await this.findById(requestId);
    return this.assignmentRepo.find({
      where: { requestId },
      relations: ['driver', 'vehicle', 'assignedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async driverAccept(
    actor: { sub: string; email: string },
    requestId: string,
    assignmentId: string,
  ) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, requestId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.status !== 'OFFERED')
      throw new BadRequestException(
        'Assignment can only be accepted when offered',
      );

    assignment.status = 'ACCEPTED';
    assignment.driverRespondedAt = new Date();
    await this.assignmentRepo.save(assignment);

    return this.transitionStatus(
      actor,
      requestId,
      'DRIVER_ACCEPTED',
      'Driver accepted the assignment',
      'DRIVER',
    );
  }

  async driverDecline(
    actor: { sub: string; email: string },
    requestId: string,
    assignmentId: string,
    reason: string,
  ) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, requestId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    assignment.status = 'DECLINED';
    assignment.driverRespondedAt = new Date();
    assignment.declineReason = reason;
    await this.assignmentRepo.save(assignment);

    return this.transitionStatus(
      actor,
      requestId,
      'DRIVER_DECLINED',
      `Driver declined: ${reason}`,
      'DRIVER',
    );
  }

  async autoAssignAvailable(
    actor: { sub: string; email: string },
    requestId: string,
  ) {
    const decision = await this.dispatchService.requestAutoDispatch(
      actor,
      requestId,
    );
    if (!decision.ok && decision.status !== 'ALREADY_ASSIGNED') {
      throw new BadRequestException(
        decision.failures.join('; ') || 'Auto-assign failed',
      );
    }
    return this.findById(requestId);
  }

  private forDispatchRemark(error: unknown): string {
    const base = 'Approved — awaiting available driver/vehicle';
    if (!(error instanceof BadRequestException)) return base;
    const reason = String(error.message ?? '').trim();
    if (!reason || reason === 'Auto-assign failed') return base;
    return `${base} (${reason.slice(0, 240)})`;
  }

  async getEvents(requestId: string) {
    await this.findById(requestId);
    return this.eventRepo.find({
      where: { requestId },
      relations: ['driver'],
      order: { occurredAt: 'DESC' },
    });
  }

  async createEvent(
    actor: { sub: string; email: string },
    requestId: string,
    dto: CreateTripEventDto,
  ) {
    const request = await this.findById(requestId);

    const event = this.eventRepo.create({
      requestId,
      assignmentId: dto.assignmentId || null,
      driverId: actor.sub,
      eventType: dto.eventType,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      remarks: dto.remarks ?? null,
    } as unknown as TransportTripEvent);

    await this.eventRepo.save(event);

    if (dto.eventType === 'DELAY_REPORTED') {
      request.status = 'DELAYED';
      await this.requestRepo.save(request);
    }

    return event;
  }

  async getStatusHistory(requestId: string) {
    await this.findById(requestId);
    return this.historyRepo.find({
      where: { requestId },
      relations: ['changedBy'],
      order: { changedAt: 'DESC' },
    });
  }

  async getMonitoringSummary() {
    const statusCounts: Record<string, number> = {};
    const statuses = [
      'PENDING_APPROVAL',
      'FOR_DISPATCH',
      'DRIVER_ASSIGNED',
      'DRIVER_ACCEPTED',
      'EN_ROUTE_TO_PICKUP',
      'ARRIVED_AT_PICKUP',
      'PASSENGER_ONBOARD',
      'IN_TRANSIT',
      'ARRIVED_AT_DESTINATION',
      'DELAYED',
      'COMPLETED',
      'CANCELLED',
    ];

    for (const status of statuses) {
      statusCounts[status] = await this.requestRepo.count({
        where: { status: status as TransportationRequestStatus },
      });
    }

    const activeTrips = statuses
      .filter(
        (s) => !['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(s),
      )
      .reduce((sum, s) => sum + (statusCounts[s] || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = await this.requestRepo.count({
      where: { status: 'COMPLETED' as TransportationRequestStatus },
    });

    return {
      pendingApproval: statusCounts['PENDING_APPROVAL'] || 0,
      forDispatch: statusCounts['FOR_DISPATCH'] || 0,
      unassigned:
        (statusCounts['APPROVED'] || 0) + (statusCounts['FOR_DISPATCH'] || 0),
      activeTrips,
      delayedTrips: statusCounts['DELAYED'] || 0,
      completedToday,
      cancelledToday: statusCounts['CANCELLED'] || 0,
    };
  }

  // ─── R5A: Dispatch Board read-model ──────────────────────────────────────

  /**
   * Compact board summary: one bounded query that joins active fleet
   * assignments and returns the data the Dispatch Board frontend needs in a
   * single round trip. No N+1 — one request list, one assignment join, one
   * driver join, one vehicle join.
   */
  async getMonitoringBoard() {
    type BoardRow = {
      request_id: string;
      request_number: string;
      title: string;
      purpose: string | null;
      status: string;
      priority: string;
      trip_type: string;
      passenger_count: number;
      request_type: string;
      scheduled_pickup_at: Date;
      expected_end_at: Date | null;
      expected_return_at: Date | null;
      pickup_address: string;
      pickup_latitude: number;
      pickup_longitude: number;
      destination_address: string;
      destination_latitude: number;
      destination_longitude: number;
      estimated_distance_meters: number | null;
      estimated_duration_seconds: number | null;
      route_provider: string | null;
      route_calculated_at: Date | null;
      requested_assignment_pool: string;
      assigned_driver_id: string | null;
      assigned_vehicle_id: string | null;
      fa_id: string | null;
      fa_driver_id: string | null;
      fa_vehicle_id: string | null;
      fa_method: string | null;
      fa_strategy: string | null;
      fa_status: string | null;
      fa_assigned_at: Date | null;
      d_name: string | null;
      d_license: string | null;
      v_plate: string | null;
      v_make: string | null;
      v_model: string | null;
    };

    const rows = await this.requestRepo
      .createQueryBuilder('r')
      .leftJoin(
        'fleet_assignments',
        'fa',
        'fa.transportation_request_id = r.id AND fa.status = \'ACTIVE\'',
      )
      .leftJoin('drivers', 'd', 'd.id = fa.driver_id')
      .leftJoin('cars', 'v', 'v.id = fa.vehicle_id')
      .select([
        'r.id AS request_id',
        'r.request_number AS request_number',
        'r.title AS title',
        'r.purpose AS purpose',
        'r.status AS status',
        'r.priority AS priority',
        'r.trip_type AS trip_type',
        'r.passenger_count AS passenger_count',
        'r.request_type AS request_type',
        'r.scheduled_pickup_at AS scheduled_pickup_at',
        'r.expected_end_at AS expected_end_at',
        'r.expected_return_at AS expected_return_at',
        'r.pickup_address AS pickup_address',
        'r.pickup_latitude AS pickup_latitude',
        'r.pickup_longitude AS pickup_longitude',
        'r.destination_address AS destination_address',
        'r.destination_latitude AS destination_latitude',
        'r.destination_longitude AS destination_longitude',
        'r.estimated_distance_meters AS estimated_distance_meters',
        'r.estimated_duration_seconds AS estimated_duration_seconds',
        'r.route_provider AS route_provider',
        'r.route_calculated_at AS route_calculated_at',
        'r.requested_assignment_pool AS requested_assignment_pool',
        'r.assigned_driver_id AS assigned_driver_id',
        'r.assigned_vehicle_id AS assigned_vehicle_id',
        'fa.id AS fa_id',
        'fa.driver_id AS fa_driver_id',
        'fa.vehicle_id AS fa_vehicle_id',
        'fa.assignment_method AS fa_method',
        'fa.assignment_strategy AS fa_strategy',
        'fa.status AS fa_status',
        'fa.assigned_at AS fa_assigned_at',
        'd.name AS d_name',
        'd.license_number AS d_license',
        'v.plate_number AS v_plate',
        'v.make AS v_make',
        'v.model AS v_model',
      ])
      .orderBy('r.scheduled_pickup_at', 'ASC')
      .getRawMany<BoardRow>();

    const TERMINAL = new Set(['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW']);
    const UNASSIGNED = new Set(['APPROVED', 'FOR_DISPATCH', 'DRIVER_DECLINED', 'REASSIGNMENT_REQUIRED']);
    const ASSIGNED = new Set(['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED']);
    const EN_ROUTE = new Set(['EN_ROUTE_TO_PICKUP']);
    const ON_TRIP = new Set(['ARRIVED_AT_PICKUP', 'PASSENGER_ONBOARD', 'IN_TRANSIT', 'DELAYED']);
    const RETURNING = new Set(['ARRIVED_AT_DESTINATION']);

    const summary = { total: 0, unassigned: 0, assigned: 0, active: 0, returning: 0, completed: 0, issues: 0 };
    const requests: any[] = [];

    for (const r of rows) {
      summary.total += 1;
      let bucket: string;
      if (UNASSIGNED.has(r.status)) { bucket = 'UNASSIGNED'; summary.unassigned += 1; }
      else if (ASSIGNED.has(r.status)) { bucket = 'ASSIGNED'; summary.assigned += 1; }
      else if (EN_ROUTE.has(r.status)) { bucket = 'EN_ROUTE'; summary.active += 1; }
      else if (ON_TRIP.has(r.status)) { bucket = 'ON_TRIP'; summary.active += 1; }
      else if (RETURNING.has(r.status)) { bucket = 'RETURNING'; summary.returning += 1; }
      else if (r.status === 'COMPLETED') { bucket = 'COMPLETED'; summary.completed += 1; }
      else { bucket = 'ISSUES'; summary.issues += 1; }

      const isDispatchable = UNASSIGNED.has(r.status) || ASSIGNED.has(r.status);
      const now = new Date();
      const serviceStartAt = r.scheduled_pickup_at;
      const serviceEndAt = r.expected_end_at ?? r.expected_return_at;
      const temporalBucket = !serviceEndAt ? 'PAST' :
        serviceStartAt > now ? 'UPCOMING' :
        serviceEndAt > now ? 'ACTIVE' : 'PAST';

      // R5B — operational exception & attention model
      const tripPhase = classifyTripPhase(r.status);
      const routeFreshness = classifyRouteFreshness(r.route_calculated_at);
      let attentionRequired = false;
      let attentionSeverity: string | null = null;
      let attentionCode: string | null = null;
      let attentionLabel: string | null = null;
      let attentionAction: string | null = null;

      // Derive attention from request state + assignment + route
      if (r.fa_id && r.fa_status === 'ACTIVE') {
        // Has active assignment — fine
      } else if (UNASSIGNED.has(r.status)) {
        attentionRequired = true;
        attentionSeverity = 'CRITICAL';
        attentionCode = 'NO_ELIGIBLE_PAIR';
        attentionLabel = 'Assignment Required';
        attentionAction = 'Auto Assign';
      } else if (r.status === 'DRIVER_DECLINED') {
        attentionRequired = true;
        attentionSeverity = 'WARNING';
        attentionCode = 'DRIVER_DECLINED';
        attentionLabel = 'Driver Declined';
        attentionAction = 'Redispatch';
      } else if (['CANCELLED', 'NO_SHOW', 'VEHICLE_BREAKDOWN', 'INCIDENT_REPORTED'].includes(r.status)) {
        attentionRequired = true;
        attentionSeverity = 'CRITICAL';
        attentionCode = 'ACTIVE_TRIP_RESOURCE_UNAVAILABLE';
        attentionLabel = r.status.replace(/_/g, ' ');
      }
      if (!attentionRequired && routeFreshness === 'STALE' && tripPhase !== 'POST_TRIP') {
        attentionRequired = true;
        attentionSeverity = 'INFO';
        attentionCode = 'ROUTE_STALE';
        attentionLabel = 'Route is stale';
        attentionAction = 'Refresh Route';
      }

      requests.push({
        id: r.request_id,
        requestNumber: r.request_number,
        title: r.title,
        purpose: r.purpose,
        status: r.status,
        priority: r.priority,
        tripType: r.trip_type,
        passengerCount: r.passenger_count,
        requestType: r.request_type,
        operationalBucket: bucket,
        temporalBucket,
        tripPhase,
        attention: {
          required: attentionRequired,
          severity: attentionSeverity,
          code: attentionCode,
          label: attentionLabel,
          action: attentionAction,
        },
        scheduledPickupAt: r.scheduled_pickup_at,
        expectedEndAt: r.expected_end_at,
        expectedReturnAt: r.expected_return_at,
        pickup: { address: r.pickup_address, latitude: r.pickup_latitude, longitude: r.pickup_longitude },
        destination: { address: r.destination_address, latitude: r.destination_latitude, longitude: r.destination_longitude },
        requestedAssignmentPool: r.requested_assignment_pool,
        route: r.route_provider ? {
          distanceMeters: r.estimated_distance_meters,
          durationSeconds: r.estimated_duration_seconds,
          provider: r.route_provider,
          calculatedAt: r.route_calculated_at,
          freshness: routeFreshness,
        } : null,
        assignment: r.fa_id ? {
          assignmentId: r.fa_id,
          driverId: r.fa_driver_id,
          vehicleId: r.fa_vehicle_id,
          method: r.fa_method,
          strategy: r.fa_strategy,
          status: r.fa_status,
          assignedAt: r.fa_assigned_at,
          driver: r.d_name ? { id: r.fa_driver_id, name: r.d_name, licenseNumber: r.d_license } : null,
          vehicle: r.v_plate ? { id: r.fa_vehicle_id, plateNumber: r.v_plate, make: r.v_make, model: r.v_model } : null,
        } : null,
      });
    }

    return { summary, requests };
  }

  private async transitionStatus(
    actor: { sub: string; email: string },
    requestId: string,
    newStatus: TransportationRequestStatus,
    remarks: string,
    source: string,
  ) {
    const request = await this.findById(requestId);

    if (!canTransition(request.status, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${request.status} to ${newStatus}`,
      );
    }

    const history = this.historyRepo.create({
      requestId,
      previousStatus: request.status,
      newStatus,
      changedByUserId: actor.sub,
      changedAt: new Date(),
      source: source as any,
      remarks,
    });

    await this.historyRepo.save(history);

    const now = new Date();
    switch (newStatus) {
      case 'SUBMITTED':
        request.submittedAt = now;
        break;
      case 'APPROVED':
        request.approvedAt = now;
        break;
      case 'CANCELLED':
        request.cancelledAt = now;
        break;
      case 'COMPLETED':
        request.completedAt = now;
        break;
    }

    request.status = newStatus;
    await this.requestRepo.save(request);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: `TRANSPORTATION_STATUS_${newStatus}`,
      targetId: requestId,
      targetType: 'transportation_request',
      metadata: { previousStatus: history.previousStatus, newStatus, remarks },
    });

    return this.findById(requestId);
  }
}
