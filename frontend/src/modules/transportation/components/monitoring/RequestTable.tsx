import type { BoardRequest } from '../../api/transportation.api';
import { formatTime } from '../../utils/boardFormatters';

export default function RequestTable({
  requests,
  selectedId,
  onSelect,
}: {
  requests: BoardRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="sticky top-0 z-10" style={{ background: 'var(--table-header-bg)', color: 'var(--table-header-text)' }}>
          <th className="px-3 py-2 font-semibold uppercase text-[10px]">Time</th>
          <th className="px-3 py-2 font-semibold uppercase text-[10px]">Request</th>
          <th className="px-3 py-2 font-semibold uppercase text-[10px]">Route</th>
          <th className="px-3 py-2 font-semibold uppercase text-[10px]">Pax</th>
          <th className="px-3 py-2 font-semibold uppercase text-[10px]">Status</th>
          <th className="px-3 py-2 font-semibold uppercase text-[10px]">Assignment</th>
          <th className="px-3 py-2 font-semibold uppercase text-[10px]">Priority</th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => {
          const attn = r.attention;
          const selected = r.id === selectedId;
          return (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="cursor-pointer transition"
              style={{
                background: selected ? 'var(--table-row-selected-bg)' : undefined,
                borderBottom: '1px solid var(--table-divider)',
              }}
            >
              <td className="px-3 py-2 whitespace-nowrap font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {formatTime(r.scheduledPickupAt)}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.requestNumber}</div>
                <div className="truncate max-w-[220px]" style={{ color: 'var(--color-text-muted)' }}>{r.title || r.purpose}</div>
              </td>
              <td className="px-3 py-2 max-w-[220px]">
                <div className="truncate" style={{ color: 'var(--color-text-secondary)' }}>{r.pickup.address}</div>
                <div className="truncate text-[10px]" style={{ color: 'var(--color-text-muted)' }}>→ {r.destination.address}</div>
              </td>
              <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{r.passengerCount}</td>
              <td className="px-3 py-2">
                {r.assignment ? (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
                    {r.operationalBucket.replace(/_/g, ' ')}
                  </span>
                ) : attn.required ? (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase whitespace-nowrap" style={{
                    background: attn.severity === 'CRITICAL' ? 'var(--color-danger-soft)' : 'var(--color-warning-soft)',
                    color: attn.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)',
                  }}>
                    {attn.label ?? 'ATTENTION'}
                  </span>
                ) : (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--color-bg-surface-muted)', color: 'var(--color-text-secondary)' }}>
                    {r.operationalBucket.replace(/_/g, ' ')}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {r.assignment ? (
                  <div>
                    <div style={{ color: 'var(--color-text-primary)' }}>{r.assignment.driver?.name ?? '—'}</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{r.assignment.vehicle?.plateNumber ?? ''}</div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                  background: r.priority === 'EMERGENCY' ? 'var(--color-danger-soft)' : r.priority === 'URGENT' ? 'var(--color-warning-soft)' : 'var(--color-bg-surface-muted)',
                  color: r.priority === 'EMERGENCY' ? 'var(--color-danger)' : r.priority === 'URGENT' ? 'var(--color-warning)' : 'var(--color-text-muted)',
                }}>
                  {r.priority}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
