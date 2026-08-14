// frontend/src/pages/dashboard/dashboard.api.ts
import { api } from "../../api/axios";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// ── System Status ───────────────────────────────────────────────────────────

export interface SystemStatusService {
  key: string;
  label: string;
  status: "OPERATIONAL" | "UNAVAILABLE";
}

export interface SystemStatus {
  status: "OPERATIONAL" | "DEGRADED";
  checkedAt: string;
  services: SystemStatusService[];
}

export async function fetchSystemStatus(
  signal?: AbortSignal,
): Promise<SystemStatus> {
  const response = await api.get<unknown>("/dashboard/system-status", {
    signal,
  });

  const fallback: SystemStatus = {
    status: "DEGRADED",
    checkedAt: new Date().toISOString(),
    services: [],
  };

  if (!isObject(response.data)) return fallback;

  const services: SystemStatusService[] = Array.isArray(response.data.services)
    ? response.data.services
        .filter(isObject)
        .map((service) => ({
          key:
            typeof service.key === "string" ? service.key : String(service.key ?? ""),
          label:
            typeof service.label === "string"
              ? service.label
              : String(service.label ?? ""),
          status:
            service.status === "OPERATIONAL"
              ? ("OPERATIONAL" as const)
              : ("UNAVAILABLE" as const),
        }))
    : [];

  return {
    status: response.data.status === "OPERATIONAL" ? "OPERATIONAL" : "DEGRADED",
    checkedAt:
      typeof response.data.checkedAt === "string"
        ? response.data.checkedAt
        : new Date().toISOString(),
    services,
  };
}
