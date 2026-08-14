import dayjs from 'dayjs';
import type { User } from '../../../features/auth/useAuthStore';

type AccountSummaryPanelProps = {
  user: User;
};

export function AccountSummaryPanel({ user }: AccountSummaryPanelProps) {
  const statusLabel = user.isActive !== false ? 'Active' : 'Inactive';
  const memberSince = user.createdAt
    ? dayjs(user.createdAt).format('MMM DD, YYYY')
    : '—';
  const lastLogin = user.updatedAt
    ? dayjs(user.updatedAt).format('MMM DD, YYYY h:mm A')
    : '—';

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--color-bg-surface)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Account Summary
      </h3>

      <div className="space-y-4">
        <SummaryRow label="Account Type" value={user.role || 'User'} />
        <SummaryRow label="Status" value={statusLabel} badge />
        <SummaryRow label="Member Since" value={memberSince} />
        <SummaryRow label="Last Login" value={lastLogin} />
        <SummaryRow label="Assigned Role" value={user.role || '—'} />
      </div>
    </div>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  badge?: boolean;
};

function SummaryRow({ label, value, badge }: SummaryRowProps) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      {badge ? (
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            background: 'var(--color-success-soft)',
            color: 'var(--color-success)',
          }}
        >
          {value}
        </span>
      ) : (
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {value}
        </p>
      )}
    </div>
  );
}
