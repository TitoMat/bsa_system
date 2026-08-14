import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import type { User } from '../../../features/auth/useAuthStore';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Alert } from '../../../shared/components/Alert';
import { updateMyProfile, uploadMyAvatar } from '../services/profile.api';

function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type ProfileInformationSectionProps = {
  user: User;
  onRefreshUser: () => Promise<User | null>;
};

export function ProfileInformationSection({ user, onRefreshUser }: ProfileInformationSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    employeeId: '',
    phone: '',
    department: '',
    position: '',
    bio: '',
    timeZone: '',
    dateFormat: '',
  });

  function handleEdit() {
    setForm({
      employeeId: user.employeeId || '',
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || '',
      bio: '',
      timeZone: '',
      dateFormat: '',
    });
    setAlert(null);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setAlert(null);
  }

  async function handleSave() {
    setAlert(null);
    setSaving(true);
    try {
      await updateMyProfile({
        employeeId: form.employeeId || undefined,
        phone: form.phone || undefined,
        department: form.department || undefined,
        position: form.position || undefined,
      });
      await onRefreshUser();
      setAlert({ type: 'success', message: 'Profile updated successfully.' });
      setEditing(false);
    } catch (e: any) {
      setAlert({ type: 'error', message: e?.response?.data?.message || e?.message || 'Unable to save profile changes.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setAlert(null);
      await uploadMyAvatar(file);
      await onRefreshUser();
      setAlert({ type: 'success', message: 'Profile picture updated.' });
    } catch (error) {
      setAlert({ type: 'error', message: error instanceof Error ? error.message : 'Failed to upload avatar.' });
    } finally {
      e.target.value = '';
      setUploading(false);
    }
  }

  return (
    <div>
      {alert && (
        <div className="mb-4">
          <Alert variant={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Profile Information
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Your basic identity and employee details.
          </p>
        </div>
        {!editing && (
          <Button variant="secondary" size="sm" onClick={handleEdit}>
            Edit Profile
          </Button>
        )}
      </div>

      <div className="mb-8 flex items-center gap-5">
        <div className="relative shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Profile"
              className="h-[72px] w-[72px] rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-lg font-semibold"
              style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
            >
              {getInitials(user.name)}
            </div>
          )}
          {editing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition"
              style={{
                background: 'var(--color-bg-surface)',
                borderColor: 'var(--color-border-default)',
                color: 'var(--color-text-secondary)',
              }}
              title="Change photo"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {user.name}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {user.email}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldRow
            label="Full Name"
            value={user.name}
            readOnly
          />
          <FieldRow
            label="Email Address"
            value={user.email}
            readOnly
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldRow
            label="Employee ID"
            value={user.employeeId}
            readOnly={!editing}
            editing={editing}
            editValue={form.employeeId}
            onEditChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
            placeholder="Not set"
          />
          <FieldRow
            label="Phone Number"
            value={user.phone}
            readOnly={!editing}
            editing={editing}
            editValue={form.phone}
            onEditChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="Not set"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldRow
            label="Department"
            value={user.department}
            readOnly={!editing}
            editing={editing}
            editValue={form.department}
            onEditChange={(v) => setForm((f) => ({ ...f, department: v }))}
            placeholder="Not set"
          />
          <FieldRow
            label="Position"
            value={user.position}
            readOnly={!editing}
            editing={editing}
            editValue={form.position}
            onEditChange={(v) => setForm((f) => ({ ...f, position: v }))}
            placeholder="Not set"
          />
        </div>

        {editing && (
          <div className="border-t pt-5" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              About You
            </h3>
            <div>
              <Input
                label="Bio"
                placeholder="Tell us about yourself"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                maxLength={200}
              />
              <p className="mt-1 text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {form.bio.length} / 200
              </p>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="sticky bottom-0 mt-8 flex items-center justify-end gap-3 border-t bg-inherit py-4"
          style={{ borderColor: 'var(--color-border-subtle)' }}>
          <Button variant="secondary" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

type FieldRowProps = {
  label: string;
  value: string | null | undefined;
  readOnly?: boolean;
  editing?: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
  placeholder?: string;
};

function FieldRow({ label, value, readOnly, editing, editValue, onEditChange, placeholder }: FieldRowProps) {
  return (
    <div
      className="pb-4"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      {editing && !readOnly ? (
        <input
          type="text"
          value={editValue ?? ''}
          onChange={(e) => onEditChange?.(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-[8px] border px-3 text-sm outline-none transition"
          style={{
            borderColor: 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
          }}
        />
      ) : (
        <p className="text-sm" style={{ color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
          {value || placeholder || '—'}
        </p>
      )}
    </div>
  );
}
