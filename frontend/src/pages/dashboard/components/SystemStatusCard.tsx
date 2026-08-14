// frontend/src/pages/dashboard/components/SystemStatusCard.tsx
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { fetchSystemStatus } from "../dashboard.api";
import { useAuthStore } from "../../../features/auth/useAuthStore";
import { hasPermission } from "../../../lib/permissions";
import { Badge } from "../../../shared/components";
import { DashboardCard, WidgetErrorState, WidgetSkeleton } from "./DashboardCard";

export function SystemStatusCard() {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewDashboard = hasPermission(permissions, "dashboard.view");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-system-status"],
    queryFn: ({ signal }) => fetchSystemStatus(signal),
    refetchInterval: 60_000,
    enabled: canViewDashboard,
  });

  if (!canViewDashboard) return null;

  return (
    <DashboardCard
      icon={Activity}
      title="System Status"
      flush
      footer={
        data
          ? `Last checked ${new Date(data.checkedAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}`
          : "Refreshes automatically every minute"
      }
    >
      {isLoading ? (
        <div className="p-4">
          <WidgetSkeleton rows={3} />
        </div>
      ) : isError ? (
        <div className="p-4">
          <WidgetErrorState
            message="Unable to check system status."
            onRetry={() => void refetch()}
          />
        </div>
      ) : !data ? null : (
        <div className="table-shell">
          <div className="table-scroll">
            <table className="min-w-[520px] table-fixed border-collapse">
              <colgroup>
                <col />
                <col className="w-[110px]" />
              </colgroup>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {data.services.map((service) => {
                  const isUp = service.status === "OPERATIONAL";
                  return (
                    <tr key={service.key}>
                      <td className="whitespace-nowrap align-middle">
                        <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background: isUp ? "var(--color-brand-soft)" : "var(--color-danger-soft)",
                              color: isUp ? "var(--color-brand)" : "var(--color-danger)",
                            }}
                            aria-hidden="true"
                          >
                            {isUp ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                          </span>
                          <span className="truncate">{service.label}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap align-middle">
                        <Badge scheme={isUp ? "emerald" : "rose"}>{service.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
