// frontend/src/modules/users/components/EditUserModal.tsx
import { useEffect, useMemo, useState } from "react";
import type { AuthMe, UpdateUserPayload, UserItem } from "../types/user.types";
import { validateEditUser } from "../utils/user.validation";
import { Alert } from "../../../shared/components/Alert";
import { AppModal } from "../../../components/ui/AppModal";

type Props = {
  open: boolean;
  submitting: boolean;
  serverError?: string;
  currentUser: AuthMe | null;
  user: UserItem | null;
  roles: string[];
  onClose: () => void;
  onSubmit: (payload: UpdateUserPayload) => Promise<void>;
};

export default function EditUserModal({
  open,
  submitting,
  serverError,
  currentUser,
  user,
  roles,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<UpdateUserPayload>({
    name: "",
    email: "",
    role: "USER",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && user) {
      setForm({
        name: user.fullName,
        email: user.email,
        role: user.role,
      });
      setErrors({});
    }
  }, [open, user]);

  const isSelf = useMemo(
    () => !!currentUser && !!user && currentUser.id === user.id,
    [currentUser, user]
  );

  const selfDemotionBlocked =
    isSelf && currentUser?.role === "SUPERADMIN" && form.role !== "SUPERADMIN";

  if (!user) return null;

  function update<K extends keyof UpdateUserPayload>(
    key: K,
    value: UpdateUserPayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validateEditUser(form);

    if (selfDemotionBlocked) {
      validation.role = "You cannot demote your own SUPERADMIN account.";
    }

    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    await onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
    });
  }

  return (
    <AppModal open={open} onClose={onClose} title="Edit User" className="max-w-xl"
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
            form="edit-user-form"
            disabled={submitting}
            className="h-11 rounded-xl bg-[var(--color-info)] px-4 text-sm font-semibold text-[var(--color-text-on-brand)] disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        {serverError ? <Alert variant="error" message={serverError} /> : null}

        {isSelf ? (
          <Alert variant="warning" message="This is your own account. SUPERADMIN self-demotion is blocked here." />
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Full Name
          </label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          />
          {errors.name ? (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Email
          </label>
          <input
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.email}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Role
          </label>
          <select
            value={form.role}
            onChange={(e) =>
              update("role", e.target.value as UpdateUserPayload["role"])
            }
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {errors.role ? (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.role}</p>
          ) : null}
        </div>
      </form>
    </AppModal>
  );
}
