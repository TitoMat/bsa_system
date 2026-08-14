import { RefreshCw, X } from 'lucide-react';
import type { BoardRequest } from '../../api/transportation.api';
import { PICKUP_COLOR, DESTINATION_COLOR, ROUTE_COLOR } from '../../../maps/mapColors';
import { formatDistance, formatDuration, formatTime } from '../../utils/boardFormatters';

const BUCKET_COLOR: Record<string, string> = {
  UNASSIGNED: 'var(--color-danger)',
  ASSIGNED: 'var(--color-brand)',
  EN_ROUTE: 'var(--color-info)',
  ON_TRIP: 'var(--color-info)',
  RETURNING: 'var(--color-info)',
  COMPLETED: 'var(--color-success)',
  ISSUES: 'var(--color-warning)',
};

function FreshnessBadge({ freshness }: { freshness: string | undefined }) {
  const style =
    freshness === 'STALE'
      ? { background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }
      : freshness === 'AGING'
        ? { background: 'var(--color-info-soft)', color: 'var(--color-info)' }
        : { background: 'var(--color-success-soft)', color: 'var(--color-success)' };
  return (
    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={style}>
      {freshness === 'UNAVAILABLE' || !freshness ? 'NO ROUTE' : freshness}
    </span>
  );
}

export default function TripDetailPanel({
  request,
  onClose,
  onReassign,
  onAutoAssign,
  onAutoRedispatch,
  onRefreshRoute,
  autoAssignPending,
  reassignPending,
  refreshRoutePending,
  dispatchMsg,
}: {
  request: BoardRequest;
  onClose: () => void;
  onReassign: () => void;
  onAutoAssign: () => void;
  onAutoRedispatch: () => void;
  onRefreshRoute: () => void;
  autoAssignPending: boolean;
  reassignPending: boolean;
  refreshRoutePending: boolean;
  dispatchMsg: string | null;
}) {
  const attn = request.attention;
  const bucketColor = BUCKET_COLOR[request.operationalBucket] ?? 'var(--color-text-secondary)';
  const bucketLabel = request.operationalBucket.replace(/_/g, ' ');
  const isUnassigned = request.operationalBucket === 'UNASSIGNED';
  const isDriverDeclined = attn.code === 'DRIVER_DECLINED';

  return (
    <div
      className="absolute bottom-4 right-4 z-20 w-[260px] overflow-hidden rounded-xl border shadow-lg sm:w-[300px]"
      style={{
        background: 'var(--color-bg-surface)',
        borderColor: 'var(--color-border-default)',
        maxHeight: 'calc(100% - 2rem)',
      }}
      role="dialog"
      aria-label="Trip details"
    >
      <div className="flex max-h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: 'var(--color-bg-surface-muted)' }}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: bucketColor }} />
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase leading-tight" style={{ color: bucketColor }}>{bucketLabel}</div>
              <div className="truncate text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{request.requestNumber}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close trip details" className="shrink-0" style={{ color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-3 py-3">
          {/* Summary */}
          <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            <span>{request.passengerCount} pax</span>
            <span>·</span>
            <span>{request.requestType.replace(/_/g, ' ')}</span>
            <span>·</span>
            <span>{request.tripType.replace(/_/g, ' ')}</span>
            <span>·</span>
            <span style={{ color: request.priority === 'EMERGENCY' ? 'var(--color-danger)' : request.priority === 'URGENT' ? 'var(--color-warning)' : undefined }}>
              {request.priority}
            </span>
          </div>

          {/* Pickup / Dropoff */}
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: PICKUP_COLOR }} />
              <span className="truncate">{request.pickup.address}</span>
            </div>
            <div className="text-[10px]" style={{ paddingLeft: 10, color: 'var(--color-text-muted)' }}>↓ {formatTime(request.scheduledPickupAt)}</div>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: DESTINATION_COLOR }} />
              <span className="truncate">{request.destination.address}</span>
            </div>
          </div>

          {/* Route summary */}
          <div className="rounded-lg px-2.5 py-2 text-[10px]" style={{ background: 'var(--color-bg-surface-muted)' }}>
            {request.route ? (
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: ROUTE_COLOR, marginRight: 6 }} />
                  {formatDistance(request.route.distanceMeters)} · {formatDuration(request.route.durationSeconds)} ETA
                </span>
                <FreshnessBadge freshness={request.route.freshness} />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--color-warning)' }}>Route unavailable</span>
                <FreshnessBadge freshness="UNAVAILABLE" />
              </div>
            )}
            {request.route && (
              <div className="mt-1 text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                via {request.route.provider} · {formatTime(request.route.calculatedAt)}
              </div>
            )}
          </div>

          {/* Assignment */}
          {request.assignment ? (
            <div className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {request.assignment.driver?.name ?? 'Driver'}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {request.assignment.vehicle?.make ?? ''} {request.assignment.vehicle?.model ?? ''} · {request.assignment.vehicle?.plateNumber ?? ''}
                </span>
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {request.assignment.method.replace(/_/g, ' ')} · {request.assignment.strategy.replace(/_/g, ' ')}
                {request.assignment.assignedAt ? ` · ${formatTime(request.assignment.assignedAt)}` : ''}
              </div>
            </div>
          ) : (
            <div className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>No assignment yet</div>
          )}

          {/* Attention */}
          {attn.required && (
            <div className="rounded-lg px-3 py-2 text-xs font-semibold" style={{
              background: attn.severity === 'CRITICAL' ? 'var(--color-danger-soft)' : 'var(--color-warning-soft)',
              color: attn.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)',
            }}>
              {attn.severity === 'CRITICAL' ? '⚠ ' : 'ℹ '}
              {attn.label}
              {isDriverDeclined ? ' — Redispatch required' : ''}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {isUnassigned && !isDriverDeclined && (
              <button
                onClick={onAutoAssign}
                disabled={autoAssignPending}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--color-brand)' }}
              >
                {autoAssignPending ? 'Assigning…' : 'AUTO ASSIGN'}
              </button>
            )}
            {request.assignment && (
              <button
                onClick={onReassign}
                disabled={reassignPending}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--color-warning)' }}
              >
                REASSIGN
              </button>
            )}
            {isDriverDeclined && (
              <button
                onClick={onAutoRedispatch}
                disabled={reassignPending}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--color-warning)' }}
              >
                AUTO REDISPATCH
              </button>
            )}
            <button
              onClick={onRefreshRoute}
              disabled={refreshRoutePending}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              style={{ background: 'var(--color-bg-surface-muted)', color: 'var(--color-text-primary)' }}
              aria-label="Refresh route"
            >
              <RefreshCw size={12} className={refreshRoutePending ? 'animate-spin' : ''} />
              {refreshRoutePending ? 'Refreshing…' : 'REFRESH ROUTE'}
            </button>
          </div>

          {dispatchMsg && (
            <p className="text-xs" style={{ color: dispatchMsg.includes('successful') || dispatchMsg.includes('Route refreshed') ? 'var(--color-success)' : dispatchMsg.includes('failed') ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
              {dispatchMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
