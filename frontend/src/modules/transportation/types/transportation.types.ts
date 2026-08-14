export type TransportationRequestStatus =
  | 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  | 'FOR_DISPATCH' | 'DRIVER_ASSIGNED' | 'DRIVER_ACCEPTED' | 'DRIVER_DECLINED'
  | 'REASSIGNMENT_REQUIRED' | 'EN_ROUTE_TO_PICKUP' | 'ARRIVED_AT_PICKUP'
  | 'PASSENGER_ONBOARD' | 'IN_TRANSIT' | 'ARRIVED_AT_DESTINATION' | 'DELAYED'
  | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'VEHICLE_BREAKDOWN' | 'INCIDENT_REPORTED';

export type TransportationRequestType = 'OFFICIAL_TRIP' | 'EMPLOYEE_TRANSPORT' | 'AIRPORT_TRANSFER' | 'DELIVERY' | 'EMERGENCY' | 'OTHER';

export type TransportationPriority = 'NORMAL' | 'URGENT' | 'EMERGENCY';

export type TransportationTripType = 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_STOP';

export type AssignmentStatus = 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'REASSIGNED' | 'CANCELLED';

export type PassengerType = 'EMPLOYEE' | 'GUEST' | 'VIP' | 'VENDOR';

export type TripEventType =
  | 'ASSIGNMENT_ACCEPTED' | 'ASSIGNMENT_DECLINED' | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP' | 'PASSENGER_ONBOARD' | 'TRIP_STARTED'
  | 'STOP_ARRIVAL' | 'DESTINATION_ARRIVAL' | 'TRIP_COMPLETED'
  | 'DELAY_REPORTED' | 'INCIDENT_REPORTED' | 'VEHICLE_PROBLEM_REPORTED';

export interface TransportStop {
  id: string;
  requestId: string;
  sequence: number;
  address: string;
  latitude: number;
  longitude: number;
  expectedArrivalAt?: string;
  purpose?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportPassenger {
  id: string;
  requestId: string;
  employeeId?: string;
  passengerName: string;
  contactNumber?: string;
  passengerType: PassengerType;
  notes?: string;
}

export interface TransportAssignment {
  id: string;
  requestId: string;
  driverId: string;
  driver?: { id: string; name: string; licenseNumber: string; contactNumber: string | null };
  vehicleId: string;
  vehicle?: { id: string; make: string; model: string; plateNumber: string; carType: string };
  assignedByUserId: string;
  assignedAt: string;
  status: AssignmentStatus;
  driverRespondedAt?: string;
  declineReason?: string;
  dispatchNotes?: string;
  expectedDepartureAt?: string;
  actualDepartureAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportStatusHistory {
  id: string;
  requestId: string;
  previousStatus?: TransportationRequestStatus;
  newStatus: TransportationRequestStatus;
  changedByUserId?: string;
  changedBy?: { id: string; name: string; email: string };
  changedAt: string;
  remarks?: string;
  latitude?: number;
  longitude?: number;
  source: 'REQUESTER' | 'APPROVER' | 'DISPATCHER' | 'DRIVER' | 'SYSTEM';
  createdAt: string;
}

export interface TransportTripEvent {
  id: string;
  requestId: string;
  assignmentId?: string;
  driverId?: string;
  driver?: { id: string; name: string };
  eventType: TripEventType;
  occurredAt: string;
  latitude?: number;
  longitude?: number;
  remarks?: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface TransportationRequest {
  id: string;
  requestNumber: string;
  requestType: TransportationRequestType;
  title: string;
  purpose?: string;
  priority: TransportationPriority;
  tripType: TransportationTripType;
  requestedByUserId: string;
  requestedBy?: { id: string; name: string; email: string; department?: string };
  requestorName?: string;
  requestorEmail?: string;
  departmentId?: string;
  costCenter?: string;
  contactNumber?: string;
  passengerCount: number;
  preferredVehicleType?: string;
  requestedAssignmentPool?: string;
  specialInstructions?: string;
  scheduledPickupAt: string;
  expectedReturnAt?: string;
  expectedEndAt?: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  estimatedDistanceMeters?: number;
  estimatedDurationSeconds?: number;
  routeGeometry?: Record<string, unknown>;
  routeProvider?: string;
  routeCalculatedAt?: string;
  status: TransportationRequestStatus;
  submittedAt?: string;
  approvedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  cancellationReason?: string;
  completionRemarks?: string;
  assignedDriverId?: string | null;
  assignedVehicleId?: string | null;
  stops?: TransportStop[];
  passengers?: TransportPassenger[];
  assignments?: TransportAssignment[];
  statusHistories?: TransportStatusHistory[];
  tripEvents?: TransportTripEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransportStopDto {
  sequence: number;
  address: string;
  latitude: number;
  longitude: number;
  expectedArrivalAt?: string;
  purpose?: string;
}

export interface CreateTransportPassengerDto {
  employeeId?: string;
  passengerName: string;
  contactNumber?: string;
  passengerType?: PassengerType;
  notes?: string;
}

export interface CreateTransportationRequestDto {
  requestType: TransportationRequestType;
  title: string;
  purpose?: string;
  priority?: TransportationPriority;
  requestorName?: string;
  requestorEmail?: string;
  tripType: TransportationTripType;
  departmentId?: string;
  costCenter?: string;
  contactNumber?: string;
  passengerCount: number;
  preferredVehicleType?: string;
  specialInstructions?: string;
  scheduledPickupAt: string;
  expectedReturnAt?: string;
  expectedEndAt?: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  estimatedDistanceMeters?: number;
  estimatedDurationSeconds?: number;
  routeGeometry?: Record<string, unknown>;
  stops?: CreateTransportStopDto[];
  passengers?: CreateTransportPassengerDto[];
}

export interface UpdateTransportationRequestDto {
  requestType?: string;
  requestorName?: string;
  requestorEmail?: string;
  title?: string;
  purpose?: string;
  priority?: string;
  tripType?: string;
  departmentId?: string;
  costCenter?: string;
  contactNumber?: string;
  passengerCount?: number;
  preferredVehicleType?: string;
  specialInstructions?: string;
  scheduledPickupAt?: string;
  expectedReturnAt?: string;
  expectedEndAt?: string;
  pickupAddress?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  destinationAddress?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  estimatedDistanceMeters?: number;
  estimatedDurationSeconds?: number;
  routeGeometry?: Record<string, unknown>;
}

export interface QueryTransportationRequestDto {
  search?: string;
  status?: string[];
  priority?: string[];
  requestType?: string[];
  tripType?: string[];
  requesterId?: string;
  departmentId?: string;
  driverId?: string;
  vehicleId?: string;
  assigned?: boolean;
  delayed?: boolean;
  activeOnly?: boolean;
  scheduledFrom?: string;
  scheduledTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MonitoringSummary {
  pendingApproval: number;
  forDispatch: number;
  unassigned: number;
  activeTrips: number;
  delayedTrips: number;
  completedToday: number;
  cancelledToday: number;
}

// ─── R3: Route enrichment + assignment diagnostics ───────────────────────────

export interface RouteSnapshotResult {
  distanceMeters: number;
  durationSeconds: number;
  provider: string;
  calculatedAt: string;
  geometry?: { type: string; coordinates: Array<[number, number]> };
}

export interface RouteDiagnosticSummary {
  status: "AVAILABLE" | "UNAVAILABLE";
  distanceMeters: number | null;
  durationSeconds: number | null;
  provider: string | null;
  calculatedAt: string | null;
}

export interface ConflictDiagnostic {
  requestId: string;
  requestNumber: string;
  startAt: string;
  endAt: string;
  source: 'FLEET' | 'LEGACY';
}

export interface AvailabilityDiagnostic {
  available: boolean;
  reasons: string[];
  warnings: string[];
  evaluatedStartAt: string;
  evaluatedEndAt: string;
}

export interface DriverDiagnostic {
  driverId: string;
  driverName: string;
  hasLiveLocation: boolean;
  eligible: boolean;
  availability: AvailabilityDiagnostic;
  score: number | null;
  scoreComponents: { workload: number; scheduleFit: number } | null;
  currentWorkload: number;
  warnings: string[];
  exclusionReasons: string[];
  conflict: ConflictDiagnostic | null;
}

export interface VehicleDiagnostic {
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  eligible: boolean;
  availability: AvailabilityDiagnostic;
  score: number | null;
  scoreComponents: { capacityFit: number; workload: number } | null;
  capacity: number;
  currentWorkload: number;
  warnings: string[];
  exclusionReasons: string[];
  conflict: ConflictDiagnostic | null;
}

export interface RequestDiagnosticSummary {
  id: string;
  requestNumber: string;
  serviceStartAt: string;
  serviceEndAt: string;
  serviceWindowComplete: boolean;
  passengerCount: number;
  currentAssignment: {
    driverId: string;
    vehicleId: string;
    status: string;
  } | null;
}

export interface AssignmentDiagnosticsResult {
  request: RequestDiagnosticSummary;
  route: RouteDiagnosticSummary;
  drivers: {
    eligible: DriverDiagnostic[];
    excluded: DriverDiagnostic[];
  };
  vehicles: {
    eligible: VehicleDiagnostic[];
    excluded: VehicleDiagnostic[];
  };
}

// ─── R4: Dispatch & Automatic Assignment Engine ────────────────────────────

export type AssignmentPool = 'GENERAL' | 'EXECUTIVE' | 'SPECIAL';
export type FleetAssignmentStatus = 'ACTIVE' | 'SUPERSEDED' | 'COMPLETED' | 'CANCELLED';

export interface FleetAssignment {
  id: string;
  transportationRequestId: string;
  driverId: string;
  vehicleId: string;
  driver?: { id: string; name: string; licenseNumber: string };
  vehicle?: { id: string; make: string; model: string; plateNumber: string };
  serviceStartAt: string;
  serviceEndAt: string;
  assignmentMethod: string;
  assignmentStrategy: string;
  status: FleetAssignmentStatus;
  assignedAt: string;
  assignedByUserId: string | null;
  supersededAt?: string | null;
  supersededByUserId?: string | null;
  supersedeReason?: string | null;
  overrideReason?: string | null;
  decisionMetadata?: Record<string, unknown> | null;
  dispatchNotes?: string | null;
  expectedDepartureAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchDecision {
  ok: boolean;
  status: string;
  assignment?: {
    id: string;
    requestId: string;
    driverId: string;
    vehicleId: string;
    serviceStartAt: string;
    serviceEndAt: string;
    assignmentMethod: string;
    assignmentStrategy: string;
    status: FleetAssignmentStatus;
    assignedAt: string;
  } | null;
  failCode?: string | null;
  failures?: string[];
  canOverride?: boolean;
  attempts?: number;
}

export interface DispatchSettings {
  autoDispatchEnabled: boolean;
  executiveReservationMode: boolean;
  defaultAssignmentStrategy: string;
  updatedByUserId: string | null;
  updatedAt: string;
}

export interface ExecutiveResourcesSummary {
  executiveReservationMode: boolean;
  autoDispatchEnabled: boolean;
  executiveDrivers: { total: number; eligible: number };
  executiveVehicles: { total: number; available: number };
  activeExecutiveRequests: number;
}
