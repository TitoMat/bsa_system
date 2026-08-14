import { api } from '../../../api/axios';
import type {
  TransportationRequest,
  CreateTransportationRequestDto,
  UpdateTransportationRequestDto,
  QueryTransportationRequestDto,
  PaginatedResponse,
  MonitoringSummary,
  TransportAssignment,
  TransportTripEvent,
  TransportStatusHistory,
  RouteSnapshotResult,
  AssignmentDiagnosticsResult,
  DispatchDecision,
  FleetAssignment,
  DispatchSettings,
  ExecutiveResourcesSummary,
} from '../types/transportation.types';

export async function createTransportationRequest(data: CreateTransportationRequestDto): Promise<TransportationRequest> {
  const response = await api.post('/transportation-requests', data);
  return response.data as TransportationRequest;
}

export async function getTransportationRequests(query: QueryTransportationRequestDto): Promise<PaginatedResponse<TransportationRequest>> {
  const response = await api.get('/transportation-requests', { params: query });
  return response.data as PaginatedResponse<TransportationRequest>;
}

export async function getTransportationRequest(id: string): Promise<TransportationRequest> {
  const response = await api.get(`/transportation-requests/${id}`);
  return response.data as TransportationRequest;
}

export async function updateTransportationRequest(id: string, data: UpdateTransportationRequestDto): Promise<TransportationRequest> {
  const response = await api.patch(`/transportation-requests/${id}`, data);
  return response.data as TransportationRequest;
}

export async function submitTransportationRequest(id: string): Promise<TransportationRequest> {
  const response = await api.post(`/transportation-requests/${id}/submit`);
  return response.data as TransportationRequest;
}

export async function approveTransportationRequest(id: string, remarks?: string): Promise<TransportationRequest> {
  const response = await api.post(`/transportation-requests/${id}/approve`, { remarks });
  return response.data as TransportationRequest;
}

export async function rejectTransportationRequest(id: string, remarks: string): Promise<TransportationRequest> {
  const response = await api.post(`/transportation-requests/${id}/reject`, { remarks });
  return response.data as TransportationRequest;
}

export async function cancelTransportationRequest(id: string, reason: string): Promise<TransportationRequest> {
  const response = await api.post(`/transportation-requests/${id}/cancel`, { reason });
  return response.data as TransportationRequest;
}

export async function completeTransportationRequest(id: string, remarks?: string): Promise<TransportationRequest> {
  const response = await api.post(`/transportation-requests/${id}/complete`, { remarks });
  return response.data as TransportationRequest;
}

export async function getAssignments(requestId: string): Promise<TransportAssignment[]> {
  const response = await api.get(`/transportation-requests/${requestId}/assignments`);
  return response.data as TransportAssignment[];
}

export async function assignDriverVehicle(requestId: string, data: { driverId: string; vehicleId: string; dispatchNotes?: string; expectedDepartureAt?: string }): Promise<TransportationRequest> {
  const response = await api.post(`/transportation-requests/${requestId}/assignments`, data);
  return response.data as TransportationRequest;
}

export async function driverAcceptAssignment(requestId: string, assignmentId: string): Promise<TransportationRequest> {
  const response = await api.post(`/transportation-requests/${requestId}/assignments/${assignmentId}/accept`);
  return response.data as TransportationRequest;
}

export async function driverDeclineAssignment(requestId: string, assignmentId: string, reason: string): Promise<TransportationRequest> {
  const response = await api.post(`/transportation-requests/${requestId}/assignments/${assignmentId}/decline`, { reason });
  return response.data as TransportationRequest;
}

export async function reassignRequest(requestId: string): Promise<TransportationRequest> {
  const response = await api.post(`/transportation-requests/${requestId}/reassign`);
  return response.data as TransportationRequest;
}

export async function getTripEvents(requestId: string): Promise<TransportTripEvent[]> {
  const response = await api.get(`/transportation-requests/${requestId}/events`);
  return response.data as TransportTripEvent[];
}

export async function createTripEvent(requestId: string, data: { eventType: string; remarks?: string; latitude?: number; longitude?: number }): Promise<TransportTripEvent> {
  const response = await api.post(`/transportation-requests/${requestId}/events`, data);
  return response.data as TransportTripEvent;
}

export async function getStatusHistory(requestId: string): Promise<TransportStatusHistory[]> {
  const response = await api.get(`/transportation-requests/${requestId}/status-history`);
  return response.data as TransportStatusHistory[];
}

export async function getMonitoringSummary(): Promise<MonitoringSummary> {
  const response = await api.get('/transportation-requests/monitoring/summary');
  return response.data as MonitoringSummary;
}

export async function calculateTransportationRoute(
  id: string,
): Promise<RouteSnapshotResult> {
  const response = await api.post(`/transportation-requests/${id}/route/calculate`);
  return response.data as RouteSnapshotResult;
}

export async function getAssignmentDiagnostics(
  id: string,
): Promise<AssignmentDiagnosticsResult> {
  const response = await api.get(
    `/transportation-requests/${id}/assignment-diagnostics`,
  );
  return response.data as AssignmentDiagnosticsResult;
}

// ─── R4: Dispatch & Automatic Assignment Engine ────────────────────────────

export async function dispatchAuto(requestId: string): Promise<DispatchDecision> {
  const response = await api.post(`/transportation-requests/${requestId}/dispatch/auto`);
  return response.data as DispatchDecision;
}

export async function dispatchManual(
  requestId: string,
  data: { driverId: string; vehicleId: string; dispatchNotes?: string; expectedDepartureAt?: string },
): Promise<DispatchDecision> {
  const response = await api.post(`/transportation-requests/${requestId}/dispatch/manual`, data);
  return response.data as DispatchDecision;
}

export async function dispatchOverride(
  requestId: string,
  data: { driverId: string; vehicleId: string; overrideReason: string; assignmentStrategy?: string },
): Promise<DispatchDecision> {
  const response = await api.post(`/transportation-requests/${requestId}/dispatch/override`, data);
  return response.data as DispatchDecision;
}

export async function dispatchReassign(
  requestId: string,
  reason?: string,
): Promise<DispatchDecision> {
  const response = await api.post(`/transportation-requests/${requestId}/dispatch/reassign`, { reason });
  return response.data as DispatchDecision;
}

export async function getFleetAssignments(requestId: string): Promise<FleetAssignment[]> {
  const response = await api.get(`/transportation-requests/${requestId}/dispatch/assignments`);
  return response.data as FleetAssignment[];
}

export async function getDispatchSettings(): Promise<DispatchSettings> {
  const response = await api.get('/fleet/dispatch-settings');
  return response.data as DispatchSettings;
}

export async function updateDispatchSettings(
  data: { autoDispatchEnabled?: boolean; executiveReservationMode?: boolean; defaultAssignmentStrategy?: string },
): Promise<DispatchSettings> {
  const response = await api.patch('/fleet/dispatch-settings', data);
  return response.data as DispatchSettings;
}

export async function getExecutiveResources(): Promise<ExecutiveResourcesSummary> {
  const response = await api.get('/fleet/dispatch/executive-resources');
  return response.data as ExecutiveResourcesSummary;
}

// ─── R5A: Dispatch Board read-model ─────────────────────────────────────────

export interface BoardRequest {
  id: string;
  requestNumber: string;
  title: string;
  purpose: string | null;
  status: string;
  priority: string;
  tripType: string;
  passengerCount: number;
  requestType: string;
  operationalBucket: string;
  temporalBucket: string;
  tripPhase: string;
  attention: {
    required: boolean;
    severity: string | null;
    code: string | null;
    label: string | null;
    action: string | null;
  };
  scheduledPickupAt: string;
  expectedEndAt: string | null;
  expectedReturnAt: string | null;
  pickup: { address: string; latitude: number; longitude: number };
  destination: { address: string; latitude: number; longitude: number };
  requestedAssignmentPool: string;
  route: {
    distanceMeters: number;
    durationSeconds: number;
    provider: string;
    calculatedAt: string;
    freshness: string;
  } | null;
  assignment: {
    assignmentId: string;
    driverId: string | null;
    vehicleId: string | null;
    method: string;
    strategy: string;
    status: string;
    assignedAt: string;
    driver: { id: string; name: string; licenseNumber: string } | null;
    vehicle: { id: string; plateNumber: string; make: string; model: string } | null;
  } | null;
}

export interface BoardSummary {
  total: number;
  unassigned: number;
  assigned: number;
  active: number;
  returning: number;
  completed: number;
  issues: number;
}

export interface BoardResponse {
  summary: BoardSummary;
  requests: BoardRequest[];
}

export async function getMonitoringBoard(): Promise<BoardResponse> {
  const response = await api.get('/transportation-requests/monitoring/board');
  return response.data as BoardResponse;
}

// ─── R6: Fleet Map State ───────────────────────────────────────────────────

export interface FleetMapVehicleLocationDto {
  latitude: number;
  longitude: number;
}

export interface FleetMapAssignmentDto {
  id: string;
  requestId: string;
  requestNumber: string | null;
  driverId: string;
  driverName: string | null;
  requestStatus: string;
  scheduledPickupAt: string | null;
}

export interface FleetMapVehicleDto {
  id: string;
  plateNumber: string | null;
  make: string | null;
  model: string | null;
  vehicleStatus: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  location: FleetMapVehicleLocationDto | null;
  locationStatus: 'AVAILABLE' | 'UNAVAILABLE';
  locationSource: 'DRIVER_LOCATION' | null;
  locationUpdatedAt: string | null;
  assignment: FleetMapAssignmentDto | null;
}

export interface FleetMapStateSummaryDto {
  totalVehicles: number;
  mappedVehicles: number;
  unlocatedVehicles: number;
}

export interface FleetMapStateResponse {
  vehicles: FleetMapVehicleDto[];
  summary: FleetMapStateSummaryDto;
  generatedAt: string;
}

export async function getFleetMapState(): Promise<FleetMapStateResponse> {
  const response = await api.get('/transportation-requests/monitoring/map-state');
  return response.data as FleetMapStateResponse;
}

// ─── R5C: Fleet Operations Analytics ────────────────────────────────────────

export interface AnalyticsQuery {
  period?: 'today' | '7d' | '30d' | 'custom';
  startAt?: string;
  endAt?: string;
  assignmentPool?: string;
}

export interface DriverWorkloadRow {
  driverId: string;
  driverName: string;
  assignmentPool: string;
  tripCount: number;
  activeAssignmentCount: number;
  scheduledServiceHours: number;
  automaticAssignmentCount: number;
  manualAssignmentCount: number;
  overrideAssignmentCount: number;
  reassignmentCount: number;
}

export interface VehicleUtilizationRow {
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  assignmentPool: string;
  tripCount: number;
  activeAssignmentCount: number;
  scheduledServiceHours: number;
  automaticAssignmentCount: number;
  manualAssignmentCount: number;
  overrideAssignmentCount: number;
}

export interface FairnessView {
  pool: string;
  driverCount: number;
  minAssignments: number;
  maxAssignments: number;
  averageAssignments: number;
  spread: number;
  drivers: Array<{ id: string; name: string; assignmentCount: number }>;
}

export interface AnalyticsResponse {
  period: { startAt: string; endAt: string };
  summary: {
    totalRequests: number;
    totalAssignments: number;
    completedTrips: number;
    activeTrips: number;
    unassignedRequests: number;
    redispatchCount: number;
  };
  dispatch: { automatic: number; manual: number; override: number; reassignment: number };
  drivers: DriverWorkloadRow[];
  vehicles: VehicleUtilizationRow[];
  fairness: { byPool: Record<string, FairnessView> };
  exceptions: Record<string, number>;
  routeHealth: Record<string, number>;
}

export async function getFleetAnalytics(query: AnalyticsQuery = {}): Promise<AnalyticsResponse> {
  const response = await api.get('/fleet/analytics/operations', { params: query });
  return response.data as AnalyticsResponse;
}
