// frontend/src/pages/dashboard/quickLinks.ts
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Car,
  ScrollText,
  Users,
} from "lucide-react";

export type DashboardQuickLink = {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  route: string;
  requiredPermission?: string | string[];
  priority: number;
};

export const QUICK_LINKS: DashboardQuickLink[] = [
  {
    id: "users",
    label: "User Management",
    description: "Accounts & roles",
    icon: Users,
    route: "/users",
    requiredPermission: "users.view",
    priority: 1,
  },
  {
    id: "audit-logs",
    label: "Audit Logs",
    description: "System activity",
    icon: ScrollText,
    route: "/audit-logs",
    requiredPermission: "audit_logs.view",
    priority: 2,
  },
  {
    id: "duty-schedules",
    label: "Duty Schedule",
    description: "Driver shift coverage",
    icon: CalendarDays,
    route: "/fleet/duty-schedules",
    requiredPermission: "driver.view",
    priority: 3,
  },
  {
    id: "vehicle-availability",
    label: "Vehicle Availability",
    description: "Unavailable blocks & reasons",
    icon: Car,
    route: "/fleet/vehicle-availability",
    requiredPermission: "car.view",
    priority: 4,
  },
];
