import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import {
  getMySignature,
  revokeMySignature,
  uploadMyAvatar,
  uploadMySignature,
} from "../services/profile.api";
import { changePasswordRequest } from "../../../api/auth";
import type { SignatureMetadata } from "../types/profile.types";
import { Alert } from "../../../shared/components/Alert";
import { ThemeToggle } from "../../../components/theme/ThemeToggle";
import { useAuthStore } from "../../../features/auth/useAuthStore";
import { touchSession } from "../../../lib/session";

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

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
  for (let i = required.length; i < length; i++) required.push(getRandom(all));
  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }
  return required.join("");
}

type AlertState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const refreshMe = useAuthStore((state) => state.refreshMe);

  const [signature, setSignature] = useState<SignatureMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [avatarSubmitting, setAvatarSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => { void loadSignature(); }, []);

  useEffect(() => {
    if (searchParams.get("changePassword") === "true") {
      setPasswordOpen(true);
    }
  }, [searchParams]);

  async function loadSignature() {
    try { setLoading(true); setSignature(await getMySignature()); }
    catch { setSignature(null); }
    finally { setLoading(false); }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setAvatarSubmitting(true); setAlert(null);
      await uploadMyAvatar(file); await refreshMe();
      setAlert({ type: "success", message: "Profile picture updated." });
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Failed to upload avatar." });
    } finally { e.target.value = ""; setAvatarSubmitting(false); }
  }

  async function handleSignatureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setSubmitting(true); setAlert(null);
      const uploaded = await uploadMySignature(file); setSignature(uploaded);
      setAlert({ type: "success", message: "Signature saved securely." });
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Failed to upload signature." });
    } finally { e.target.value = ""; setSubmitting(false); }
  }

  async function handleRevokeSignature() {
    try {
      setSubmitting(true); setAlert(null);
      await revokeMySignature(); setSignature(null);
      setAlert({ type: "success", message: "Signature revoked." });
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Failed to revoke signature." });
    } finally { setSubmitting(false); }
  }

  const handleGenerate = useCallback(() => {
    const pw = generatePassword();
    setPwForm((prev) => ({ ...prev, newPassword: pw, confirmPassword: pw }));
    setPwShow((prev) => ({ ...prev, next: true, confirm: true }));
  }, []);

  function validatePw() {
    const errs: Record<string, string> = {};
    if (!pwForm.currentPassword) errs.currentPassword = "Current password is required";
    if (!pwForm.newPassword) errs.newPassword = "New password is required";
    else if (pwForm.newPassword.length < 8) errs.newPassword = "New password must be at least 8 characters";
    if (!pwForm.confirmPassword) errs.confirmPassword = "Please confirm your new password";
    else if (pwForm.newPassword !== pwForm.confirmPassword) errs.confirmPassword = "Passwords do not match";
    if (pwForm.currentPassword && pwForm.newPassword && pwForm.currentPassword === pwForm.newPassword)
      errs.newPassword = "New password must be different";
    return errs;
  }

  async function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault(); touchSession();
    const errs = validatePw(); setPwErrors(errs); setAlert(null);
    if (Object.keys(errs).length > 0) return;
    try {
      setPwSubmitting(true);
      await changePasswordRequest({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setAlert({ type: "success", message: "Password updated." });
      setPasswordOpen(false);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      setAlert({ type: "error", message: error?.response?.data?.message || error?.message || "Failed to change password." });
    } finally { setPwSubmitting(false); }
  }

  const inputStyle: React.CSSProperties = {
    borderColor: "var(--color-border-default)",
    color: "var(--color-text-primary)",
    background: "var(--color-bg-surface)",
  };

  return (
    <div className="max-w-2xl">
      {alert ? (
        <Alert variant={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
      ) : null}

      <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <div className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Profile Picture</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>PNG, JPEG, or WebP. Max 2MB.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Profile" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
                {getInitials(user?.name)}
              </div>
            )}
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarSubmitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-text-on-brand)] transition"
              style={{ background: 'var(--gradient-brand)' }}>
              {avatarSubmitting ? "Uploading..." : "Upload"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              disabled={avatarSubmitting} onChange={handleAvatarChange} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Theme</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Light, Dark, or System</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="py-4">
          <button type="button" onClick={() => setPasswordOpen((p) => !p)}
            className="flex w-full items-center justify-between gap-4 text-left">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Change Password</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Update your account password</p>
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--color-brand)' }}>
              {passwordOpen ? "Close" : "Change"}
            </span>
          </button>

          {passwordOpen ? (
            <form onSubmit={handlePwSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Current Password
                </label>
                <div className="relative">
                  <input type={pwShow.current ? "text" : "password"} value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="h-11 w-full rounded-xl border px-3 pr-11 text-sm outline-none" style={inputStyle} />
                  <button type="button" onClick={() => setPwShow((p) => ({ ...p, current: !p.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition" style={{ color: "var(--color-text-muted)" }}>
                    {pwShow.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {pwErrors.currentPassword && (
                  <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>{pwErrors.currentPassword}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
                style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-subtle)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    Generate a secure temporary password
                  </p>
                </div>
                <button type="button" onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
                  style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                  <RefreshCw size={16} />
                  Generate
                </button>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  New Password
                </label>
                <div className="relative">
                  <input type={pwShow.next ? "text" : "password"} value={pwForm.newPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className="h-11 w-full rounded-xl border px-3 pr-11 text-sm outline-none" style={inputStyle} />
                  <button type="button" onClick={() => setPwShow((p) => ({ ...p, next: !p.next }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition" style={{ color: "var(--color-text-muted)" }}>
                    {pwShow.next ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {pwErrors.newPassword && (
                  <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>{pwErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <input type={pwShow.confirm ? "text" : "password"} value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="h-11 w-full rounded-xl border px-3 pr-11 text-sm outline-none" style={inputStyle} />
                  <button type="button" onClick={() => setPwShow((p) => ({ ...p, confirm: !p.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition" style={{ color: "var(--color-text-muted)" }}>
                    {pwShow.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {pwErrors.confirmPassword && (
                  <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>{pwErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => { setPasswordOpen(false); setPwErrors({}); }}
                  className="h-10 rounded-xl border px-4 text-sm font-medium"
                  style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={pwSubmitting}
                  className="h-10 rounded-xl px-4 text-sm font-semibold text-[var(--color-text-on-brand)] disabled:opacity-60"
                  style={{ background: "var(--gradient-brand)" }}>
                  {pwSubmitting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>My Signature</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {loading ? "Loading..." : signature ? `Active — ${signature.mimeType}` : "No signature uploaded"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => sigInputRef.current?.click()} disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-text-on-brand)] transition"
              style={{ background: 'var(--gradient-brand)' }}>
              {signature ? "Replace" : "Upload"}
            </button>
            <input ref={sigInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
              disabled={submitting} onChange={handleSignatureChange} />
            {signature ? (
              <button type="button" onClick={handleRevokeSignature} disabled={submitting}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: 'var(--color-danger-border)', color: 'var(--color-danger)', background: 'var(--color-danger-soft)' }}>
                Revoke
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
