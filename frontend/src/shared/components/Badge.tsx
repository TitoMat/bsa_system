import type { ReactNode } from 'react';

export type BadgeScheme = keyof typeof SCHEME_STYLES;

const SCHEME_STYLES = {
  emerald: { background: 'var(--color-success-soft)', color: 'var(--color-success)', border: 'var(--color-success-border)' },
  rose: { background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: 'var(--color-danger-border)' },
  amber: { background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: 'var(--color-warning-border)' },
  sky: { background: 'var(--color-brand-soft)', color: 'var(--color-brand)', border: 'var(--color-brand)' },
  zinc: { background: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)', border: 'var(--color-border-default)' },
  orange: { background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: 'var(--color-warning-border)' },
  indigo: { background: 'var(--color-info-soft)', color: 'var(--color-info)', border: 'var(--color-info-border)' },
  blue: { background: 'var(--color-info-soft)', color: 'var(--color-info)', border: 'var(--color-info-border)' },
} as const;

type BadgeProps = {
  scheme?: BadgeScheme;
  children: ReactNode;
  className?: string;
};

const baseClasses = 'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none';

export function Badge({ scheme = 'zinc', children, className }: BadgeProps) {
  const s = SCHEME_STYLES[scheme];
  return (
    <span
      className={[baseClasses, className].filter(Boolean).join(' ')}
      style={{ background: s.background, color: s.color, borderColor: s.border }}
    >
      {children}
    </span>
  );
}

// --- StatusBadge (auto-maps known status strings to schemes) ---

const STATUS_MAP: Record<string, BadgeScheme> = {
  ACTIVE: 'emerald',
  INACTIVE: 'zinc',
  DRAFT: 'amber',
  SUBMITTED: 'indigo',
  VOIDED: 'zinc',
  COMPLETED: 'emerald',
  FAILED: 'rose',
  RUNNING: 'amber',
  QUEUED: 'sky',
  CANCELLED: 'zinc',
  MATCHED: 'emerald',
  UNMATCHED: 'rose',
  PROCESSING: 'sky',
  PROCESSED: 'emerald',
  PENDING: 'amber',
  LOCKED: 'rose',
  SUPERSEDED: 'orange',
  RETURNED: 'orange',
  REJECTED: 'rose',
  ARCHIVED: 'amber',
  GENERATED: 'emerald',
  SUPERADMIN: 'rose',
  ADMIN: 'blue',
  USER: 'zinc',
  UPLOADED: 'amber',
  NOT_FINAL: 'amber',
  WITH_VARIANCE: 'rose',
  WARNING: 'orange',
  STRESS: 'rose',
  QA: 'emerald',
  UNAPPROVED: 'amber',
  // Project Command Center
  Received: 'sky',
  'On going': 'blue',
  'Under Internal Review': 'sky',
  'For Revision': 'orange',
  'Pending Signature': 'amber',
  'Scheduled for Submission': 'sky',
  'Submitted to PAGCOR': 'indigo',
  'PAGCOR Acknowledged': 'indigo',
  'Under PAGCOR Evaluation': 'amber',
  'Pending Approval': 'amber',
  Approved: 'emerald',
  'On Hold': 'zinc',
  Completed: 'emerald',
  Cancelled: 'zinc',
  Rejected: 'rose',
  'To Do': 'zinc',
  'In Progress': 'sky',
  Waiting: 'amber',
};

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const scheme = STATUS_MAP[status] ?? 'zinc';
  return (
    <Badge scheme={scheme} className={className}>
      {status}
    </Badge>
  );
}
