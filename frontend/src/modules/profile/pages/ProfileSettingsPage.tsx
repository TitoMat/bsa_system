import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../../features/auth/useAuthStore';
import { SettingsNavigation } from '../components/SettingsNavigation';
import type { SettingsSection } from '../components/SettingsNavigation';
import { ProfileInformationSection } from '../components/ProfileInformationSection';
import { AccountSummaryPanel } from '../components/AccountSummaryPanel';
import { QuickActionsPanel } from '../components/QuickActionsPanel';
import { Button } from '../../../shared/components/Button';
import { ThemeToggle } from '../../../components/theme/ThemeToggle';
import { useSidebarStore } from '../../../features/sidebar/useSidebarStore';
import { Alert } from '../../../shared/components/Alert';
import { changePasswordRequest } from '../../../api/auth';
import { getMySignature, revokeMySignature, uploadMySignature } from '../services/profile.api';
import type { SignatureMetadata } from '../types/profile.types';
import { touchSession } from '../../../lib/session';

const MOBILE_TABS: { id: SettingsSection; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'layout', label: 'Sidebar' },
];

function generatePassword(length = 20): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = upper + lower + digits + special;
  const getRandom = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
  const required = [getRandom(upper), getRandom(lower), getRandom(digits), getRandom(special)];
  for (let i = required.length; i < length; i++) required.push(getRandom(all));
  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }
  return required.join('');
}

type AlertState =
  | { type: 'success' | 'error'; message: string }
  | null;

export default function ProfileSettingsPage() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  const [signature, setSignature] = useState<SignatureMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertState>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => { void loadSignature(); }, []);

  useEffect(() => {
    if (searchParams.get('changePassword') === 'true') {
      setActiveSection('security');
      setPasswordOpen(true);
    }
  }, [searchParams]);

  async function loadSignature() {
    try { setLoading(true); setSignature(await getMySignature()); }
    catch { setSignature(null); }
    finally { setLoading(false); }
  }

  async function handleSignatureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setSubmitting(true); setAlert(null);
      const uploaded = await uploadMySignature(file); setSignature(uploaded);
      setAlert({ type: 'success', message: 'Signature saved securely.' });
    } catch (error) {
      setAlert({ type: 'error', message: error instanceof Error ? error.message : 'Failed to upload signature.' });
    } finally { e.target.value = ''; setSubmitting(false); }
  }

  async function handleRevokeSignature() {
    try {
      setSubmitting(true); setAlert(null);
      await revokeMySignature(); setSignature(null);
      setAlert({ type: 'success', message: 'Signature revoked.' });
    } catch (error) {
      setAlert({ type: 'error', message: error instanceof Error ? error.message : 'Failed to revoke signature.' });
    } finally { setSubmitting(false); }
  }

  const handleGenerate = useCallback(() => {
    const pw = generatePassword();
    setPwForm((prev) => ({ ...prev, newPassword: pw, confirmPassword: pw }));
    setPwShow((prev) => ({ ...prev, next: true, confirm: true }));
  }, []);

  function validatePw() {
    const errs: Record<string, string> = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!pwForm.newPassword) errs.newPassword = 'New password is required';
    else if (pwForm.newPassword.length < 8) errs.newPassword = 'New password must be at least 8 characters';
    if (!pwForm.confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (pwForm.newPassword !== pwForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (pwForm.currentPassword && pwForm.newPassword && pwForm.currentPassword === pwForm.newPassword)
      errs.newPassword = 'New password must be different';
    return errs;
  }

  async function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault(); touchSession();
    const errs = validatePw(); setPwErrors(errs); setAlert(null);
    if (Object.keys(errs).length > 0) return;
    try {
      setPwSubmitting(true);
      await changePasswordRequest({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setAlert({ type: 'success', message: 'Password updated.' });
      setPasswordOpen(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setAlert({ type: 'error', message: error?.response?.data?.message || error?.message || 'Failed to change password.' });
    } finally { setPwSubmitting(false); }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading profile...</p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    borderColor: 'var(--color-border-default)',
    color: 'var(--color-text-primary)',
    background: 'var(--color-bg-surface)',
  };

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: 'calc(100dvh - var(--topbar-height, 60px))',
        background: `
          radial-gradient(circle at 85% 0%, var(--color-brand-softer), transparent 30%),
          linear-gradient(135deg, var(--color-bg-canvas-alt) 0%, var(--color-bg-surface-muted) 50%, var(--color-bg-subtle) 100%)
        `,
      }}
    >
      <div className="flex flex-1 flex-col gap-5 px-6 pb-6 pt-6 lg:flex-row">
        <aside className="hidden w-[180px] shrink-0 lg:block">
          <div
            className="rounded-2xl border p-3"
            style={{
              background: 'var(--color-bg-surface)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            <SettingsNavigation active={activeSection} onChange={setActiveSection} />
          </div>
        </aside>

        <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
          {MOBILE_TABS.map((tab) => {
            const isActive = tab.id === activeSection;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition"
                style={{
                  background: isActive ? 'var(--color-brand-soft)' : 'var(--color-bg-surface)',
                  color: isActive ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <main className="min-w-0 flex-1">
          <div
            className="rounded-2xl border p-6 shadow-sm"
            style={{
              background: 'var(--color-bg-surface)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            {alert && (
              <div className="mb-4">
                <Alert variant={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
              </div>
            )}

            {activeSection === 'profile' && (
              <ProfileInformationSection user={user} onRefreshUser={refreshMe} />
            )}
            {activeSection === 'account' && <AccountSection user={user} />}
            {activeSection === 'security' && (
              <SecuritySection
                passwordOpen={passwordOpen}
                setPasswordOpen={setPasswordOpen}
                pwForm={pwForm}
                setPwForm={setPwForm}
                pwShow={pwShow}
                setPwShow={setPwShow}
                pwErrors={pwErrors}
                setPwErrors={setPwErrors}
                pwSubmitting={pwSubmitting}
                handlePwSubmit={handlePwSubmit}
                handleGenerate={handleGenerate}
                inputStyle={inputStyle}
              />
            )}
            {activeSection === 'notifications' && (
              <PlaceholderSection title="Notifications" description="Manage your notification preferences." />
            )}
            {activeSection === 'appearance' && <AppearanceSection />}
            {activeSection === 'layout' && <LayoutSection />}
          </div>

          {activeSection === 'profile' && (
            <div
              className="mt-5 rounded-2xl border p-6 shadow-sm"
              style={{
                background: 'var(--color-bg-surface)',
                borderColor: 'var(--color-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    My Signature
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {loading ? 'Loading...' : signature ? `Active — ${signature.mimeType}` : 'No signature uploaded'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => sigInputRef.current?.click()}
                    disabled={submitting}
                  >
                    {signature ? 'Replace' : 'Upload'}
                  </Button>
                  <input
                    ref={sigInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={submitting}
                    onChange={handleSignatureChange}
                  />
                  {signature && (
                    <Button
                      variant="danger-outline"
                      size="sm"
                      onClick={() => void handleRevokeSignature()}
                      disabled={submitting}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <aside className="w-full space-y-5 lg:w-[260px] lg:shrink-0">
          <AccountSummaryPanel user={user} />
          <QuickActionsPanel />
        </aside>
      </div>
    </div>
  );
}

function PlaceholderSection({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {description}
      </p>
      <div
        className="mt-8 rounded-2xl border-2 border-dashed px-6 py-12 text-center"
        style={{ borderColor: 'var(--color-border-default)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          This section is coming soon.
        </p>
      </div>
    </div>
  );
}

function AccountSection({ user }: { user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']> }) {
  return (
    <div>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Account
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Your account details and employee information.
      </p>
      <div className="mt-6 space-y-4">
        <FieldDisplay label="Name" value={user.name} />
        <FieldDisplay label="Email" value={user.email} />
        <FieldDisplay label="Role" value={user.role} />
        <FieldDisplay label="Status" value={user.isActive !== false ? 'Active' : 'Inactive'} />
        <FieldDisplay label="Theme Preference" value={user.themePreference || 'System'} />
      </div>
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="pb-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

type SecuritySectionProps = {
  passwordOpen: boolean;
  setPasswordOpen: (v: boolean) => void;
  pwForm: { currentPassword: string; newPassword: string; confirmPassword: string };
  setPwForm: React.Dispatch<React.SetStateAction<{ currentPassword: string; newPassword: string; confirmPassword: string }>>;
  pwShow: { current: boolean; next: boolean; confirm: boolean };
  setPwShow: React.Dispatch<React.SetStateAction<{ current: boolean; next: boolean; confirm: boolean }>>;
  pwErrors: Record<string, string>;
  setPwErrors: (v: Record<string, string>) => void;
  pwSubmitting: boolean;
  handlePwSubmit: (e: React.FormEvent) => Promise<void>;
  handleGenerate: () => void;
  inputStyle: React.CSSProperties;
};

function SecuritySection({
  passwordOpen,
  setPasswordOpen,
  pwForm,
  setPwForm,
  pwShow,
  setPwShow,
  pwErrors,
  setPwErrors,
  pwSubmitting,
  handlePwSubmit,
  handleGenerate,
  inputStyle,
}: SecuritySectionProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Security
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Manage your password and security settings.
      </p>
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border p-4"
          style={{ borderColor: 'var(--color-border-subtle)' }}>
          <button
            type="button"
            onClick={() => setPasswordOpen(!passwordOpen)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Password
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Update your account password
              </p>
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--color-brand)' }}>
              {passwordOpen ? 'Close' : 'Change'}
            </span>
          </button>

          {passwordOpen && (
            <form onSubmit={handlePwSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={pwShow.current ? 'text' : 'password'}
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="h-11 w-full rounded-xl border px-3 pr-11 text-sm outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setPwShow((p) => ({ ...p, current: !p.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {pwShow.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {pwErrors.currentPassword && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{pwErrors.currentPassword}</p>
                )}
              </div>

              <div
                className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
                style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-bg-subtle)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Generate a secure temporary password
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
                  style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                >
                  <RefreshCw size={16} />
                  Generate
                </button>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={pwShow.next ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className="h-11 w-full rounded-xl border px-3 pr-11 text-sm outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setPwShow((p) => ({ ...p, next: !p.next }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {pwShow.next ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {pwErrors.newPassword && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{pwErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={pwShow.confirm ? 'text' : 'password'}
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="h-11 w-full rounded-xl border px-3 pr-11 text-sm outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setPwShow((p) => ({ ...p, confirm: !p.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {pwShow.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {pwErrors.confirmPassword && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{pwErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setPasswordOpen(false); setPwErrors({}); }}
                  className="h-10 rounded-xl border px-4 text-sm font-medium"
                  style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwSubmitting}
                  className="h-10 rounded-xl px-4 text-sm font-semibold text-[var(--color-text-on-brand)] disabled:opacity-60"
                  style={{ background: 'var(--gradient-brand)' }}
                >
                  {pwSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-4 rounded-2xl border p-4"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Multi-Factor Authentication
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Not enabled
            </p>
          </div>
          <Button variant="secondary" size="sm" disabled>
            Set Up MFA
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSection() {
  return (
    <div>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Appearance
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Customize your interface theme and display preferences.
      </p>
      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Theme
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Light, Dark, or System
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function LayoutSection() {
  const { collapsed, setCollapsed } = useSidebarStore();

  return (
    <div>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Sidebar
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Configure your sidebar display preferences.
      </p>
      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Collapsed Sidebar
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Icons only — hover or click to reveal sub-menu items
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={collapsed}
            onClick={() => setCollapsed(!collapsed)}
            className="relative inline-flex h-[26px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:ring-offset-2"
            style={{
              background: collapsed ? 'var(--color-brand)' : 'var(--color-bg-subtle)',
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out"
              style={{ transform: collapsed ? 'translateX(18px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
