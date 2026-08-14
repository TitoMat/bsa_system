// frontend/src/modules/audit/pages/AuditLogsPage.tsx
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import AuditFilters from "../components/AuditFilters";
import { Pagination } from "../../../shared/components/Pagination";
import AuditTable from "../components/AuditTable";
import { getAuditLogs, exportAuditLogs } from "../services/audit.api";
import type { AuditLogItem } from "../types/audit.types";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { Alert } from "../../../shared/components/Alert";
import { Button } from "../../../shared/components/Button";
import { Download } from "lucide-react";

type AlertState = { type: "error" | "success"; message: string } | null;

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [order, setOrder] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [alert, setAlert] = useState<AlertState>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void loadAuditLogs();
  }, [page, limit, search, actorEmail, action, dateFrom, dateTo, order]);

  async function loadAuditLogs() {
    try {
      setLoading(true);
      setAlert(null);

      const res = await getAuditLogs({
        page,
        limit,
        search,
        actorEmail: actorEmail || undefined,
        action: action || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        order,
      });

      setItems(res.items ?? []);
      setPage(res.page ?? 1);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 403) {
        setAlert({
          type: "error",
          message: "You do not have permission to view audit logs.",
        });
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      if (status === 401) {
        setAlert({
          type: "error",
          message: "Session expired. Please login again.",
        });
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to load audit logs.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      setExporting(true);
      setAlert(null);

      const blob = await exportAuditLogs({
        search,
        actorEmail: actorEmail || undefined,
        action: action || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        order,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
      a.href = url;
      a.download = `audit-logs_${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to export audit logs.",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col space-y-5">
      {alert ? (
        <Alert variant={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <AuditFilters
            search={searchInput}
            setSearch={setSearchInput}
            actorEmail={actorEmail}
            setActorEmail={setActorEmail}
            action={action}
            setAction={(value) => {
              setAction(value);
              setPage(1);
            }}
            dateFrom={dateFrom}
            setDateFrom={(value) => {
              setDateFrom(value);
              setPage(1);
            }}
            dateTo={dateTo}
            setDateTo={(value) => {
              setDateTo(value);
              setPage(1);
            }}
            order={order}
            setOrder={(value) => {
              setOrder(value);
              setPage(1);
            }}
          />
        </div>
        <Button
          variant="primary"
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="shrink-0 mt-1"
        >
          <Download size={16} />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <div className="flex-1">
        <AuditTable items={items} loading={loading} />
      </div>

      <div className="mt-auto border-t pt-4" style={{ borderColor: 'var(--color-border-default)' }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          label="results"
        />
      </div>
    </div>
  );
}