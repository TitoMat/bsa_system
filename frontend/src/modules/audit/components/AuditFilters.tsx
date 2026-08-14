// frontend/src/modules/audit/components/AuditFilters.tsx
import { useEffect, useState } from "react";
import { Input, Select } from "../../../shared/components/Input";
import { getUsers } from "../../users/services/users.api";
import type { UserItem } from "../../users/types/user.types";

function actionLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const ACTION_VALUES = [
  '',
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'ACTIVATE_USER',
  'DEACTIVATE_USER',
  'LOCK_USER',
  'UNLOCK_USER',
  'RESET_PASSWORD',
  'CHANGE_PASSWORD',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'CREATE_JV',
  'UPDATE_JV',
  'SEND_OTP',
  'VERIFY_OTP',
  'BULK_IMPORT',
  'EXPORT',
  'PDF_GENERATE',
  'PDF_APPROVE',
  'PDF_REJECT',
  'REQUEST_APPROVAL',
  'SUBMIT_FORM',
  'ARCHIVE',
];

const ACTION_OPTIONS = ACTION_VALUES.map((v) => ({
  value: v,
  label: v ? actionLabel(v) : 'All actions',
}));

type Props = {
  search: string;
  setSearch: (value: string) => void;
  actorEmail: string;
  setActorEmail: (value: string) => void;
  action: string;
  setAction: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  order: "ASC" | "DESC";
  setOrder: (value: "ASC" | "DESC") => void;
};

export default function AuditFilters({
  search,
  setSearch,
  actorEmail,
  setActorEmail,
  action,
  setAction,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  order,
  setOrder,
}: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    getUsers({ page: 1, limit: 500 })
      .then((res) => {
        if (!cancelled) setUsers(res.items);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const actorOptions = [
    { value: '', label: 'All actors' },
    ...users
      .filter((u) => u.email)
      .map((u) => ({ value: u.email, label: `${u.fullName} (${u.email})` })),
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search text..."
      />

      <Select
        value={actorEmail}
        onChange={(e) => setActorEmail(e.target.value)}
        options={actorOptions}
        disabled={usersLoading}
      />

      <Select
        value={action}
        onChange={(e) => setAction(e.target.value)}
        options={ACTION_OPTIONS}
      />

      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition placeholder: focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand-softer)]"
        style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
      />

      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition placeholder: focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand-softer)]"
        style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
      />

      <Select
        value={order}
        onChange={(e) => setOrder(e.target.value as "ASC" | "DESC")}
        options={[
          { value: 'DESC', label: 'Newest first' },
          { value: 'ASC', label: 'Oldest first' },
        ]}
      />
    </div>
  );
}
