// frontend/src/modules/users/components/CreateUserModal.tsx
import { useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import type { CreateUserPayload } from "../types/user.types";
import {
  generateTempPassword,
  validateCreateUser,
} from "../utils/user.validation";
import { Alert } from "../../../shared/components/Alert";
import { AppModal } from "../../../components/ui/AppModal";

type Props = {
  open: boolean;
  submitting: boolean;
  serverError?: string;
  roles: string[];
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload) => Promise<void>;
};

type FormState = CreateUserPayload & {
  confirmPassword: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  role: "USER",
  isActive: true,
  password: "",
  confirmPassword: "",
};

export default function CreateUserModal({
  open,
  submitting,
  serverError,
  roles,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [show, setShow] = useState({
    password: false,
    confirm: false,
  });

  useEffect(() => {
    if (open) {
      const generated = generateTempPassword();

      setForm({
        ...initialState,
        password: generated,
        confirmPassword: generated,
      });

      setErrors({});
      setShow({
        password: false,
        confirm: false,
      });
    }
  }, [open]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleGenerate() {
    const generated = generateTempPassword();

    setForm((prev) => ({
      ...prev,
      password: generated,
      confirmPassword: generated,
    }));

    setErrors((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validateCreateUser(form);
    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    await onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      isActive: form.isActive,
      password: form.password,
    });
  }

  return (
    <AppModal open={open} onClose={onClose} title="Create User" className="max-w-xl"
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
            form="create-user-form"
            disabled={submitting}
            className="h-11 rounded-xl bg-[var(--color-info)] px-4 text-sm font-semibold text-[var(--color-text-on-brand)] disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create User"}
          </button>
        </div>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
        {serverError && <Alert variant="error" message={serverError} />}

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Full Name
          </label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.name}</p>
          )}
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
          {errors.email && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.email}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value as FormState["role"])}
              className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              Status
            </label>
            <select
              value={form.isActive ? "ACTIVE" : "INACTIVE"}
              onChange={(e) => update("isActive", e.target.value === "ACTIVE")}
              className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Generate a secure temporary password
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)]"
          >
            <RefreshCw size={16} />
            Generate
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Password
          </label>

          <div className="relative">
            <input
              type={show.password ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 pr-10 text-sm outline-none focus:border-[var(--color-info)]"
            />

            <button
              type="button"
              onClick={() =>
                setShow((prev) => ({
                  ...prev,
                  password: !prev.password,
                }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-disabled)] hover:text-[var(--color-text-secondary)]"
              aria-label={show.password ? "Hide password" : "Show password"}
            >
              {show.password ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {errors.password && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.password}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Confirm Password
          </label>

          <div className="relative">
            <input
              type={show.confirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 pr-10 text-sm outline-none focus:border-[var(--color-info)]"
            />

            <button
              type="button"
              onClick={() =>
                setShow((prev) => ({
                  ...prev,
                  confirm: !prev.confirm,
                }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-disabled)] hover:text-[var(--color-text-secondary)]"
              aria-label={show.confirm ? "Hide password" : "Show password"}
            >
              {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </form>
    </AppModal>
  );
}
