import type {
  AssignmentDiagnosticsResult,
  ConflictDiagnostic,
  DriverDiagnostic,
  VehicleDiagnostic,
} from "../types/transportation.types";

const REASON_LABELS: Record<string, string> = {
  DRIVER_NOT_FOUND: "Driver not found",
  DRIVER_INACTIVE: "Inactive driver",
  AUTO_ASSIGN_DISABLED: "Auto-assign disabled",
  NO_DUTY_SCHEDULE: "No duty schedule for window",
  OUTSIDE_SHIFT: "Outside scheduled shift",
  REST_DAY: "Rest day",
  ON_LEAVE: "On leave",
  DRIVER_UNAVAILABLE: "Driver unavailable",
  LICENSE_EXPIRED: "License expired",
  VEHICLE_NOT_FOUND: "Vehicle not found",
  VEHICLE_INACTIVE: "Inactive vehicle",
  CAPACITY_INSUFFICIENT: "Capacity insufficient",
  VEHICLE_BLOCKED: "Blocked in the window",
  UNDER_MAINTENANCE: "Under maintenance",
  REGISTRATION_EXPIRED: "Registration expired",
  INSURANCE_EXPIRED: "Insurance expired",
  CODING_RESTRICTION: "Coding day restriction",
};

function reasonText(code: string, conflict: ConflictDiagnostic | null): string {
  if (code === "EXISTING_REQUEST_CONFLICT") {
    return conflict
      ? `Overlaps ${conflict.requestNumber}`
      : "Overlaps an existing request";
  }
  return REASON_LABELS[code] ?? code.replace(/_/g, " ");
}

function formatDistance(meters: number | null): string {
  if (!meters || meters <= 0) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function formatInstant(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </p>
  );
}

function ReasonChip({ label }: { label: string }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
      {label}
    </span>
  );
}

function WarningChip({ label }: { label: string }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--color-warning-soft, rgba(245,158,11,0.15))", color: "var(--color-warning, #d97706)" }}>
      {label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: "var(--color-brand-soft)", color: "var(--color-brand)" }}>
      {score}
    </div>
  );
}

function DriverRow({ diagnostic }: { diagnostic: DriverDiagnostic }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0" style={{ borderColor: "var(--color-border-subtle)" }}>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          {diagnostic.driverName}
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: diagnostic.hasLiveLocation ? "var(--color-success)" : "var(--color-text-muted)",
            }}
            title={diagnostic.hasLiveLocation ? "Live location available" : "No live location"}
          />
        </p>
        {diagnostic.scoreComponents ? (
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {diagnostic.currentWorkload} assignment{diagnostic.currentWorkload === 1 ? "" : "s"} / 30d · Workload {diagnostic.scoreComponents.workload} · Shift fit {diagnostic.scoreComponents.scheduleFit}
          </p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-1">
            {diagnostic.exclusionReasons.map((reason) => (
              <ReasonChip key={reason} label={reasonText(reason, diagnostic.conflict)} />
            ))}
            {diagnostic.warnings.map((warning) => (
              <WarningChip key={warning} label={`${reasonText(warning, null)} (soon)`} />
            ))}
          </div>
        )}
      </div>
      <ScoreBadge score={diagnostic.score} />
    </li>
  );
}

function VehicleRow({ diagnostic }: { diagnostic: VehicleDiagnostic }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0" style={{ borderColor: "var(--color-border-subtle)" }}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          {diagnostic.vehicleName}
        </p>
        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {diagnostic.plateNumber} · {diagnostic.capacity} seats
        </p>
        {diagnostic.scoreComponents ? (
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {diagnostic.currentWorkload} assignment{diagnostic.currentWorkload === 1 ? "" : "s"} / 30d · Capacity fit {diagnostic.scoreComponents.capacityFit} · Workload {diagnostic.scoreComponents.workload}
          </p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-1">
            {diagnostic.exclusionReasons.map((reason) => (
              <ReasonChip key={reason} label={reasonText(reason, diagnostic.conflict)} />
            ))}
            {diagnostic.warnings.map((warning) => (
              <WarningChip key={warning} label={`${reasonText(warning, null)} (soon)`} />
            ))}
          </div>
        )}
      </div>
      <ScoreBadge score={diagnostic.score} />
    </li>
  );
}

type AssignmentDiagnosticsPanelProps = {
  result: AssignmentDiagnosticsResult | null;
  loading: boolean;
  error: string | null;
  refreshingRoute: boolean;
  onCalculateRoute: () => void;
};

export function AssignmentDiagnosticsPanel({
  result,
  loading,
  error,
  refreshingRoute,
  onCalculateRoute,
}: AssignmentDiagnosticsPanelProps) {
  if (loading) {
    return (
      <div className="mt-3 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}>
        Loading assignment diagnostics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--color-danger-border)", background: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
        {error}
      </div>
    );
  }

  if (!result) return null;

  const windowComplete = result.request.serviceWindowComplete;

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border-subtle)" }}>
        <SectionTitle>Service Window</SectionTitle>
        <p className="mt-1 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          {formatInstant(result.request.serviceStartAt)} → {formatInstant(result.request.serviceEndAt)}
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {result.request.passengerCount} passengers
          {result.request.currentAssignment
            ? ` · Currently ${result.request.currentAssignment.status.replace(/_/g, " ").toLowerCase()}`
            : " · Not yet assigned"}
        </p>
        {!windowComplete ? (
          <p className="mt-2 text-xs" style={{ color: "var(--color-warning, #d97706)" }}>
            Service end is missing — add Expected End to enable diagnostics.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="flex items-center justify-between">
          <SectionTitle>Route Snapshot</SectionTitle>
          {result.route.status === "UNAVAILABLE" ? (
            <button
              type="button"
              onClick={onCalculateRoute}
              disabled={refreshingRoute}
              className="rounded-lg px-3 py-1 text-xs font-medium text-white transition disabled:opacity-60"
              style={{ background: "var(--color-brand)" }}
            >
              {refreshingRoute ? "Calculating…" : "Calculate Route"}
            </button>
          ) : null}
        </div>
        {result.route.status === "AVAILABLE" ? (
          <>
            <p className="mt-1 text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {formatDistance(result.route.distanceMeters)} · {formatDuration(result.route.durationSeconds)}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              via {result.route.provider}
              {result.route.calculatedAt
                ? ` · ${new Date(result.route.calculatedAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            No route snapshot yet — click Calculate Route.
          </p>
        )}
      </div>

      {windowComplete ? (
        <>
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <SectionTitle>Best Fit Drivers</SectionTitle>
            {result.drivers.eligible.length > 0 ? (
              <ul className="mt-1">
                {result.drivers.eligible.map((driver) => (
                  <DriverRow key={driver.driverId} diagnostic={driver} />
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                No eligible drivers
              </p>
            )}
            {result.drivers.excluded.length > 0 ? (
              <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--color-border-subtle)" }}>
                <SectionTitle>Excluded Drivers</SectionTitle>
                <ul className="mt-1">
                  {result.drivers.excluded.map((driver) => (
                    <DriverRow key={driver.driverId} diagnostic={driver} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <SectionTitle>Best Fit Vehicles</SectionTitle>
            {result.vehicles.eligible.length > 0 ? (
              <ul className="mt-1">
                {result.vehicles.eligible.map((vehicle) => (
                  <VehicleRow key={vehicle.vehicleId} diagnostic={vehicle} />
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                No eligible vehicles
              </p>
            )}
            {result.vehicles.excluded.length > 0 ? (
              <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--color-border-subtle)" }}>
                <SectionTitle>Excluded Vehicles</SectionTitle>
                <ul className="mt-1">
                  {result.vehicles.excluded.map((vehicle) => (
                    <VehicleRow key={vehicle.vehicleId} diagnostic={vehicle} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}