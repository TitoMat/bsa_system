// frontend/src/modules/audit/types/audit.types.ts
export type AuditMetadata = {
  email?: string;
  role?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  [key: string]: unknown;
};

export type AuditLogItem = {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: AuditMetadata | null;
  createdAt: string;
};

export type AuditLogsResponse = {
  items: AuditLogItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AuditLogQuery = {
  page: number;
  limit: number;
  search?: string;
  action?: string;
  actorEmail?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  order?: "ASC" | "DESC";
};