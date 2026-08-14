import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TransportationRequest, AssignmentDiagnosticsResult } from "../types/transportation.types";
import { getAssignmentDiagnostics, calculateTransportationRoute, dispatchAuto, dispatchReassign, dispatchManual, dispatchOverride } from "../api/transportation.api";
import { AssignmentDiagnosticsPanel } from "./AssignmentDiagnosticsPanel";
import { useTheme } from "../../../hooks/useTheme";
import { AppModal } from "../../../components/ui/AppModal";
import { ROUTE_COLOR, PICKUP_COLOR, DESTINATION_COLOR, PICKUP_BG, DESTINATION_BG } from "../../maps/mapColors";

const LIGHT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
const LIGHT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DARK_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function markerDiv(label: string, color: string, bg: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid ${color};display:flex;align-items:center;justify-content:center;color:${color};font-weight:700;font-size:11px;">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function RouteSnapshotMap({ request }: { request: TransportationRequest }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [14.5995, 120.9842],
      zoom: 12,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: true,
    });

    const url = resolvedTheme === "dark" ? DARK_TILE_URL : LIGHT_TILE_URL;
    L.tileLayer(url, {
      attribution: resolvedTheme === "dark" ? DARK_ATTR : LIGHT_ATTR,
      maxZoom: 19,
    }).addTo(map);

    const markerLatLngs: [number, number][] = [];
    const routeLatLngs: [number, number][] = [];

    const pickup: [number, number] = [request.pickupLatitude, request.pickupLongitude];
    const destination: [number, number] = [request.destinationLatitude, request.destinationLongitude];
    markerLatLngs.push(pickup, destination);

    L.marker(pickup, { icon: markerDiv("A", PICKUP_COLOR, PICKUP_BG) }).addTo(map);
    L.marker(destination, { icon: markerDiv("B", DESTINATION_COLOR, DESTINATION_BG) }).addTo(map);

    const geometry = request.routeGeometry as { type: string; coordinates: [number, number][] } | null | undefined;
    if (geometry?.type === "LineString" && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 1) {
      geometry.coordinates.forEach((c) => {
        routeLatLngs.push([c[0], c[1]]);
      });
    } else {
      routeLatLngs.push(pickup, destination);
    }

    L.polyline(routeLatLngs, { color: ROUTE_COLOR, weight: 4, opacity: 0.85 }).addTo(map);

    const bounds = L.latLngBounds(markerLatLngs);
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });

    mapRef.current = map;

    const t = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, [request, resolvedTheme]);

  return <div ref={containerRef} className="h-56 w-full rounded-xl border" style={{ borderColor: "var(--color-border-subtle)" }} />;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function formatDistance(meters?: number): string {
  if (!meters || meters <= 0) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

type RequestDetailsModalProps = {
  request: TransportationRequest | null;
  onClose: () => void;
};

export function RequestDetailsModal({ request, onClose }: RequestDetailsModalProps) {
  const [diagnostics, setDiagnostics] = useState<AssignmentDiagnosticsResult | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const requestId = request?.id;

  const loadDiagnostics = useCallback(async (id: string) => {
    setDiagnosticsLoading(true);
    setDiagnosticsError(null);
    try {
      const result = await getAssignmentDiagnostics(id);
      setDiagnostics(result);
    } catch {
      setDiagnosticsError("Could not load assignment diagnostics");
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!requestId) return;
    void loadDiagnostics(requestId);
  }, [requestId, loadDiagnostics]);

  const handleCalculateRoute = useCallback(async () => {
    if (!requestId) return;
    setRouteBusy(true);
    try {
      await calculateTransportationRoute(requestId);
      await loadDiagnostics(requestId);
    } catch {
      setDiagnosticsError("Could not calculate the route");
    } finally {
      setRouteBusy(false);
    }
  }, [requestId, loadDiagnostics]);

  const handleDispatch = useCallback(async (
    action: 'auto' | 'reassign' | 'manual' | 'override',
    driverId?: string,
    vehicleId?: string,
    reason?: string,
  ) => {
    if (!requestId) return;
    setDispatchBusy(true);
    setDispatchMsg(null);
    try {
      let decision;
      switch (action) {
        case 'auto': decision = await dispatchAuto(requestId); break;
        case 'reassign': decision = await dispatchReassign(requestId, reason); break;
        case 'manual': decision = await dispatchManual(requestId, { driverId: driverId!, vehicleId: vehicleId! }); break;
        case 'override': decision = await dispatchOverride(requestId, { driverId: driverId!, vehicleId: vehicleId!, overrideReason: reason! }); break;
      }
      setDispatchMsg(decision.ok ? "Assignment successful" : `Failed: ${decision.failures?.join("; ") || decision.status}`);
      setShowOverride(false);
      setOverrideReason("");
      if (decision.ok) void loadDiagnostics(requestId);
    } catch (err) {
      setDispatchMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDispatchBusy(false);
    }
  }, [requestId, loadDiagnostics]);

  if (!request) return null;

  const requestorName = request.requestorName || request.requestedBy?.name;
  const requestorEmail = request.requestorEmail || request.requestedBy?.email;

  return (
    <AppModal open title={`${request.requestNumber} · ${request.title}`} onClose={onClose} width="720px">
      <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "var(--color-brand-soft)", color: "var(--color-brand)" }}>
              {request.status.replace(/_/g, " ")}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "var(--color-bg-surface-muted)", color: "var(--color-text-secondary)" }}>
              {request.priority}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "var(--color-bg-surface-muted)", color: "var(--color-text-secondary)" }}>
              {request.tripType.replace(/_/g, " ")}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "var(--color-bg-surface-muted)", color: "var(--color-text-secondary)" }}>
              {request.passengerCount} pax
            </span>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Requestor</p>
            <p className="mt-1 font-medium" style={{ color: "var(--color-text-primary)" }}>{requestorName || "—"}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{requestorEmail || "—"}</p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Schedule</p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-primary)" }}>
                {new Date(request.scheduledPickupAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              {request.expectedReturnAt ? (
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Return: {new Date(request.expectedReturnAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              ) : null}
              {request.expectedEndAt ? (
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Expected end: {new Date(request.expectedEndAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Route</p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-primary)" }}>{request.pickupAddress}</p>
              <p className="my-1 text-center text-[10px]" style={{ color: "var(--color-text-muted)" }}>↓</p>
              <p className="text-xs" style={{ color: "var(--color-text-primary)" }}>{request.destinationAddress}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-6 rounded-xl border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
            <div className="text-center">
              <p className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>{formatDuration(request.estimatedDurationSeconds ?? undefined)}</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Est. Travel</p>
            </div>
            <div className="h-8 w-px" style={{ background: "var(--color-border-default)" }} />
            <div className="text-center">
              <p className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>{formatDistance(request.estimatedDistanceMeters ?? undefined)}</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Distance</p>
            </div>
            <div className="h-8 w-px" style={{ background: "var(--color-border-default)" }} />
            <div className="text-center">
              <p className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>{request.contactNumber || "—"}</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Contact</p>
            </div>
          </div>

          <div className="mt-3">
            <RouteSnapshotMap request={request} />
          </div>

          {request.purpose ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Purpose</p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-primary)" }}>{request.purpose}</p>
            </div>
          ) : null}

          {request.specialInstructions ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Special Instructions</p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-primary)" }}>{request.specialInstructions}</p>
            </div>
          ) : null}

          {/* ─── R4: Dispatch Actions ─── */}
          {['APPROVED','FOR_DISPATCH','DRIVER_DECLINED','REASSIGNMENT_REQUIRED','DRIVER_ASSIGNED'].includes(request.status) && (
            <div className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Dispatch</p>
              {request.status === 'DRIVER_ASSIGNED' && request.assignedDriverId && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-surface-muted)" }}>
                  <span style={{ color: "var(--color-brand)" }}>Assigned</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>{request.assignedDriverId.slice(0,8)}… / {request.assignedVehicleId?.slice(0,8)}…</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {request.status !== 'DRIVER_ASSIGNED' ? (
                  <button onClick={() => handleDispatch('auto')} disabled={dispatchBusy}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ background: "var(--color-brand)", opacity: dispatchBusy ? 0.5 : 1 }}>
                    AUTO ASSIGN
                  </button>
                ) : (
                  <button onClick={() => handleDispatch('reassign', undefined, undefined, 'Manual reassign')} disabled={dispatchBusy}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={{ background: "var(--color-bg-warning)", color: "#fff", opacity: dispatchBusy ? 0.5 : 1 }}>
                    REASSIGN
                  </button>
                )}
                {diagnostics && diagnostics.drivers.eligible.length > 0 && diagnostics.vehicles.eligible.length > 0 && (
                  <button onClick={() => handleDispatch('manual', diagnostics.drivers.eligible[0].driverId, diagnostics.vehicles.eligible[0].vehicleId)} disabled={dispatchBusy}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={{ background: "var(--color-bg-surface-muted)", color: "var(--color-text-primary)", opacity: dispatchBusy ? 0.5 : 1 }}>
                    MANUAL (top pair)
                  </button>
                )}
                <button onClick={() => setShowOverride(!showOverride)} disabled={dispatchBusy}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "var(--color-bg-surface-muted)", color: "var(--color-text-primary)", opacity: dispatchBusy ? 0.5 : 1 }}>
                  OVERRIDE
                </button>
              </div>
              {showOverride && (
                <div className="mt-2 flex flex-col gap-2">
                  <input type="text" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Override reason (required)" className="rounded-lg border px-3 py-1.5 text-xs"
                    style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-surface)", color: "var(--color-text-primary)" }} />
                  <button onClick={() => {
                    const d = diagnostics;
                    if (d && d.drivers.eligible[0] && d.vehicles.eligible[0] && overrideReason.trim()) {
                      handleDispatch('override', d.drivers.eligible[0].driverId, d.vehicles.eligible[0].vehicleId, overrideReason);
                    }
                  }} disabled={dispatchBusy || !overrideReason.trim()}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold self-start"
                    style={{ background: "var(--color-bg-danger)", color: "#fff", opacity: !overrideReason.trim() || dispatchBusy ? 0.5 : 1 }}>
                    Confirm Override
                  </button>
                </div>
              )}
              {dispatchMsg && (
                <p className={`mt-2 text-xs ${dispatchMsg.includes('successful') ? '' : ''}`}
                  style={{ color: dispatchMsg.includes('successful') ? "var(--color-success)" : "var(--color-text-muted)" }}>
                  {dispatchMsg}
                </p>
              )}
            </div>
          )}

          <AssignmentDiagnosticsPanel
            result={diagnostics}
            loading={diagnosticsLoading}
            error={diagnosticsError}
            refreshingRoute={routeBusy}
            onCalculateRoute={handleCalculateRoute}
          />
    </AppModal>
  );
}