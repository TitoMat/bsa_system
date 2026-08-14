import {
  CalendarDays,
  Car,
  LayoutDashboard,
  Map,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SidebarItem = {
  label: string;
  icon: LucideIcon;
  path?: string;
  permission?: string | string[];
  children?: SidebarItem[];
};

export const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    permission: "dashboard.view",
  },
  {
    label: "Fleet Management",
    icon: Truck,
    permission: ["transportation_requests.view_own", "transportation_requests.create"],
    children: [
      {
        label: "Fleet Monitoring",
        icon: ScrollText,
        path: "/transportation-requests",
        permission: "transportation_requests.view_own",
      },
      {
        label: "Lodge Request",
        icon: ShieldCheck,
        path: "/transportation-requests/lodge",
        permission: "transportation_requests.create",
      },
      {
        label: "Calendar",
        icon: CalendarDays,
        path: "/transportation-requests/calendar",
        permission: "transportation_requests.view_own",
      },
    ],
  },
  {
    label: "Maps",
    icon: Map,
    path: "/maps",
    permission: "maps.view",
  },
  {
    label: "Admin Tools",
    icon: Wrench,
    permission: ["driver.view", "car.view"],
    children: [
      {
        label: "Drivers",
        icon: Users,
        path: "/catalogs/drivers",
        permission: "driver.view",
      },
      {
        label: "Cars",
        icon: Car,
        path: "/catalogs/cars",
        permission: "car.view",
      },
      {
        label: "Duty Schedule",
        icon: CalendarDays,
        path: "/fleet/duty-schedules",
        permission: "driver.view",
      },
      {
        label: "Vehicle Availability",
        icon: Car,
        path: "/fleet/vehicle-availability",
        permission: "car.view",
      },
    ],
  },
  {
    label: "Admin Panel",
    icon: Settings,
    permission: ["users.view", "audit_logs.view", "permissions.view"],
    children: [
      {
        label: "Permission",
        icon: ShieldCheck,
        path: "/permission",
        permission: "permissions.view",
      },
      {
        label: "User Management",
        icon: Users,
        path: "/users",
        permission: "users.view",
      },
      {
        label: "Audit Logs",
        icon: ScrollText,
        path: "/audit-logs",
        permission: "audit_logs.view",
      },
    ],
  },
];
