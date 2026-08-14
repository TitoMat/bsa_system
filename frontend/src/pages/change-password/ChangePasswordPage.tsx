import { useCallback, useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { changePasswordRequest, logoutRequest } from "../../api/auth";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useNavigate } from "react-router-dom";
import { touchSession } from "../../lib/session";
import { Alert } from "../../shared/components/Alert";

type AlertState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

function generatePassword(length = 20): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const all = upper + lower + digits + special;

  const getRandom = (pool: string) => pool[Math.floor(Math.random() * pool.length)];

  const required = [
    getRandom(upper), getRandom(lower),
    getRandom(digits), getRandom(special),
  ];

  for (let i = required.length; i < length; i++) {
    required.push(getRandom(all));
  }

  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join("");
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const logoutLocal = useAuthStore((state) => state.logoutLocal);

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertState>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleGenerate = useCallback(() => {
    const pw = generatePassword();
    setForm((prev) => ({ ...prev, newPassword: pw, confirmPassword: pw }));
    setShow((prev) => ({ ...prev, next: true, confirm: true }));
  }, []);

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!form.currentPassword) {
      nextErrors.currentPassword = "Current password is required";
    }
    if (!form.newPassword) {
      nextErrors.newPassword = "New password is required";
    } else if (form.newPassword.length < 8) {
      nextErrors.newPassword = "New password must be at least 8 characters";
    }
    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password";
    } else if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    if (
      form.currentPassword &&
      form.newPassword &&
      form.currentPassword === form.newPassword
    ) {
      nextErrors.newPassword = "New password must be different";
    }
    return nextErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    touchSession();
    const nextErrors = validate();
    setErrors(nextErrors);
    setAlert(null);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      setSubmitting(true);
      await changePasswordRequest({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      await logoutRequest().catch(() => undefined);
      logoutLocal();
      navigate("/login", {
        replace: true,
        state: {
          message: "Password updated. Please log in again.",
        },
      });
    } catch (error: any) {
      setAlert({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to change password.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    borderColor: "var(--color-border-default)",
    color: "var(--color-text-primary)",
    background: "var(--color-bg-surface)",
  };

  return (
    <div className="space-y-6">
      {alert ? (
        <Alert variant={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Current Password
          </label>
          <div className="relative">
            <input
              type={show.current ? "text" : "password"}
              value={form.currentPassword}
              onChange={(e) => update("currentPassword", e.target.value)}
              className="h-11 w-full rounded-xl border px-3 pr-11 text-sm outline-none"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() =>
                setShow((prev) => ({ ...prev, current: !prev.current }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 transition"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={show.current ? "Hide password" : "Show password"}
            >
              {show.current ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
              {errors.currentPassword}
            </p>
          )}
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            New Password
          </label>
          <div className="relative">
            <input
              type={show.next ? "text" : "password"}
              value={form.newPassword}
              onChange={(e) => update("newPassword", e.target.value)}
              className="h-11 w-full rounded-xl border px-3 pr-[88px] text-sm outline-none"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShow((prev) => ({ ...prev, next: !prev.next }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={show.next ? "Hide password" : "Show password"}
            >
              {show.next ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
              {errors.newPassword}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
          style={{
            borderColor: "var(--color-border-default)",
            background: "var(--color-bg-subtle)",
          }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Generate a secure temporary password
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
            style={{
              borderColor: "var(--color-border-default)",
              color: "var(--color-text-secondary)",
            }}
          >
            <RefreshCw size={16} />
            Generate
          </button>
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={show.confirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              className="h-11 w-full rounded-xl border px-3 pr-11 text-sm outline-none"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() =>
                setShow((prev) => ({ ...prev, confirm: !prev.confirm }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 transition"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={show.confirm ? "Hide password" : "Show password"}
            >
              {show.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-11 rounded-xl border px-4 text-sm font-medium"
            style={{
              borderColor: "var(--color-border-default)",
              color: "var(--color-text-secondary)",
              background: "var(--color-bg-surface)",
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-xl px-4 text-sm font-semibold text-[var(--color-text-on-brand)] disabled:opacity-60"
            style={{ background: "var(--gradient-brand)" }}
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
