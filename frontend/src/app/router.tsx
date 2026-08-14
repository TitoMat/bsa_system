import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { NotFoundPage } from '../pages/not-found/NotFoundPage';

import { AppShell } from '../components/layout/AppShell';
import { useAuthStore } from '../features/auth/useAuthStore';
import { PermissionGate } from '../components/auth/PermissionGate';
import UsersPage from '../modules/users/pages/UsersPage';
import AuditLogsPage from '../modules/audit/pages/AuditLogsPage';
import PermissionPage from '../modules/profile/pages/PermissionPage';
import ProfileSettingsPage from '../modules/profile/pages/ProfileSettingsPage';
import DriverPage from '../modules/catalog/drivers/pages/DriverPage';
import CarPage from '../modules/catalog/cars/pages/CarPage';
import BsaMapPage from '../modules/maps/pages/BsaMapPage';
import LodgeTransportationRequestPage from '../modules/transportation/pages/LodgeTransportationRequestPage';
import TransportationRequestsPage from '../modules/transportation/pages/TransportationRequestsPage';
import FleetInsightsPage from '../modules/transportation/pages/FleetInsightsPage';
import TransportationCalendarPage from '../modules/transportation/pages/TransportationCalendarPage';
import DutySchedulePage from '../modules/scheduling/pages/DutySchedulePage';
import VehicleAvailabilityPage from '../modules/scheduling/pages/VehicleAvailabilityPage';
import { RouteErrorElement } from '../components/RouteErrorElement';

function ProtectedLayout() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile?changePassword=true" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (isAuthenticated) {
    if (user?.mustChangePassword) {
      return <Navigate to="/profile?changePassword=true" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      {
        path: '/dashboard',
        element: (
          <PermissionGate permission="dashboard.view" useRedirect>
            <DashboardPage />
          </PermissionGate>
        ),
      },
      {
        path: '/permission',
        element: (
          <PermissionGate permission="permissions.view" useRedirect>
            <PermissionPage />
          </PermissionGate>
        ),
      },
      {
        path: '/users',
        element: (
          <PermissionGate permission="users.view" useRedirect>
            <UsersPage />
          </PermissionGate>
        ),
      },
      {
        path: '/audit-logs',
        element: (
          <PermissionGate permission="audit_logs.view" useRedirect>
            <AuditLogsPage />
          </PermissionGate>
        ),
      },
      { path: '/settings/profile', element: <Navigate to="/profile" replace /> },
      { path: '/change-password', element: <Navigate to="/profile" replace /> },
      { path: '/profile', element: <ProfileSettingsPage /> },
      {
        path: '/catalogs/drivers',
        element: (
          <PermissionGate permission="driver.view" useRedirect>
            <DriverPage />
          </PermissionGate>
        ),
      },
      {
        path: '/catalogs/cars',
        element: (
          <PermissionGate permission="car.view" useRedirect>
            <CarPage />
          </PermissionGate>
        ),
      },
      {
        path: '/maps',
        element: (
          <PermissionGate permission="maps.view" useRedirect>
            <BsaMapPage />
          </PermissionGate>
        ),
        errorElement: <RouteErrorElement />,
      },
      {
        path: '/transportation-requests',
        element: (
          <PermissionGate permission="transportation_requests.view_own" useRedirect>
            <TransportationRequestsPage />
          </PermissionGate>
        ),
      },
      {
        path: '/transportation-requests/lodge',
        element: (
          <PermissionGate permission="transportation_requests.create" useRedirect>
            <LodgeTransportationRequestPage />
          </PermissionGate>
        ),
      },
      {
        path: '/transportation-requests/calendar',
        element: (
          <PermissionGate permission="transportation_requests.view_own" useRedirect>
            <TransportationCalendarPage />
          </PermissionGate>
        ),
      },
      {
        path: '/fleet/insights',
        element: (
          <PermissionGate permission="transportation_requests.monitor" useRedirect>
            <FleetInsightsPage />
          </PermissionGate>
        ),
      },
      {
        path: '/fleet/duty-schedules',
        element: (
          <PermissionGate permission="driver.view" useRedirect>
            <DutySchedulePage />
          </PermissionGate>
        ),
      },
      {
        path: '/fleet/vehicle-availability',
        element: (
          <PermissionGate permission="car.view" useRedirect>
            <VehicleAvailabilityPage />
          </PermissionGate>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
