import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFleetAnalytics } from '../../transportation/api/transportation.api';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
] as const;

export default function FleetInsightsPage() {
  const [period, setPeriod] = useState<string>('30d');
  const [pool, setPool] = useState<string>('');

  const analytics = useQuery({
    queryKey: ['fleetAnalytics', period, pool],
    queryFn: () => getFleetAnalytics({ period: period as any, assignmentPool: pool || undefined }),
  });

  const data = analytics.data;

  return (
    <div style={{ color: 'var(--color-text-primary)' }}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Fleet Insights</h1>
        <div className="flex items-center gap-3">
          <select value={pool} onChange={(e) => setPool(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}>
            <option value="">All Pools</option>
            <option value="GENERAL">General</option>
            <option value="EXECUTIVE">Executive</option>
            <option value="SPECIAL">Special</option>
          </select>
          <div className="flex rounded-lg border" style={{ borderColor: 'var(--color-border-default)' }}>
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setPeriod(opt.value)}
                className="px-3 py-1.5 text-sm font-medium first:rounded-l-lg last:rounded-r-lg"
                style={{
                  background: period === opt.value ? 'var(--color-brand)' : 'var(--color-bg-surface)',
                  color: period === opt.value ? '#fff' : 'var(--color-text-secondary)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {analytics.isLoading && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading insights...</p>}
      {analytics.isError && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>Fleet insights temporarily unavailable.</p>}

      {data && (
        <>
          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {[
              { label: 'Requests', value: data.summary.totalRequests },
              { label: 'Assignments', value: data.summary.totalAssignments },
              { label: 'Completed', value: data.summary.completedTrips },
              { label: 'Active', value: data.summary.activeTrips },
              { label: 'Unassigned', value: data.summary.unassignedRequests },
              { label: 'Redispatches', value: data.summary.redispatchCount },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Dispatch Mix */}
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
              <h2 className="mb-3 text-sm font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>Dispatch Mix</h2>
              <div className="flex gap-4">
                {Object.entries(data.dispatch).map(([key, count]) => (
                  <div key={key} className="text-center">
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>{key}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Route Health */}
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
              <h2 className="mb-3 text-sm font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>Route Health</h2>
              <div className="flex gap-4">
                {Object.entries(data.routeHealth).map(([key, count]) => (
                  <div key={key} className="text-center">
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>{key}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fairness by Pool */}
          {Object.entries(data.fairness.byPool).map(([poolKey, fairness]) => (
            <div key={poolKey} className="mt-6 rounded-xl border p-4" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{poolKey} Pool Fairness</h2>
                <span className="rounded-full px-2 py-0.5 text-xs" style={{
                  background: fairness.spread <= 1 ? 'var(--color-success-soft)' : fairness.spread <= 3 ? 'var(--color-warning-soft)' : 'var(--color-danger-soft)',
                  color: fairness.spread <= 1 ? 'var(--color-success)' : fairness.spread <= 3 ? 'var(--color-warning)' : 'var(--color-danger)',
                }}>
                  Spread: {fairness.spread}
                </span>
              </div>
              <div className="flex gap-6 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Min: {fairness.minAssignments}</span>
                <span>Max: {fairness.maxAssignments}</span>
                <span>Avg: {fairness.averageAssignments}</span>
                <span>{fairness.driverCount} drivers</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {fairness.drivers.map((d) => {
                  const pct = fairness.maxAssignments > 0 ? (d.assignmentCount / fairness.maxAssignments) * 100 : 0;
                  return (
                    <div key={d.id} className="rounded-lg border px-3 py-2 text-xs min-w-[120px]" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{d.name}</p>
                      <p style={{ color: 'var(--color-text-secondary)' }}>{d.assignmentCount} trips</p>
                      <div className="mt-1 h-1 rounded-full" style={{ background: 'var(--color-bg-surface-muted)' }}>
                        <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: 'var(--color-brand)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Driver Workload */}
          <div className="mt-6 rounded-xl border" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Pool</th>
                    <th>Trips</th>
                    <th>Hours</th>
                    <th>Auto</th>
                    <th>Manual</th>
                    <th>Override</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.drivers.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>No driver activity for this period</td></tr>
                  ) : (
                    data.drivers.sort((a, b) => b.tripCount - a.tripCount).map((d) => (
                      <tr key={d.driverId}>
                        <td className="font-medium">{d.driverName}</td>
                        <td><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>{d.assignmentPool}</span></td>
                        <td>{d.tripCount}</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{d.scheduledServiceHours}h</td>
                        <td>{d.automaticAssignmentCount}</td>
                        <td>{d.manualAssignmentCount}</td>
                        <td>{d.overrideAssignmentCount}</td>
                        <td>{d.activeAssignmentCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vehicle Utilization */}
          <div className="mt-6 rounded-xl border" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Plate</th>
                    <th>Pool</th>
                    <th>Trips</th>
                    <th>Hours</th>
                    <th>Auto</th>
                    <th>Manual</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehicles.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>No vehicle activity for this period</td></tr>
                  ) : (
                    data.vehicles.sort((a, b) => b.tripCount - a.tripCount).map((v) => (
                      <tr key={v.vehicleId}>
                        <td className="font-medium">{v.vehicleName}</td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{v.plateNumber}</td>
                        <td><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>{v.assignmentPool}</span></td>
                        <td>{v.tripCount}</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{v.scheduledServiceHours}h</td>
                        <td>{v.automaticAssignmentCount}</td>
                        <td>{v.manualAssignmentCount}</td>
                        <td>{v.activeAssignmentCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Exceptions */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(data.exceptions).filter(([, v]) => v > 0).map(([key, count]) => (
              <div key={key} className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
                <p className="text-lg font-bold" style={{ color: key === 'DRIVER_DECLINED' ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>{count}</p>
                <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>{key.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
