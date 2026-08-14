import { useEffect, useState } from "react";
import { Pencil, ToggleLeft, ToggleRight, Trash2, UserPlus } from "lucide-react";
import CreateDriverModal from "../components/CreateDriverModal";
import EditDriverModal from "../components/EditDriverModal";
import { Input, Select } from "../../../../shared/components/Input";
import { Button } from "../../../../shared/components/Button";
import { Pagination } from "../../../../shared/components/Pagination";
import { Alert } from "../../../../shared/components/Alert";
import { LoadingState } from "../../../../shared/components/LoadingState";
import { EmptyState } from "../../../../shared/components/EmptyState";
import { StatusBadge } from "../../../../shared/components/Badge";
import { ActionIconButton } from "../../../../shared/components/ActionIconButton";
import { getDrivers, createDriver, updateDriver, deleteDriver, toggleDriverActive } from "../services/driver.api";
import type { CreateDriverPayload, UpdateDriverPayload, DriverItem } from "../types/driver.types";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../../lib/pagination";
import { useAuthStore } from "../../../../features/auth/useAuthStore";
import { hasPermission } from "../../../../lib/permissions";

type AlertState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

export default function DriverPage() {
  const authUser = useAuthStore((state) => state.user);

  const [items, setItems] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [alert, setAlert] = useState<AlertState>(null);
  const [modalError, setModalError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverItem | null>(null);

  const userPermissions = authUser?.permissions ?? [];
  const canCreate = hasPermission(userPermissions, "driver.create");
  const canEdit = hasPermission(userPermissions, "driver.edit");
  const canDelete = hasPermission(userPermissions, "driver.delete");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void loadDrivers();
  }, [page, limit, search, status]);

  async function loadDrivers() {
    try {
      setLoading(true);
      setAlert(null);
      const res = await getDrivers({ page, limit, search, status });
      setItems(res.items ?? []);
      setPage(res.page ?? 1);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (error) {
      setAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load drivers.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(driver: DriverItem) {
    if (!canDelete) return;
    if (!window.confirm(`Delete driver "${driver.name}"?`)) return;
    try {
      await deleteDriver(driver.id);
      setAlert({ type: "success", message: `Driver "${driver.name}" deleted.` });
      await loadDrivers();
    } catch (error) {
      setAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete driver.",
      });
    }
  }

  async function handleToggleActive(driver: DriverItem) {
    if (!canEdit) return;
    try {
      await toggleDriverActive(driver.id);
      await loadDrivers();
    } catch (error) {
      setAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to toggle driver status.",
      });
    }
  }

  async function handleToggleAutoAssign(driver: DriverItem) {
    if (!canEdit) return;
    try {
      await updateDriver(driver.id, { autoAssignEnabled: !driver.autoAssignEnabled });
      setAlert({
        type: "success",
        message: `Auto-assign ${!driver.autoAssignEnabled ? "enabled" : "disabled"} for "${driver.name}".`,
      });
      await loadDrivers();
    } catch (error) {
      setAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to toggle auto-assign.",
      });
    }
  }

  function formatDate(value: string): string {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  function openCreate() {
    if (!canCreate) return;
    setModalError("");
    setCreateOpen(true);
  }

  function openEdit(driver: DriverItem) {
    if (!canEdit) return;
    setSelectedDriver(driver);
    setModalError("");
    setEditOpen(true);
  }

  async function handleCreate(payload: CreateDriverPayload) {
    if (!canCreate) return;
    try {
      setSubmitting(true);
      setModalError("");
      await createDriver(payload);
      setCreateOpen(false);
      setAlert({ type: "success", message: "Driver created successfully." });
      setPage(1);
      await loadDrivers();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Failed to create driver.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(payload: UpdateDriverPayload) {
    if (!selectedDriver || !canEdit) return;
    try {
      setSubmitting(true);
      setModalError("");
      await updateDriver(selectedDriver.id, payload);
      setEditOpen(false);
      setSelectedDriver(null);
      setAlert({ type: "success", message: "Driver updated successfully." });
      await loadDrivers();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Failed to update driver.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col space-y-5">
      {alert ? (
        <Alert variant={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or license number"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "" | "ACTIVE" | "INACTIVE");
              setPage(1);
            }}
            options={[
              { value: "", label: "All statuses" },
              { value: "ACTIVE", label: "ACTIVE" },
              { value: "INACTIVE", label: "INACTIVE" },
            ]}
          />
        </div>

        {canCreate ? (
          <Button type="button" variant="primary" onClick={openCreate}>
            <UserPlus size={16} />
            Create Driver
          </Button>
        ) : null}
      </div>

      <div className="flex-1">
        {loading ? (
          <LoadingState message="Loading drivers..." />
        ) : !items.length ? (
          <EmptyState title="No drivers found" />
        ) : (
          <div className="table-shell">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>License Number</th>
                    <th>Contact Number</th>
                    <th>Address</th>
                    <th>Duty Status</th>
                    <th>License Expiry</th>
                    <th>Pool</th>
                    <th>Status</th>
                    <th className="text-center" style={{ width: 190 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((driver) => (
                    <tr key={driver.id}>
                      <td className="font-medium">{driver.name}</td>
                      <td>{driver.licenseNumber}</td>
                      <td>{driver.contactNumber || "—"}</td>
                      <td>{driver.address || "—"}</td>
                      <td>
                        <StatusBadge status={driver.dutyStatus} />
                      </td>
                      <td>{formatDate(driver.licenseExpiry)}</td>
                      <td>
                        <StatusBadge status={driver.assignmentPool} />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(driver)}
                          className="inline-flex items-center gap-1"
                          title={driver.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          <StatusBadge status={driver.status} />
                        </button>
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center gap-1">
                          {canEdit ? (
                            <ActionIconButton
                              title={driver.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              onClick={() => handleToggleActive(driver)}
                              tone="emerald"
                            >
                              {driver.status === 'ACTIVE' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            </ActionIconButton>
                          ) : null}
                          {canEdit ? (
                            <ActionIconButton
                              title={driver.autoAssignEnabled ? 'Auto-assign: ON (click to turn off)' : 'Auto-assign: OFF (click to turn on)'}
                              onClick={() => handleToggleAutoAssign(driver)}
                              tone={driver.autoAssignEnabled ? "emerald" : "default"}
                            >
                              {driver.autoAssignEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            </ActionIconButton>
                          ) : null}
                          {canEdit ? (
                            <ActionIconButton
                              title={`Edit ${driver.name}`}
                              onClick={() => openEdit(driver)}
                              tone="sky"
                            >
                              <Pencil size={14} />
                            </ActionIconButton>
                          ) : null}
                          {canDelete ? (
                            <ActionIconButton
                              title={`Delete ${driver.name}`}
                              onClick={() => handleDelete(driver)}
                              tone="red"
                            >
                              <Trash2 size={14} />
                            </ActionIconButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
          label="drivers"
        />
      </div>

      <CreateDriverModal
        open={createOpen}
        submitting={submitting}
        serverError={modalError}
        onClose={() => {
          setCreateOpen(false);
          setModalError("");
        }}
        onSubmit={handleCreate}
      />

      <EditDriverModal
        open={editOpen}
        submitting={submitting}
        serverError={modalError}
        driver={selectedDriver}
        onClose={() => {
          setEditOpen(false);
          setSelectedDriver(null);
          setModalError("");
        }}
        onSubmit={handleEdit}
      />
    </div>
  );
}
