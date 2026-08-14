import { AuditLog } from '../audit/audit-log.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { PermissionRole } from '../permissions/entities/permission-role.entity';
import { UserPermissionOverride } from '../permissions/entities/user-permission-override.entity';
import { User } from '../users/user.entity';
import { Driver } from '../modules/catalog/drivers/driver.entity';
import { Car } from '../modules/catalog/cars/car.entity';
import { TransportationRequest } from '../modules/transportation/entities/transportation-request.entity';
import { TransportStop } from '../modules/transportation/entities/transport-stop.entity';
import { TransportPassenger } from '../modules/transportation/entities/transport-passenger.entity';
import { TransportAssignment } from '../modules/transportation/entities/transport-assignment.entity';
import { TransportStatusHistory } from '../modules/transportation/entities/transport-status-history.entity';
import { TransportTripEvent } from '../modules/transportation/entities/transport-trip-event.entity';
import { DriverLocation } from '../modules/transportation/entities/driver-location.entity';
import { DriverDutySchedule } from '../modules/scheduling/entities/driver-duty-schedule.entity';
import { VehicleAvailabilityBlock } from '../modules/scheduling/entities/vehicle-availability-block.entity';
import { FleetAssignment } from '../modules/dispatch/entities/fleet-assignment.entity';
import { FleetDispatchSettings } from '../modules/dispatch/entities/fleet-dispatch-settings.entity';

export const databaseEntities = [
  User,
  AuditLog,
  RolePermission,
  PermissionRole,
  UserPermissionOverride,
  Driver,
  Car,
  TransportationRequest,
  TransportStop,
  TransportPassenger,
  TransportAssignment,
  TransportStatusHistory,
  TransportTripEvent,
  DriverLocation,
  DriverDutySchedule,
  VehicleAvailabilityBlock,
  FleetAssignment,
  FleetDispatchSettings,
];
