// frontend/src/routes/ProtectedRoute.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/useAuthStore";
import { hasPermission } from "../lib/permissions";
import { LoadingState } from "../shared/components/LoadingState";

type ProtectedRouteProps = {
  children: ReactNode;
  requiredPermission?: string | string[];
};

export default function ProtectedRoute({
  children,
  requiredPermission,
}: ProtectedRouteProps) {
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!hydrated) {
    return <LoadingState message="Loading..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = hasPermission(user.permissions ?? [], requiredPermission);

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}