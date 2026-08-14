import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "../../shared/components/Alert";
import { listUsersRequest } from "../../api/users";
import {
  fetchSystemStatus,
  type SystemStatus,
} from "./dashboard.api";
import { KpiCard } from "../../shared/components";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { hasPermission } from "../../lib/permissions";
import { DashboardWelcomeBanner } from "./components/DashboardWelcomeBanner";
import { SystemStatusCard } from "./components/SystemStatusCard";

type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

function isDashboardUserArray(value: unknown): value is DashboardUser[] {
  return Array.isArray(value);
}

function normalizeUsersResponse(payload: unknown): DashboardUser[] {
  if (Array.isArray(payload)) return payload as DashboardUser[];
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (isDashboardUserArray(record.items)) return record.items;
  if (isDashboardUserArray(record.users)) return record.users;
  if (isDashboardUserArray(record.data)) return record.data;
  if (
    record.data &&
    typeof record.data === "object" &&
    isDashboardUserArray((record.data as Record<string, unknown>).items)
  ) {
    return (record.data as Record<string, unknown>).items as DashboardUser[];
  }
  if (
    record.data &&
    typeof record.data === "object" &&
    isDashboardUserArray((record.data as Record<string, unknown>).users)
  ) {
    return (record.data as Record<string, unknown>).users as DashboardUser[];
  }
  return [];
}

function ErrorBanner({ message }: { message: string }) {
  return <Alert variant="error" message={message} />;
}

export function DashboardPage() {
  const userPermissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewUsers = hasPermission(userPermissions, "users.view");

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorObj,
    refetch: refetchUsers,
    isFetching: usersFetching,
  } = useQuery({
    queryKey: ["users"],
    queryFn: listUsersRequest,
    enabled: canViewUsers,
  });

  const users = useMemo(() => normalizeUsersResponse(usersData), [usersData]);
  const userMetrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    return { active, inactive: total - active };
  }, [users]);

  const {
    refetch: refetchSystem,
    isFetching: systemFetching,
  } = useQuery<SystemStatus>({
    queryKey: ["dashboard-system-status"],
    queryFn: ({ signal }) => fetchSystemStatus(signal),
  });

  const isFetchingAny = usersFetching || systemFetching;

  const queryClient = useQueryClient();

  function handleRefreshAll() {
    void refetchUsers();
    void refetchSystem();
    void queryClient.invalidateQueries({
      predicate: (query) =>
        typeof query.queryKey[0] === "string" &&
        query.queryKey[0].startsWith("dashboard-"),
    });
  }

  const usersErrorMessage =
    usersErrorObj instanceof Error
      ? usersErrorObj.message
      : "Unable to load user data.";

  return (
    <div className="space-y-5">
      <DashboardWelcomeBanner
        isRefreshing={isFetchingAny}
        onRefresh={handleRefreshAll}
      />

      {usersError && <ErrorBanner message={usersErrorMessage} />}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SystemStatusCard />
      </div>

      {canViewUsers ? (
        <section>
          <h3
            className="mb-3 text-base font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            User Overview
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              eyebrow="User Management"
              title="Total Users"
              value={usersError ? null : usersLoading ? null : users.length}
              accentClass="bg-[var(--color-brand)]"
              linkTo="/users"
              linkLabel="View users"
              format="number"
            />
            <KpiCard
              eyebrow="User Management"
              title="Active Users"
              value={usersError ? null : usersLoading ? null : userMetrics.active}
              accentClass="bg-[var(--color-success)]"
              linkTo="/users"
              linkLabel="View users"
              format="number"
            />
            <KpiCard
              eyebrow="User Management"
              title="Inactive Users"
              value={usersError ? null : usersLoading ? null : userMetrics.inactive}
              accentClass="bg-[var(--color-brand-soft)]"
              linkTo="/users"
              linkLabel="View users"
              format="number"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
