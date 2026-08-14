// frontend/src/modules/audit/services/audit.api.ts
import { api } from "../../../api/axios";
import type { AuditLogQuery, AuditLogsResponse } from "../types/audit.types";

export async function getAuditLogs(query: AuditLogQuery) {
  const response = await api.get("/audit-logs", {
    params: {
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      action: query.action || undefined,
      actorEmail: query.actorEmail || undefined,
      targetType: query.targetType || undefined,
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || undefined,
      order: query.order || "DESC",
    },
  });

  return response.data as AuditLogsResponse;
}

export async function exportAuditLogs(query: Partial<AuditLogQuery>) {
  const response = await api.get("/audit-logs/export", {
    params: {
      search: query.search || undefined,
      action: query.action || undefined,
      actorEmail: query.actorEmail || undefined,
      targetType: query.targetType || undefined,
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || undefined,
      order: query.order || "DESC",
    },
    responseType: "blob",
  });

  return response.data as Blob;
}