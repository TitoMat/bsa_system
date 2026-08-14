// frontend/src/modules/users/components/ResetPasswordModal.tsx
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { UserItem } from "../types/user.types";
import { Alert } from "../../../shared/components/Alert";
import { AppModal } from "../../../components/ui/AppModal";

type Props = {
  open: boolean;
  submitting: boolean;
  serverError: string;
  user: UserItem | null;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
};

function generateTemporaryPassword(length = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%";
  const all = upper + lower + numbers + symbols;

  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i += 1) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function ResetPasswordModal({
  open,
  submitting,
  serverError,
  user,
  onClose,
  onSubmit,
}: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setConfirmPassword("");
      setCopied(false);
      setLocalError("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open]);

  useEffect(() => {
    if (!copied) return;

    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  const isLocked = !!user?.isLocked;

  const title = useMemo(() => {
    return isLocked ? "Reset & Unlock Account" : "Reset Password";
  }, [isLocked]);

  const description = useMemo(() => {
    if (!user) return "";

    return isLocked
      ? `Set a new temporary password for ${user.email}. This will unlock the account and invalidate the old password.`
      : `Set a new temporary password for ${user.email}. The old password will no longer work.`;
  }, [isLocked, user]);

  function handleGeneratePassword() {
    const generated = generateTemporaryPassword(12);
    setNewPassword(generated);
    setConfirmPassword(generated);
    setCopied(false);
    setLocalError("");
  }

  async function handleCopyPassword() {
    if (!newPassword) return;

    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLocalError("");

    if (!newPassword || !confirmPassword) {
      setLocalError("Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    await onSubmit(newPassword);
  }

  if (!user) return null;

  return (
    <AppModal open={open} onClose={onClose} title={title} className="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-[var(--color-border-default)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="reset-password-form"
            disabled={submitting}
            className="rounded-xl bg-[var(--color-info)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-on-brand)] transition hover:bg-[var(--color-info)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? isLocked
                ? "Resetting & Unlocking..."
                : "Resetting..."
              : isLocked
              ? "Reset & Unlock"
              : "Reset Password"}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>

      <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="rounded-xl border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-subtle)]"
          >
            Generate Temporary Password
          </button>

          <button
            type="button"
            onClick={handleCopyPassword}
            disabled={!newPassword}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              !newPassword
                ? "cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-[var(--color-text-disabled)]"
                : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
            }`}
          >
            Copy Password
          </button>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
            New Password
          </label>

          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-default)] px-4 py-3 pr-12 text-sm outline-none transition focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info-soft)]"
              placeholder="Enter temporary password"
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-[var(--color-text-muted)] transition hover:text-[var(--color-text-secondary)]"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
            Confirm Password
          </label>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-default)] px-4 py-3 pr-12 text-sm outline-none transition focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info-soft)]"
              placeholder="Confirm temporary password"
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-[var(--color-text-muted)] transition hover:text-[var(--color-text-secondary)]"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {copied ? <Alert variant="success" message="Password copied to clipboard." /> : null}

        {localError ? <Alert variant="info" message={localError} /> : null}

        {serverError ? <Alert variant="error" message={serverError} /> : null}
      </form>
    </AppModal>
  );
}