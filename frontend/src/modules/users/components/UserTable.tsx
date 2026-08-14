import type { AuthMe, UserItem } from "../types/user.types";
import { Badge, StatusBadge } from "../../../shared/components/Badge";
import { ActionIconButton } from "../../../shared/components/ActionIconButton";
import { LoadingState } from "../../../shared/components/LoadingState";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Pencil, Power, RotateCcw, Unlock } from "lucide-react";
import UserLockTimer from "./UserLockTimer";

function getInitials(name?: string) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

type Props = {
  items: UserItem[];
  loading: boolean;
  currentUser: AuthMe | null;
  canEditUsers: boolean;
  canResetPasswords: boolean;
  canUnlockUsers: boolean;
  canToggleUserStatus: boolean;
  onEdit: (user: UserItem) => void;
  onReset: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
  onUnlock: (user: UserItem) => void;
};

export default function UserTable({
  items,
  loading,
  currentUser,
  canEditUsers,
  canResetPasswords,
  canUnlockUsers,
  canToggleUserStatus,
  onEdit,
  onReset,
  onToggleStatus,
  onUnlock,
}: Props) {
  if (loading) {
    return <LoadingState message="Loading users..." />;
  }

  if (!items.length) {
    return <EmptyState title="No users found" />;
  }

  return (
    <div className="table-shell">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Security</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const disableDeactivateSelf = isSelf && u.status === "ACTIVE";
              const canToggleThisUser =
                canToggleUserStatus && !disableDeactivateSelf;

              return (
                <tr key={u.id}>
                  <td className="align-top">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                          style={{
                            background: 'var(--color-brand-soft)',
                            color: 'var(--color-brand)',
                          }}
                        >
                          {getInitials(u.fullName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.fullName}</div>
                        <div className="truncate text-sm table-cell-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="align-top">
                    <StatusBadge status={u.role} />
                  </td>

                  <td className="align-top">
                    <StatusBadge status={u.status} />
                  </td>

                  <td className="align-top">
                    <div className="flex flex-col gap-2">
                      {u.mustChangePassword ? (
                        <Badge scheme="amber">Must change password</Badge>
                      ) : null}

                      {u.isLocked ? (
                        <>
                          <Badge scheme="rose">Locked</Badge>
                          <UserLockTimer lockedUntil={u.lockedUntil} />
                        </>
                      ) : null}

                      <span className="text-xs table-cell-muted">
                        Failed attempts: {u.failedLoginAttempts ?? 0}
                      </span>
                    </div>
                  </td>

                  <td className="align-top text-center">
                    <div className="flex justify-center gap-2">
                      {canEditUsers ? (
                        <ActionIconButton
                          title={`Edit ${u.fullName || "user"}`}
                          onClick={() => onEdit(u)}
                          tone="sky"
                        >
                          <Pencil size={14} />
                        </ActionIconButton>
                      ) : null}

                      {canResetPasswords && !u.isLocked ? (
                        <ActionIconButton
                          title={`Reset password for ${u.fullName || "user"}`}
                          onClick={() => onReset(u)}
                        >
                          <RotateCcw size={14} />
                        </ActionIconButton>
                      ) : null}

                      {canUnlockUsers && u.isLocked ? (
                        <ActionIconButton
                          title={`Reset and unlock ${u.fullName || "user"}`}
                          onClick={() => onUnlock(u)}
                          tone="emerald"
                        >
                          <Unlock size={14} />
                        </ActionIconButton>
                      ) : null}

                      {canToggleUserStatus ? (
                        <ActionIconButton
                          title={
                            !canToggleThisUser
                              ? "You cannot deactivate your own account."
                              : u.status === "ACTIVE"
                                ? `Deactivate ${u.fullName || "user"}`
                                : `Activate ${u.fullName || "user"}`
                          }
                          onClick={() => onToggleStatus(u)}
                          disabled={!canToggleThisUser}
                          tone={u.status === "ACTIVE" ? "red" : "emerald"}
                        >
                          <Power size={14} />
                        </ActionIconButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
