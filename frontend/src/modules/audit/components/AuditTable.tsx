import { useMemo, useState } from "react";
import dayjs from "dayjs";
import type { AuditLogItem } from "../types/audit.types";
import { Badge } from "../../../shared/components/Badge";
import type { BadgeScheme } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { LoadingState } from "../../../shared/components/LoadingState";
import { EmptyState } from "../../../shared/components/EmptyState";

type Props = {
  items: AuditLogItem[];
  loading: boolean;
};

const ACTION_ACRONYM_OVERRIDES: Record<string, string> = {
  qa: "QA",
  pdf: "PDF",
  id: "ID",
  jv: "JV",
  ef02: "EF02",
  megaxcess: "MegaXcess",
};

function normalizeAction(action: string): string {
  return action
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      return (
        ACTION_ACRONYM_OVERRIDES[lower] ??
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      );
    })
    .join(" ");
}

function deriveActorName(email: string): string {
  if (!email) return "System";
  const prefix = email.split("@")[0];
  const words = prefix.replace(/[._-]+/g, " ").split(" ").filter(Boolean);
  if (!words.length) return email;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function AuditActionBadge({ action }: { action: string }) {
  const normalized = action.toUpperCase();
  const label = normalizeAction(action);
  let scheme: BadgeScheme = "zinc";
  if (
    normalized.includes("LOGIN") ||
    normalized.includes("UNLOCK") ||
    normalized.includes("ACTIVATE") ||
    normalized.includes("CREATE")
  ) {
    scheme = "emerald";
  } else if (
    normalized.includes("RESET") ||
    normalized.includes("CHANGE_PASSWORD") ||
    normalized.includes("UPDATE") ||
    normalized.includes("EDIT")
  ) {
    scheme = "amber";
  } else if (
    normalized.includes("DELETE") ||
    normalized.includes("DEACTIVATE") ||
    normalized.includes("LOCK") ||
    normalized.includes("FAILED")
  ) {
    scheme = "rose";
  }
  return <Badge scheme={scheme}>{label}</Badge>;
}

function formatMetadataLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatMetadataValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") {
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }
  return String(value);
}

function MetadataRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-1">
      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="block w-full whitespace-pre-wrap break-words text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>
        {formatMetadataValue(value)}
      </span>
    </div>
  );
}

function buildSummary(metadata: Record<string, unknown>) {
  const summaryKeys = [
    "jv", "game", "gameOffering", "scope", "from", "to",
    "filename", "rowCount", "generatedFileType", "generatedFileCount",
  ];
  const parts: string[] = [];
  for (const key of summaryKeys) {
    if (!(key in metadata)) continue;
    const value = metadata[key];
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${formatMetadataLabel(key)}: ${formatMetadataValue(value)}`);
    if (parts.length >= 3) break;
  }
  return parts.join(" \u2022 ");
}

function AuditDetailsCell({ log }: { log: AuditLogItem }) {
  const [expanded, setExpanded] = useState(false);
  const metadata = (log.metadata ?? {}) as Record<string, unknown>;
  const orderedEntries = useMemo(() => {
    const metadataEntries = Object.entries(metadata);
    const priorityKeys = ["email", "role", "isActive", "mustChangePassword"];
    return [
      ...metadataEntries.filter(([key]) => priorityKeys.includes(key)),
      ...metadataEntries.filter(([key]) => !priorityKeys.includes(key)),
    ];
  }, [metadata]);
  const summaryText = useMemo(() => buildSummary(metadata), [metadata]);

  if (!orderedEntries.length) {
    return <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No metadata</span>;
  }

  return (
    <div className="w-full max-w-[520px] overflow-hidden">
      {!expanded ? (
        <div className="space-y-2">
          <p className="line-clamp-2 whitespace-pre-wrap break-words text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>
            {summaryText || `${orderedEntries.length} metadata field(s)`}
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setExpanded(true)}>
            Show details
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {orderedEntries.map(([key, value]) => (
              <MetadataRow key={key} label={formatMetadataLabel(key)} value={value} />
            ))}
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => setExpanded(false)}>
            Hide details
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AuditTable({ items, loading }: Props) {
  if (loading) return <LoadingState message="Loading audit logs..." />;
  if (!items.length) return <EmptyState title="No audit logs found" />;

  return (
    <div className="table-shell">
      <div className="table-scroll">
        <table className="table-fixed">
          <thead>
            <tr>
              <th className="w-[260px]">Actor</th>
              <th className="w-[280px]">Action</th>
              <th className="w-[160px]">Date</th>
              <th className="w-[180px]">Target</th>
              <th className="w-[560px]">Details</th>
            </tr>
          </thead>

          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="align-top">
                <td>
                  <div className="max-w-[220px]">
                    <div className="whitespace-normal break-words font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {deriveActorName(log.actorEmail)}
                    </div>
                    <div className="mt-1 whitespace-normal break-words text-sm table-cell-muted">
                      Actor ID: {log.actorId}
                    </div>
                  </div>
                </td>

                <td>
                  <div className="max-w-[250px]">
                    <AuditActionBadge action={log.action} />
                  </div>
                </td>

                <td>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {dayjs(log.createdAt).format("MMM D, YYYY")}
                    </span>
                    <span className="text-xs table-cell-muted">
                      {dayjs(log.createdAt).format("h:mm A")}
                    </span>
                  </div>
                </td>

                <td>
                  <div className="flex max-w-[160px] flex-col gap-1">
                    <span className="whitespace-normal break-words font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {log.targetType || "System"}
                    </span>
                    <span className="whitespace-normal break-words text-xs table-cell-muted">
                      {log.targetId || "No target ID"}
                    </span>
                  </div>
                </td>

                <td>
                  <AuditDetailsCell log={log} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
