import { useEffect, useState } from "react";
import CreateUserModal from "../components/CreateUserModal";
import EditUserModal from "../components/EditUserModal";
import ResetPasswordModal from "../components/ResetPasswordModal";
import UserFilters from "../components/UserFilters";
import { Pagination } from "../../../shared/components/Pagination";
import { Alert } from "../../../shared/components/Alert";
import UserTable from "../components/UserTable";
import {
  changeUserStatus,
  createUser,
  getAuthMe,
  getUsers,
  resetUserPassword,
  unlockUser,
  updateUser,
} from "../services/users.api";
import type {
  AuthMe,
  CreateUserPayload,
  UpdateUserPayload,
  UserItem,
  UserRole,
  UserStatus,
} from "../types/user.types";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { useAuthStore } from "../../../features/auth/useAuthStore";
import { hasPermission } from "../../../lib/permissions";

type AlertState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

export default function UsersPage() {
  const authUser = useAuthStore((state) => state.user);
  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);

  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"" | UserRole>("");
  const [roles, setRoles] = useState<UserRole[]>(["SUPERADMIN", "ADMIN", "USER"]);
  const [status, setStatus] = useState<"" | UserStatus>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [alert, setAlert] = useState<AlertState>(null);
  const [modalError, setModalError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const userPermissions = authUser?.permissions ?? [];
  const canCreateUsers = hasPermission(userPermissions, "users.create");
  const canEditUsers = hasPermission(userPermissions, "users.edit");
  const canChangeUserStatus = hasPermission(
    userPermissions,
    "users.change_status",
  );
  const canResetPasswords = hasPermission(
    userPermissions,
    "users.reset_password",
  );
  const canUnlockUsers = hasPermission(userPermissions, "users.unlock");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void loadAuthMe();
    void loadRoles();
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [page, limit, search, role, status]);

  async function loadAuthMe() {
    try {
      const me = await getAuthMe();
      setCurrentUser(me);
    } catch {
      setCurrentUser(null);
    }
  }

  async function loadRoles() {
    setRoles(["SUPERADMIN", "ADMIN", "USER"]);
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setAlert(null);

      const res = await getUsers({
        page,
        limit,
        search,
        role,
        status,
      });

      setItems(res.items ?? []);
      setPage(res.page ?? 1);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (error) {
      setAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load users.",
      });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    if (!canCreateUsers) {
      console.warn("[PERMISSION] create blocked");
      return;
    }

    setModalError("");
    setCreateOpen(true);
  }

  function openEdit(user: UserItem) {
    if (!canEditUsers) return;

    setSelectedUser(user);
    setModalError("");
    setEditOpen(true);
  }

  function openReset(user: UserItem) {
    if (!canResetPasswords || user.isLocked) return;

    setSelectedUser(user);
    setModalError("");
    setResetOpen(true);
  }

  function openResetAndUnlock(user: UserItem) {
    if (!canUnlockUsers || !user.isLocked) return;

    setSelectedUser(user);
    setModalError("");
    setResetOpen(true);
  }

  async function handleCreate(payload: CreateUserPayload) {
    if (!canCreateUsers) return;

    try {
      setSubmitting(true);
      setModalError("");

      await createUser(payload);

      setCreateOpen(false);
      setAlert({ type: "success", message: "User created successfully." });

      setPage(1);
      await loadUsers();
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "Failed to create user."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(payload: UpdateUserPayload) {
    if (!selectedUser || !canEditUsers) return;

    try {
      setSubmitting(true);
      setModalError("");

      await updateUser(selectedUser.id, payload);

      setEditOpen(false);
      setSelectedUser(null);
      setAlert({ type: "success", message: "User updated successfully." });

      await loadUsers();
      await loadAuthMe();
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "Failed to update user."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(newPassword: string) {
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      setModalError("");

      if (selectedUser.isLocked) {
        if (!canUnlockUsers) return;

        await unlockUser(selectedUser.id, newPassword);

        setAlert({
          type: "success",
          message:
            "Account reset and unlocked successfully. Old password is no longer valid.",
        });
      } else {
        if (!canResetPasswords) return;

        await resetUserPassword(selectedUser.id, newPassword);

        setAlert({
          type: "success",
          message:
            "Password reset successfully. Old password is no longer valid and user must change password on next login.",
        });
      }

      setResetOpen(false);
      setSelectedUser(null);

      await loadUsers();
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "Failed to reset password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(user: UserItem) {
    if (!canChangeUserStatus || currentUser?.id === user.id) return;

    const nextStatus: UserStatus =
      user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      setAlert(null);

      await changeUserStatus(user.id, {
        isActive: nextStatus === "ACTIVE",
      });

      setAlert({
        type: "success",
        message: `User ${
          nextStatus === "ACTIVE" ? "activated" : "deactivated"
        } successfully.`,
      });

      await loadUsers();
      await loadAuthMe();
    } catch (error) {
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to update status.",
      });
    }
  }

  function handleUnlock(user: UserItem) {
    openResetAndUnlock(user);
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col space-y-5">
      {alert ? (
        <Alert variant={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
      ) : null}

      <UserFilters
        canCreateUser={canCreateUsers}
        search={searchInput}
        setSearch={setSearchInput}
        role={role}
        setRole={(value) => {
          setRole(value);
          setPage(1);
        }}
        status={status}
        setStatus={(value) => {
          setStatus(value);
          setPage(1);
        }}
        roles={roles}
        onCreate={openCreate}
      />

      <div className="flex-1">
        <UserTable
          items={items}
          loading={loading}
          currentUser={currentUser}
          canEditUsers={canEditUsers}
          canResetPasswords={canResetPasswords}
          canUnlockUsers={canUnlockUsers}
          canToggleUserStatus={canChangeUserStatus}
          onEdit={openEdit}
          onReset={openReset}
          onToggleStatus={handleToggleStatus}
          onUnlock={handleUnlock}
        />
      </div>

      <div className="mt-auto border-t pt-4" style={{ borderColor: 'var(--color-border-default)' }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          label="users"
        />
      </div>

      <CreateUserModal
        open={createOpen}
        submitting={submitting}
        serverError={modalError}
        roles={roles}
        onClose={() => {
          setCreateOpen(false);
          setModalError("");
        }}
        onSubmit={handleCreate}
      />

      <EditUserModal
        open={editOpen}
        submitting={submitting}
        serverError={modalError}
        currentUser={currentUser}
        user={selectedUser}
        roles={roles}
        onClose={() => {
          setEditOpen(false);
          setSelectedUser(null);
          setModalError("");
        }}
        onSubmit={handleEdit}
      />

      <ResetPasswordModal
        open={resetOpen}
        submitting={submitting}
        serverError={modalError}
        user={selectedUser}
        onClose={() => {
          setResetOpen(false);
          setSelectedUser(null);
          setModalError("");
        }}
        onSubmit={handleResetPassword}
      />
    </div>
  );
}
