import { useState } from "react";
import type { DriverItem, UpdateDriverPayload } from "../types/driver.types";
import { FLEET_ASSIGNMENT_POOLS, DRIVER_DUTY_STATUSES } from "../types/driver.types";
import { Alert } from "../../../../shared/components/Alert";
import { AppModal } from "../../../../components/ui/AppModal";
import { Toggle } from "../../../../shared/components/Toggle";

type Props = {
  open: boolean;
  submitting: boolean;
  serverError?: string;
  driver: DriverItem | null;
  onClose: () => void;
  onSubmit: (payload: UpdateDriverPayload) => Promise<void>;
};

const initialState: UpdateDriverPayload = {
  name: "",
  licenseNumber: "",
  contactNumber: "",
  address: "",
  licenseExpiry: "",
  dutyStatus: "OFF_DUTY",
  assignmentPool: "GENERAL",
  autoAssignEnabled: true,
  allowGeneralUseWhenExecutiveAway: false,
};

export default function EditDriverModal({
  open,
  submitting,
  serverError,
  driver,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<UpdateDriverPayload>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    setErrors({});
    setForm({
      name: driver?.name ?? "",
      licenseNumber: driver?.licenseNumber ?? "",
      contactNumber: driver?.contactNumber || "",
      address: driver?.address || "",
      licenseExpiry: driver?.licenseExpiry || "",
      dutyStatus: driver?.dutyStatus ?? "OFF_DUTY",
      assignmentPool: driver?.assignmentPool ?? "GENERAL",
      autoAssignEnabled: driver?.autoAssignEnabled ?? true,
      allowGeneralUseWhenExecutiveAway: driver?.allowGeneralUseWhenExecutiveAway ?? false,
    });
  }

  if (!driver) return null;

  function update<K extends keyof UpdateDriverPayload>(key: K, value: UpdateDriverPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const errs: Record<string, string> = {};

    if (!form.name?.trim()) errs.name = "Required";
    if (!form.licenseNumber?.trim()) errs.licenseNumber = "Required";

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validate();
    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    await onSubmit({
      name: form.name?.trim(),
      licenseNumber: form.licenseNumber?.trim(),
      contactNumber: form.contactNumber?.trim() || undefined,
      address: form.address?.trim() || undefined,
      licenseExpiry: form.licenseExpiry || undefined,
      dutyStatus: form.dutyStatus,
      assignmentPool: form.assignmentPool,
      autoAssignEnabled: form.autoAssignEnabled,
      allowGeneralUseWhenExecutiveAway: form.allowGeneralUseWhenExecutiveAway,
    });
  }

  return (
    <AppModal open={open} onClose={onClose} title="Edit Driver" className="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-[var(--color-border-default)] px-4 text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="edit-driver-form"
            disabled={submitting}
            className="h-11 rounded-xl bg-[var(--color-info)] px-4 text-sm font-semibold text-[var(--color-text-on-brand)] disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      }
    >
      <form id="edit-driver-form" onSubmit={handleSubmit} className="space-y-4">
        {serverError ? <Alert variant="error" message={serverError} /> : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Name
          </label>
          <input
            value={form.name ?? ""}
            onChange={(e) => update("name", e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          />
          {errors.name ? (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            License Number
          </label>
          <input
            value={form.licenseNumber ?? ""}
            onChange={(e) => update("licenseNumber", e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          />
          {errors.licenseNumber ? (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.licenseNumber}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Contact Number <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
          </label>
          <input
            value={form.contactNumber ?? ""}
            onChange={(e) => update("contactNumber", e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Address <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
          </label>
          <input
            value={form.address ?? ""}
            onChange={(e) => update("address", e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            License Expiry <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
          </label>
          <input
            type="date"
            value={form.licenseExpiry ?? ""}
            onChange={(e) => update("licenseExpiry", e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Duty Status
          </label>
          <select
            value={form.dutyStatus}
            onChange={(e) => update("dutyStatus", e.target.value as UpdateDriverPayload["dutyStatus"])}
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          >
            {DRIVER_DUTY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Assignment Pool
          </label>
          <select
            value={form.assignmentPool}
            onChange={(e) =>
              update("assignmentPool", e.target.value as UpdateDriverPayload["assignmentPool"])
            }
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          >
            {FLEET_ASSIGNMENT_POOLS.map((pool) => (
              <option key={pool} value={pool}>
                {pool}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--color-border-default)] p-4">
          <Toggle
            checked={form.autoAssignEnabled ?? true}
            onChange={(checked) => update("autoAssignEnabled", checked)}
            label="Auto-assign this driver to requests"
          />
          {form.assignmentPool === "EXECUTIVE" ? (
            <Toggle
              checked={form.allowGeneralUseWhenExecutiveAway ?? false}
              onChange={(checked) => update("allowGeneralUseWhenExecutiveAway", checked)}
              label="Allow general use when executive is away"
            />
          ) : null}
        </div>
      </form>
    </AppModal>
  );
}
