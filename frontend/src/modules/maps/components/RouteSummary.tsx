import type { RouteResult } from "../types/maps.types";
import { formatDistance, formatDuration } from "../utils/coordinates";
import { PICKUP_COLOR, DESTINATION_COLOR } from "../mapColors";

type RouteSummaryProps = {
  route: RouteResult | null;
  pickupAddress: string;
  destinationAddress: string;
  onConfirm?: () => void;
  onClear?: () => void;
  onSwap?: () => void;
  loading?: boolean;
  error?: string | null;
};

function EndpointDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
      style={{ background: `${color}22`, border: `1px solid ${color}`, color }}
    >
      {label}
    </span>
  );
}

export function RouteSummary({ route, pickupAddress, destinationAddress, onConfirm, onClear, onSwap, loading, error }: RouteSummaryProps) {
  if (!route && !error) return null;

  return (
    <section aria-label="Route summary" className="bsa-map-card p-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
        Route Overview
      </h3>

      <div className="mb-3 flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <EndpointDot color={PICKUP_COLOR} label="A" />
          <p className="bsa-map-address flex-1 text-xs" style={{ color: "var(--color-text-primary)" }} title={pickupAddress || undefined}>
            {pickupAddress || "Pickup not set"}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <EndpointDot color={DESTINATION_COLOR} label="B" />
          <p className="bsa-map-address flex-1 text-xs" style={{ color: "var(--color-text-primary)" }} title={destinationAddress || undefined}>
            {destinationAddress || "Destination not set"}
          </p>
        </div>
      </div>

      {error ? (
        <p role="status" aria-live="polite" className="mb-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--color-danger-border)", background: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      {route ? (
        <>
          <div className="mb-3 flex items-center justify-center gap-5">
            <div className="text-center">
              <p className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {formatDistance(route.distanceMeters)}
              </p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Distance</p>
            </div>
            <div className="h-9 w-px" style={{ background: "var(--color-border-default)" }} />
            <div className="text-center">
              <p className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {formatDuration(route.durationSeconds)}
              </p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>ETA</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {onSwap ? (
              <button
                type="button"
                onClick={onSwap}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-[var(--color-bg-surface-muted)]"
                style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
              >
                Swap
              </button>
            ) : null}
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-[var(--color-bg-surface-muted)]"
                style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
              >
                Clear Route
              </button>
            ) : null}
            {onConfirm ? (
              <button
                type="button"
                onClick={onConfirm}
                className="ml-auto rounded-lg px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
                style={{ background: "var(--color-brand)" }}
              >
                Confirm Route
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {loading ? (
        <p role="status" aria-live="polite" className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
          Calculating route...
        </p>
      ) : null}
    </section>
  );
}