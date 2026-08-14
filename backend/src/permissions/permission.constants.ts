// backend/src/permissions/permission.constants.ts
import { Role } from '../common/enums/role.enum';

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',

  MAPS_VIEW: 'maps.view',

  TRANSPORTATION_REQUESTS_CREATE: 'transportation_requests.create',
  TRANSPORTATION_REQUESTS_VIEW_OWN: 'transportation_requests.view_own',
  TRANSPORTATION_REQUESTS_EDIT_OWN: 'transportation_requests.edit_own',
  TRANSPORTATION_REQUESTS_APPROVE: 'transportation_requests.approve',
  TRANSPORTATION_REQUESTS_REJECT: 'transportation_requests.reject',
  TRANSPORTATION_REQUESTS_CANCEL_OWN: 'transportation_requests.cancel_own',
  TRANSPORTATION_REQUESTS_DISPATCH: 'transportation_requests.dispatch',
  TRANSPORTATION_REQUESTS_ASSIGN: 'transportation_requests.assign',
  TRANSPORTATION_REQUESTS_MONITOR: 'transportation_requests.monitor',
  TRANSPORTATION_REQUESTS_COMPLETE: 'transportation_requests.complete',

  DRIVER_VIEW: 'driver.view',
  DRIVER_CREATE: 'driver.create',
  DRIVER_EDIT: 'driver.edit',
  DRIVER_DELETE: 'driver.delete',

  CAR_VIEW: 'car.view',
  CAR_CREATE: 'car.create',
  CAR_EDIT: 'car.edit',
  CAR_DELETE: 'car.delete',

  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_CHANGE_STATUS: 'users.change_status',
  USERS_RESET_PASSWORD: 'users.reset_password',
  USERS_UNLOCK: 'users.unlock',

  AUDIT_LOGS_VIEW: 'audit_logs.view',

  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_EDIT: 'permissions.edit',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  [Role.SUPERADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.MAPS_VIEW,

    PERMISSIONS.TRANSPORTATION_REQUESTS_CREATE,
    PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN,
    PERMISSIONS.TRANSPORTATION_REQUESTS_EDIT_OWN,
    PERMISSIONS.TRANSPORTATION_REQUESTS_APPROVE,
    PERMISSIONS.TRANSPORTATION_REQUESTS_REJECT,
    PERMISSIONS.TRANSPORTATION_REQUESTS_CANCEL_OWN,
    PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH,
    PERMISSIONS.TRANSPORTATION_REQUESTS_ASSIGN,
    PERMISSIONS.TRANSPORTATION_REQUESTS_MONITOR,
    PERMISSIONS.TRANSPORTATION_REQUESTS_COMPLETE,

    PERMISSIONS.DRIVER_VIEW,
    PERMISSIONS.DRIVER_CREATE,
    PERMISSIONS.DRIVER_EDIT,
    PERMISSIONS.DRIVER_DELETE,

    PERMISSIONS.CAR_VIEW,
    PERMISSIONS.CAR_CREATE,
    PERMISSIONS.CAR_EDIT,
    PERMISSIONS.CAR_DELETE,

    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_CHANGE_STATUS,
    PERMISSIONS.USERS_RESET_PASSWORD,
    PERMISSIONS.USERS_UNLOCK,

    PERMISSIONS.AUDIT_LOGS_VIEW,

    PERMISSIONS.PERMISSIONS_VIEW,
    PERMISSIONS.PERMISSIONS_EDIT,
  ],

  [Role.ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.MAPS_VIEW,

    PERMISSIONS.TRANSPORTATION_REQUESTS_CREATE,
    PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN,
    PERMISSIONS.TRANSPORTATION_REQUESTS_EDIT_OWN,
    PERMISSIONS.TRANSPORTATION_REQUESTS_APPROVE,
    PERMISSIONS.TRANSPORTATION_REQUESTS_REJECT,
    PERMISSIONS.TRANSPORTATION_REQUESTS_CANCEL_OWN,
    PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH,
    PERMISSIONS.TRANSPORTATION_REQUESTS_ASSIGN,
    PERMISSIONS.TRANSPORTATION_REQUESTS_MONITOR,
    PERMISSIONS.TRANSPORTATION_REQUESTS_COMPLETE,

    PERMISSIONS.DRIVER_VIEW,
    PERMISSIONS.DRIVER_CREATE,
    PERMISSIONS.DRIVER_EDIT,
    PERMISSIONS.DRIVER_DELETE,

    PERMISSIONS.CAR_VIEW,
    PERMISSIONS.CAR_CREATE,
    PERMISSIONS.CAR_EDIT,
    PERMISSIONS.CAR_DELETE,

    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_CHANGE_STATUS,
    PERMISSIONS.USERS_RESET_PASSWORD,
    PERMISSIONS.USERS_UNLOCK,

    PERMISSIONS.AUDIT_LOGS_VIEW,

    PERMISSIONS.PERMISSIONS_VIEW,
  ],

  [Role.USER]: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.MAPS_VIEW,

    PERMISSIONS.TRANSPORTATION_REQUESTS_CREATE,
    PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN,
  ],
};

export const PERMISSION_GROUPS = [
  {
    module: 'Dashboard',
    permissions: [{ key: PERMISSIONS.DASHBOARD_VIEW, label: 'View Dashboard' }],
  },
  {
    module: 'Maps',
    permissions: [{ key: PERMISSIONS.MAPS_VIEW, label: 'View Maps' }],
  },
  {
    module: 'Transportation Requests',
    permissions: [
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_CREATE,
        label: 'Create Requests',
      },
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_VIEW_OWN,
        label: 'View Own Requests',
      },
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_EDIT_OWN,
        label: 'Edit Own Requests',
      },
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_APPROVE,
        label: 'Approve Requests',
      },
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_REJECT,
        label: 'Reject Requests',
      },
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_CANCEL_OWN,
        label: 'Cancel Own Requests',
      },
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_DISPATCH,
        label: 'Dispatch Requests',
      },
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_ASSIGN,
        label: 'Assign Requests',
      },
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_MONITOR,
        label: 'Monitor Fleet',
      },
      {
        key: PERMISSIONS.TRANSPORTATION_REQUESTS_COMPLETE,
        label: 'Complete Requests',
      },
    ],
  },
  {
    module: 'Drivers',
    permissions: [
      { key: PERMISSIONS.DRIVER_VIEW, label: 'View Drivers' },
      { key: PERMISSIONS.DRIVER_CREATE, label: 'Create Drivers' },
      { key: PERMISSIONS.DRIVER_EDIT, label: 'Edit Drivers' },
      { key: PERMISSIONS.DRIVER_DELETE, label: 'Delete Drivers' },
    ],
  },
  {
    module: 'Cars',
    permissions: [
      { key: PERMISSIONS.CAR_VIEW, label: 'View Cars' },
      { key: PERMISSIONS.CAR_CREATE, label: 'Create Cars' },
      { key: PERMISSIONS.CAR_EDIT, label: 'Edit Cars' },
      { key: PERMISSIONS.CAR_DELETE, label: 'Delete Cars' },
    ],
  },
  {
    module: 'Users',
    permissions: [
      { key: PERMISSIONS.USERS_VIEW, label: 'View Users' },
      { key: PERMISSIONS.USERS_CREATE, label: 'Create Users' },
      { key: PERMISSIONS.USERS_EDIT, label: 'Edit Users' },
      {
        key: PERMISSIONS.USERS_CHANGE_STATUS,
        label: 'Activate / Deactivate Users',
      },
      { key: PERMISSIONS.USERS_RESET_PASSWORD, label: 'Reset Password' },
      { key: PERMISSIONS.USERS_UNLOCK, label: 'Unlock User' },
    ],
  },
  {
    module: 'Audit Logs',
    permissions: [
      { key: PERMISSIONS.AUDIT_LOGS_VIEW, label: 'View Audit Logs' },
    ],
  },
  {
    module: 'Permissions',
    permissions: [
      { key: PERMISSIONS.PERMISSIONS_VIEW, label: 'View Permissions Page' },
      { key: PERMISSIONS.PERMISSIONS_EDIT, label: 'Edit Role Permissions' },
    ],
  },
];