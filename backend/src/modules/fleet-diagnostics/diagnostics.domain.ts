import type {
  AvailabilityResult,
  DriverAvailabilityReason,
  VehicleAvailabilityReason,
} from '../scheduling/domain/scheduling-domain';

export type RouteDiagnosticSummary = {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  distanceMeters: number | null;
  durationSeconds: number | null;
  provider: string | null;
  calculatedAt: string | null;
};

export type ConflictDiagnostic = {
  requestId: string;
  requestNumber: string;
  startAt: string;
  endAt: string;
  /**
   * R4 — where the conflict was observed:
   *   'FLEET'  → canonical fleet_assignments ACTIVE overlap (primary)
   *   'LEGACY' → pre-R4 transport_assignments OFFERED/ACCEPTED overlap
   */
  source: 'FLEET' | 'LEGACY';
};

export type DriverDiagnostic = {
  driverId: string;
  driverName: string;
  hasLiveLocation: boolean;
  eligible: boolean;
  availability: AvailabilityResult<DriverAvailabilityReason>;
  score: number | null;
  scoreComponents: { workload: number; scheduleFit: number } | null;
  currentWorkload: number;
  warnings: string[];
  exclusionReasons: string[];
  conflict: ConflictDiagnostic | null;
};

export type VehicleDiagnostic = {
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  eligible: boolean;
  availability: AvailabilityResult<VehicleAvailabilityReason>;
  score: number | null;
  scoreComponents: { capacityFit: number; workload: number } | null;
  capacity: number;
  currentWorkload: number;
  warnings: string[];
  exclusionReasons: string[];
  conflict: ConflictDiagnostic | null;
};

export type RequestDiagnosticSummary = {
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
};

export type AssignmentDiagnosticsResult = {
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
};
