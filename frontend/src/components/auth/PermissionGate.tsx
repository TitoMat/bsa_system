// frontend/src/components/auth/PermissionGate.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { hasPermission } from "../../lib/permissions";

type PermissionGateProps = {
  permission?: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  useRedirect?: boolean;
};

export function PermissionGate({
  permission,
  children,
  fallback = null,
  redirectTo = "/dashboard",
  useRedirect = false,
}: PermissionGateProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  const allowed = hasPermission(user?.permissions ?? [], permission);

  if (allowed) {
    return <>{children}</>;
  }

  if (useRedirect) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          message: "You do not have permission to access that page.",
          from: location.pathname,
        }}
      />
    );
  }

  return <>{fallback}</>;
}
