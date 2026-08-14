import { useState } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { BoardRequest } from '../../api/transportation.api';
import { getAssignmentDiagnostics } from '../../api/transportation.api';

export default function ReassignmentModal({
  request,
  onClose,
  onReassign,
  reassignPending,
}: {
  request: BoardRequest;
  onClose: () => void;
  onReassign: (reason: string) => void;
  reassignPending: boolean;
}) {
  const [reason, setReason] = useState('');

  const diagnostics = useQuery({
    queryKey: ['assignmentDiagnostics', request.id],
    queryFn: () => getAssignmentDiagnostics(request.id),
    staleTime: 30_000,
  });

  const eligibleDrivers = diagnostics.data?.drivers.eligible ?? [];
  const eligibleVehicles = diagnostics.data?.vehicles.eligible ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border shadow-xl"
        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}
        role="dialog"
        aria-label="Reassign transportation request"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--color-bg-surface-muted)' }}>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Reassign</div>
            <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{request.requestNumber}</div>
          </div>
          <button onClick={onClose} aria-label="Close reassignment dialog" style={{ color: 'var(--color-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-3">
          {/* Current assignment */}
          <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-bg-surface-muted)' }}>
            <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Current</div>
            {request.assignment ? (
              <div className="mt-0.5 flex items-center justify-between" style={{ color: 'var(--color-text-primary)' }}>
                <span className="font-semibold">{request.assignment.driver?.name ?? 'Driver'}</span>
                <span>{request.assignment.vehicle?.make} {request.assignment.vehicle?.model} · {request.assignment.vehicle?.plateNumber}</span>
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-muted)' }}>No assignment</div>
            )}
          </div>

          {diagnostics.isLoading && (
            <div className="py-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading available resources…</div>
          )}

          {diagnostics.data && (
            <>
              {/* Eligible drivers */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Available drivers</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{eligibleDrivers.length}</span>
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {eligibleDrivers.length === 0 && (
                    <div className="text-xs" style={{ color: 'var(--color-warning)' }}>No eligible drivers</div>
                  )}
                  {eligibleDrivers.map((d) => (
                    <div key={d.driverId} className="flex items-center justify-between rounded px-2 py-1 text-xs" style={{ background: 'var(--color-bg-surface-muted)' }}>
                      <span style={{ color: 'var(--color-text-primary)' }}>{d.driverName}</span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {d.currentWorkload} trips{d.score != null ? ` · ${d.score.toFixed(1)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligible vehicles */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Available vehicles</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{eligibleVehicles.length}</span>
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {eligibleVehicles.length === 0 && (
                    <div className="text-xs" style={{ color: 'var(--color-warning)' }}>No eligible vehicles</div>
                  )}
                  {eligibleVehicles.map((v) => (
                    <div key={v.vehicleId} className="flex items-center justify-between rounded px-2 py-1 text-xs" style={{ background: 'var(--color-bg-surface-muted)' }}>
                      <span style={{ color: 'var(--color-text-primary)' }}>{v.vehicleName} · {v.plateNumber}</span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{v.capacity} pax</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Availability is shown for reference. The dispatch engine performs final eligibility validation.
              </p>
            </>
          )}

          {diagnostics.isError && (
            <div
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
            >
              <div className="text-xs font-semibold">Failed to load available resources</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  Driver/vehicle availability could not be retrieved.
                </span>
                <button
                  onClick={() => diagnostics.refetch()}
                  className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: 'var(--color-bg-surface)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)' }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Driver unavailable"
              className="w-full rounded-lg border px-3 py-1.5 text-xs outline-none"
              style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{ background: 'var(--color-bg-surface-muted)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onReassign(reason)}
            disabled={reassignPending}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--color-warning)' }}
          >
            {reassignPending ? 'Reassigning…' : 'Auto Reassign'}
          </button>
        </div>
      </div>
    </div>
  );
}
