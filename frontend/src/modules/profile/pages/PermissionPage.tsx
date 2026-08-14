// frontend/src/modules/admin-tools/pages/PermissionPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Lock, Search, Trash2, X } from "lucide-react";
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { meRequest } from "../../../api/auth";
import { useAuthStore } from "../../../features/auth/useAuthStore";
import { useConfirm } from "../../../hooks/useConfirm";
import { getUsers } from "../../users/services/users.api";
import type { UserItem } from "../../users/types/user.types";
import {
  createPermissionRole,
  disablePermissionRole,
  getPermissionMatrix,
  getUserPermissionOverrides,
  updatePermissionMatrix,
  updateUserPermissionOverrides,
} from "../services/permissions.api";
import type {
  PermissionGroup,
  PermissionItem,
  PermissionMatrixResponse,
  UserPermissionOverrideEffect,
  UserPermissionOverridesResponse,
} from "../types/permissions.types";

function isPermissionMatrixResponse(
  value: unknown,
): value is PermissionMatrixResponse {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  return (
    Array.isArray(record.roles) &&
    Array.isArray(record.groups) &&
    !!record.rolePermissions &&
    typeof record.rolePermissions === "object"
  );
}

function getUserDisplayName(user: {
  email: string;
  name?: string | null;
  fullName?: string | null;
  username?: string | null;
}): string {
  return user.name ?? user.fullName ?? user.username ?? user.email;
}

function getGroupKey(group: PermissionGroup) {
  return group.module;
}

function sortPermissions(a: PermissionItem, b: PermissionItem): number {
  const cmp = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  return a.key.localeCompare(b.key, undefined, { sensitivity: 'base' });
}

function sortGroups(groups: PermissionGroup[]): PermissionGroup[] {
  return [...groups]
    .map((g) => ({
      ...g,
      permissions: [...g.permissions].sort(sortPermissions),
    }))
    .sort((a, b) =>
      a.module.localeCompare(b.module, undefined, { sensitivity: 'base' }),
    );
}

function filterGroups(
  groups: PermissionGroup[],
  search: string,
): { groups: PermissionGroup[]; matchCount: number } {
  const q = search.trim().toLowerCase();
  if (!q) return { groups, matchCount: 0 };

  let matchCount = 0;
  const result = groups
    .map((group) => {
      const categoryMatch = group.module.toLowerCase().includes(q);
      const filteredPermissions = group.permissions.filter((p) => {
        const match =
          p.label.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q);
        if (match) matchCount++;
        return match;
      });

      if (categoryMatch) {
        matchCount += group.permissions.length;
        return { ...group, permissions: [...group.permissions] };
      }

      if (filteredPermissions.length > 0) {
        return { ...group, permissions: filteredPermissions };
      }

      return null;
    })
    .filter((item): item is PermissionGroup => item !== null);

  return { groups: result, matchCount };
}

function getEffectiveOpenState(
  openGroups: Record<string, boolean>,
  search: string,
  groups: PermissionGroup[],
): Record<string, boolean> {
  const q = search.trim().toLowerCase();
  if (!q) return openGroups;

  return Object.fromEntries(
    groups.map((g) => {
      const key = getGroupKey(g);
      const categoryMatch = g.module.toLowerCase().includes(q);
      const permMatch = g.permissions.some(
        (p) => p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
      );
      return [key, categoryMatch || permMatch];
    }),
  );
}

function buildInitialOpenState(groups: PermissionGroup[]) {
  return Object.fromEntries(groups.map((group) => [getGroupKey(group), false]));
}

function getPermissionDescription(permission: PermissionItem): string {
  const verb = permission.label.trim();
  const lower = verb.charAt(0).toLowerCase() + verb.slice(1);
  return `Allows the user to ${lower}.`;
}

function getRoleGroupSelectedCount(
  group: PermissionGroup,
  selectedPermissions: string[],
) {
  return group.permissions.filter((permission) =>
    selectedPermissions.includes(permission.key),
  ).length;
}

function getOverrideGroupSummary(
  group: PermissionGroup,
  draft: Record<string, UserPermissionOverrideEffect | "inherit">,
) {
  return group.permissions.reduce(
    (summary, permission) => {
      const value = draft[permission.key] ?? "inherit";

      if (value === "allow") summary.allow += 1;
      if (value === "deny") summary.deny += 1;
      if (value === "inherit") summary.inherit += 1;

      return summary;
    },
    { allow: 0, deny: 0, inherit: 0 },
  );
}

type PermissionTab = "roles" | "users";

export default function PermissionPage() {
  const [tab, setTab] = useState<PermissionTab>("roles");

  const [data, setData] = useState<PermissionMatrixResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [addingRole, setAddingRole] = useState(false);
  const [disablingRole, setDisablingRole] = useState("");
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [roleFormOpen, setRoleFormOpen] = useState(false);

  const [userOptions, setUserOptions] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userOverridesData, setUserOverridesData] =
    useState<UserPermissionOverridesResponse | null>(null);
  const [userOverridesDraft, setUserOverridesDraft] = useState<
    Record<string, UserPermissionOverrideEffect | "inherit">
  >({});
  const [userLoading, setUserLoading] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userErrorMessage, setUserErrorMessage] = useState("");

  const [rolePermissionSearch, setRolePermissionSearch] = useState("");
  const [userPermissionSearch, setUserPermissionSearch] = useState("");
  const [savedRoleOpenGroups, setSavedRoleOpenGroups] = useState<Record<string, boolean> | null>(null);
  const [savedUserOpenGroups, setSavedUserOpenGroups] = useState<Record<string, boolean> | null>(null);

  const [roleOpenGroups, setRoleOpenGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [userOpenGroups, setUserOpenGroups] = useState<Record<string, boolean>>(
    {},
  );

  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const modal = useConfirm();

  const isSuperAdminLocked = selectedRole === "SUPERADMIN";
  const selectedOverrideUser = userOverridesData?.user ?? null;
  const isSelectedOverrideUserLocked =
    selectedOverrideUser?.role === "SUPERADMIN";

  async function refreshCurrentUser() {
    try {
      const freshUser = await meRequest();
      setUser(freshUser);
    } catch (error) {
      console.error("Failed to refresh current user after permission update:", error);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getPermissionMatrix();

      if (!isPermissionMatrixResponse(response)) {
        console.error("Invalid permission matrix response:", response);
        setData(null);
        setErrorMessage("Invalid permission data returned by the server.");
        return;
      }

      setData(response);
      setRoleOpenGroups((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        return buildInitialOpenState(response.groups);
      });
      setUserOpenGroups((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        return buildInitialOpenState(response.groups);
      });

      const firstRole = response.roles[0] ?? "";
      setSelectedRole((prev) => {
        if (prev && response.roles.includes(prev)) return prev;
        return firstRole;
      });
    } catch (error) {
      console.error("Failed to load permission matrix:", error);
      setData(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load permission data.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadUserOptions() {
    try {
      setUserErrorMessage("");

      const response = await getUsers({
        page: 1,
        limit: 100,
        search: "",
        role: "",
        status: "",
      });

      setUserOptions(response.items ?? []);
      setSelectedUserId((prev) => prev || response.items?.[0]?.id || "");
    } catch (error) {
      console.error("Failed to load users for permission overrides:", error);
      setUserErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load users for advanced permissions.",
      );
    }
  }

  async function loadUserOverrides(userId: string) {
    if (!userId) {
      setUserOverridesData(null);
      setUserOverridesDraft({});
      return;
    }

    try {
      setUserLoading(true);
      setUserErrorMessage("");

      const response = await getUserPermissionOverrides(userId);
      setUserOverridesData(response);

      const draft: Record<string, UserPermissionOverrideEffect | "inherit"> = {};

      for (const group of data?.groups ?? []) {
        for (const permission of group.permissions) {
          draft[permission.key] = "inherit";
        }
      }

      for (const item of response.overrides) {
        draft[item.permission] = item.effect;
      }

      setUserOverridesDraft(draft);
    } catch (error) {
      console.error("Failed to load user permission overrides:", error);
      setUserOverridesData(null);
      setUserOverridesDraft({});
      setUserErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load user-specific permissions.",
      );
    } finally {
      setUserLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    void loadUserOptions();
  }, []);

  useEffect(() => {
    if (!data || !selectedRole) return;
    setSelectedPermissions(data.rolePermissions[selectedRole] ?? []);
  }, [data, selectedRole]);

  useEffect(() => {
    if (tab === "users" && data && selectedUserId) {
      void loadUserOverrides(selectedUserId);
    }
  }, [tab, data, selectedUserId]);

  const roleOpenGroupsRef = useRef(roleOpenGroups);
  roleOpenGroupsRef.current = roleOpenGroups;

  useEffect(() => {
    if (rolePermissionSearch.trim() && !savedRoleOpenGroups) {
      setSavedRoleOpenGroups({ ...roleOpenGroupsRef.current });
    } else if (!rolePermissionSearch.trim() && savedRoleOpenGroups) {
      setRoleOpenGroups(savedRoleOpenGroups);
      setSavedRoleOpenGroups(null);
    }
  }, [rolePermissionSearch, savedRoleOpenGroups]);

  const userOpenGroupsRef = useRef(userOpenGroups);
  userOpenGroupsRef.current = userOpenGroups;

  useEffect(() => {
    if (userPermissionSearch.trim() && !savedUserOpenGroups) {
      setSavedUserOpenGroups({ ...userOpenGroupsRef.current });
    } else if (!userPermissionSearch.trim() && savedUserOpenGroups) {
      setUserOpenGroups(savedUserOpenGroups);
      setSavedUserOpenGroups(null);
    }
  }, [userPermissionSearch, savedUserOpenGroups]);

  const permissionCount = useMemo(() => {
    return selectedPermissions.length;
  }, [selectedPermissions]);

  const sortedGroups = useMemo(() => data ? sortGroups(data.groups) : [], [data]);

  const filteredRoleResult = useMemo(
    () => filterGroups(sortedGroups, rolePermissionSearch),
    [sortedGroups, rolePermissionSearch],
  );

  const filteredUserResult = useMemo(
    () => filterGroups(sortedGroups, userPermissionSearch),
    [sortedGroups, userPermissionSearch],
  );

  const effectiveRoleOpenGroups = useMemo(
    () => getEffectiveOpenState(roleOpenGroups, rolePermissionSearch, sortedGroups),
    [roleOpenGroups, rolePermissionSearch, sortedGroups],
  );

  const effectiveUserOpenGroups = useMemo(
    () => getEffectiveOpenState(userOpenGroups, userPermissionSearch, sortedGroups),
    [userOpenGroups, userPermissionSearch, sortedGroups],
  );

  const roleDetails = useMemo(() => {
    const details = new Map(
      (data?.roleDetails ?? []).map((role) => [role.key, role]),
    );

    return (data?.roles ?? []).map((role) => ({
      key: role,
      name: details.get(role)?.name ?? role,
      description: details.get(role)?.description ?? null,
      isSystem: details.get(role)?.isSystem ?? ["SUPERADMIN", "ADMIN", "USER"].includes(role),
    }));
  }, [data]);

  const selectedRoleDetail = useMemo(
    () => roleDetails.find((role) => role.key === selectedRole) ?? null,
    [roleDetails, selectedRole],
  );

  const filteredUserOptions = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();

    if (!keyword) return userOptions;

    return userOptions.filter((item) => {
      const displayName = getUserDisplayName(item).toLowerCase();

      return (
        displayName.includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        item.role.toLowerCase().includes(keyword)
      );
    });
  }, [userOptions, userSearch]);

  function toggleRoleOpenGroup(groupKey: string) {
    setRoleOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }

  function toggleUserOpenGroup(groupKey: string) {
    setUserOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }

  function expandAllRoleGroups() {
    if (!data) return;
    setRoleOpenGroups(
      Object.fromEntries(data.groups.map((group) => [getGroupKey(group), true])),
    );
  }

  function collapseAllRoleGroups() {
    if (!data) return;
    setRoleOpenGroups(
      Object.fromEntries(data.groups.map((group) => [getGroupKey(group), false])),
    );
  }

  function expandAllUserGroups() {
    if (!data) return;
    setUserOpenGroups(
      Object.fromEntries(data.groups.map((group) => [getGroupKey(group), true])),
    );
  }

  function collapseAllUserGroups() {
    if (!data) return;
    setUserOpenGroups(
      Object.fromEntries(data.groups.map((group) => [getGroupKey(group), false])),
    );
  }

  function togglePermission(key: string) {
    if (isSuperAdminLocked) return;

    setSelectedPermissions((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key],
    );
  }

  async function handleSaveRolePermissions() {
    if (!selectedRole || isSuperAdminLocked) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      await updatePermissionMatrix({
        role: selectedRole,
        permissions: selectedPermissions,
      });

      await loadData();
      setSuccessMessage("Permissions saved successfully.");

      if (currentUser?.role === selectedRole) {
        await refreshCurrentUser();
      }
    } catch (error) {
      console.error("Failed to save permission matrix:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save permission changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRole(event: React.FormEvent) {
    event.preventDefault();

    const name = roleForm.name.trim();
    if (!name) {
      setErrorMessage("Role name is required.");
      return;
    }

    try {
      setAddingRole(true);
      setErrorMessage("");
      setSuccessMessage("");

      const created = await createPermissionRole({
        name,
        description: roleForm.description.trim() || undefined,
      });

      setRoleForm({ name: "", description: "" });
      setRoleFormOpen(false);
      setSelectedRole(created.key);
      await loadData();
      setSuccessMessage("Role created successfully.");
    } catch (error) {
      console.error("Failed to create role:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create role.",
      );
    } finally {
      setAddingRole(false);
    }
  }

  async function handleDisableRole(role: {
    key: string;
    name: string;
    isSystem: boolean;
  }) {
    if (role.isSystem) return;

    const accepted = await modal.confirm({
      title: "Disable custom role?",
      message: `Disable "${role.name}"? Reassign active users first if this role is currently in use.`,
      confirmLabel: "Disable",
      variant: "danger",
    });

    if (!accepted) return;

    try {
      setDisablingRole(role.key);
      setErrorMessage("");
      setSuccessMessage("");
      await disablePermissionRole(role.key);
      if (selectedRole === role.key) {
        setSelectedRole("ADMIN");
      }
      await loadData();
      setSuccessMessage("Role disabled successfully.");
    } catch (error) {
      console.error("Failed to disable role:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to disable role.",
      );
    } finally {
      setDisablingRole("");
    }
  }

  function setOverrideValue(
    permissionKey: string,
    value: UserPermissionOverrideEffect | "inherit",
  ) {
    if (isSelectedOverrideUserLocked) return;

    setUserOverridesDraft((prev) => ({
      ...prev,
      [permissionKey]: value,
    }));
  }

  async function handleSaveUserOverrides() {
    if (!selectedUserId || isSelectedOverrideUserLocked) return;

    try {
      setUserSaving(true);
      setUserErrorMessage("");

      const overrides = Object.entries(userOverridesDraft)
        .filter(([, effect]) => effect !== "inherit")
        .map(([permission, effect]) => ({
          permission,
          effect: effect as UserPermissionOverrideEffect,
        }));

      await updateUserPermissionOverrides(selectedUserId, { overrides });

      await loadUserOverrides(selectedUserId);

      if (currentUser?.id === selectedUserId) {
        await refreshCurrentUser();
      }
    } catch (error) {
      console.error("Failed to save user-specific permissions:", error);
      setUserErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save advanced user permissions.",
      );
    } finally {
      setUserSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading permissions...</div>;
  }

  if (errorMessage && !data) {
    return (
 <div className="rounded-2xl border border-[var(--color-danger-border)] p-6 shadow-sm" style={{ background: 'var(--color-bg-surface)' }}>
 <h1 className="text-lg font-semibold " style={{ color: 'var(--color-danger)' }}>
          Failed to load permissions
        </h1>
 <p className="mt-2 text-sm " style={{ color: 'var(--color-text-secondary)' }}>{errorMessage}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6">No permission data found.</div>;
  }

  return (
    <div className="space-y-6">
  <div className="rounded-2xl border p-2 shadow-sm" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)' }}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("roles")}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              tab === "roles" ? "text-[var(--color-text-on-brand)]" : "text-[var(--color-text-secondary)]",
            ].join(" ")}
            style={{ background: tab === "roles" ? 'var(--color-brand)' : 'var(--color-bg-subtle)' }}
          >
            Role Permissions
          </button>

          <button
            type="button"
            onClick={() => setTab("users")}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              tab === "users" ? "text-[var(--color-text-on-brand)]" : "text-[var(--color-text-secondary)]",
            ].join(" ")}
            style={{ background: tab === "users" ? 'var(--color-brand)' : 'var(--color-bg-subtle)' }}
          >
            Advanced User Permissions
          </button>
        </div>
      </div>

      {tab === "roles" ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
  <div className="rounded-2xl border p-6 shadow-sm" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)' }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Roles</h1>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setRoleFormOpen((prev) => !prev);
                  setErrorMessage("");
                }}
              >
                Add Role
              </Button>
            </div>

            {roleFormOpen ? (
              <form
                onSubmit={handleCreateRole}
                className="mb-4 space-y-3 rounded-2xl border p-3"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    Role name
                  </label>
                  <input
                    value={roleForm.name}
                    onChange={(event) =>
                      setRoleForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border px-3 text-sm outline-none focus:border-[var(--color-brand)]"
                    style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    Description
                  </label>
                  <textarea
                    value={roleForm.description}
                    onChange={(event) =>
                      setRoleForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                    style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setRoleFormOpen(false);
                      setRoleForm({ name: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={addingRole}
                  >
                    {addingRole ? "Adding..." : "Create Role"}
                  </Button>
                </div>
              </form>
            ) : null}

            <div className="space-y-2">
              {roleDetails.map((role) => {
                const isActive = role.key === selectedRole;
                const locked = role.key === "SUPERADMIN";

                return (
                  <div
                    key={role.key}
                    className={[
                      "w-full rounded-xl border px-4 py-3 text-left transition",
                      isActive ? "font-semibold" : "",
                    ].join(" ")}
                    style={{
                      background: isActive ? 'var(--color-brand-soft)' : 'transparent',
                      borderColor: isActive ? 'var(--color-border-strong)' : 'var(--color-border-subtle)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRole(role.key)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" />
                          ) : null}
                          <span className="truncate text-sm font-semibold">
                            {role.name}
                          </span>
                          {locked ? (
                            <Lock size={14} className="shrink-0 text-[var(--color-warning)]" />
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {data.rolePermissions[role.key]?.length ?? 0} permissions
                        </div>
                        {role.description ? (
                          <div className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {role.description}
                          </div>
                        ) : null}
                      </button>

                      {!role.isSystem ? (
                        <button
                          type="button"
                          onClick={() => void handleDisableRole(role)}
                          disabled={disablingRole === role.key}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                          title="Disable custom role"
                          aria-label={`Disable ${role.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

  <div className="rounded-2xl border p-6 shadow-sm" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)' }}>
  <div className="mb-6 flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Permission Editor
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Editing role:{" "}
                  <span className="font-medium">
                    {selectedRoleDetail?.name ?? selectedRole}
                  </span>
                </p>
                {isSuperAdminLocked ? (
                  <Badge scheme="amber" className="mt-2 items-center gap-2 font-medium">
                    <Lock size={12} />
                    SUPERADMIN permissions are locked.
                  </Badge>
                ) : null}
              </div>

              <div className="min-w-0 w-full md:w-auto md:min-w-[240px]">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={rolePermissionSearch}
                    onChange={(e) => setRolePermissionSearch(e.target.value)}
                    placeholder="Search permissions by name, category, or key..."
                    aria-label="Search permissions"
                    className="h-9 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] pl-9 pr-8 text-xs outline-none transition focus:border-[var(--color-brand)]"
                    style={{ color: 'var(--color-text-primary)' }}
                  />
                  {rolePermissionSearch ? (
                    <button
                      type="button"
                      onClick={() => setRolePermissionSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {rolePermissionSearch.trim() ? (
                  <Badge scheme="zinc">
                    {filteredRoleResult.matchCount} match{filteredRoleResult.matchCount !== 1 ? 'es' : ''}
                  </Badge>
                ) : null}
                <Badge scheme="zinc">
                  {permissionCount} selected
                </Badge>
                <Button variant="secondary" size="sm" onClick={expandAllRoleGroups}>
                  Expand All
                </Button>
                <Button variant="secondary" size="sm" onClick={collapseAllRoleGroups}>
                  Collapse All
                </Button>
                <Button variant="primary" onClick={handleSaveRolePermissions} disabled={saving || isSuperAdminLocked}>
                  {saving ? "Saving..." : "Save Permissions"}
                </Button>
              </div>
            </div>

            {errorMessage ? (
              <div className="mb-4 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm" style={{ color: 'var(--color-danger)' }}>
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mb-4 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-soft)] px-4 py-3 text-sm" style={{ color: 'var(--color-success)' }}>
                {successMessage}
              </div>
            ) : null}

            <div className="space-y-3">
              {filteredRoleResult.groups.map((group) => {
                const groupKey = getGroupKey(group);
                const isOpen = effectiveRoleOpenGroups[groupKey] ?? false;
                const selectedCount = getRoleGroupSelectedCount(
                  group,
                  selectedPermissions,
                );

                return (
                  <div
                    key={group.module}
                    className="overflow-hidden rounded-2xl border"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleRoleOpenGroup(groupKey)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-bg-subtle)]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {isOpen ? (
                          <ChevronDown size={16} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                        ) : (
                          <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                        )}

                        <div className="min-w-0">
                          <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                            {group.module}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {selectedCount} of {group.permissions.length} selected
                          </div>
                        </div>
                      </div>

                      <Badge scheme="zinc">
                        {group.permissions.length} permissions
                      </Badge>
                    </button>

                    {isOpen ? (
                      <div className="grid gap-3 border-t p-4 md:grid-cols-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
                        {group.permissions.map((permission) => {
                          const checked = selectedPermissions.includes(permission.key);

                          return (
                            <label
                              key={permission.key}
                              className={[
                                "flex items-start gap-3 rounded-xl border p-4 transition",
                                isSuperAdminLocked ? "cursor-not-allowed opacity-70" : "",
                              ].join(" ")}
                              style={{
                                borderColor: 'var(--color-border-subtle)',
                                background: isSuperAdminLocked ? 'var(--color-bg-subtle)' : 'var(--color-bg-surface)',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isSuperAdminLocked}
                                onChange={() => togglePermission(permission.key)}
                                className="mt-1"
                              />

                              <div className="min-w-0">
                                <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                  {permission.label}
                                </div>
                                <div className="mt-0.5 text-xs leading-4" style={{ color: 'var(--color-text-muted)' }} title={permission.key}>
                                  {getPermissionDescription(permission)}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
  <div className="rounded-2xl border p-6 shadow-sm" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)' }}>
              <h1 className="mb-4 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Users
            </h1>

            <input
              type="text"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search name, email, role..."
              className="mb-4 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
            />

            <div className="space-y-2">
              {filteredUserOptions.map((item) => {
                const isActive = item.id === selectedUserId;
                const locked = item.role === "SUPERADMIN";

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUserId(item.id)}
                    className={[
                      "w-full rounded-xl border px-4 py-3 text-left transition",
                      isActive ? "font-semibold" : "",
                    ].join(" ")}
                    style={{
                      background: isActive ? 'var(--color-brand-soft)' : 'transparent',
                      borderColor: isActive ? 'var(--color-border-strong)' : 'var(--color-border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" />
                          ) : null}
                          <div className="truncate text-sm font-semibold">
                            {getUserDisplayName(item)}
                          </div>
                        </div>
                        <div className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {item.email}
                        </div>
                      </div>

                      {locked ? (
                        <Lock size={14} className="shrink-0 text-[var(--color-warning)]" />
                      ) : null}
                    </div>

                    <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.role}</div>
                  </button>
                );
              })}
            </div>
          </div>

  <div className="rounded-2xl border p-6 shadow-sm" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)' }}>
  <div className="mb-6 flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Advanced User Permission Overrides
                </h2>
                {selectedOverrideUser ? (
                  <div className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Editing user:{" "}
                    <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {getUserDisplayName(selectedOverrideUser)}
                    </span>{" "}
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      ({selectedOverrideUser.email})
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Select a user to manage permission overrides.
                  </p>
                )}

                {isSelectedOverrideUserLocked ? (
                  <Badge scheme="amber" className="mt-2 items-center gap-2 font-medium">
                    <Lock size={12} />
                    SUPERADMIN user overrides are locked.
                  </Badge>
                ) : null}
              </div>

              <div className="min-w-0 w-full md:w-auto md:min-w-[240px]">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={userPermissionSearch}
                    onChange={(e) => setUserPermissionSearch(e.target.value)}
                    placeholder="Search permissions by name, category, or key..."
                    aria-label="Search permissions"
                    className="h-9 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] pl-9 pr-8 text-xs outline-none transition focus:border-[var(--color-brand)]"
                    style={{ color: 'var(--color-text-primary)' }}
                  />
                  {userPermissionSearch ? (
                    <button
                      type="button"
                      onClick={() => setUserPermissionSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {userPermissionSearch.trim() ? (
                  <Badge scheme="zinc">
                    {filteredUserResult.matchCount} match{filteredUserResult.matchCount !== 1 ? 'es' : ''}
                  </Badge>
                ) : null}
                <Button variant="secondary" size="sm" onClick={expandAllUserGroups}>
                  Expand All
                </Button>
                <Button variant="secondary" size="sm" onClick={collapseAllUserGroups}>
                  Collapse All
                </Button>
                <Button variant="primary" onClick={handleSaveUserOverrides} disabled={userSaving || !selectedUserId || isSelectedOverrideUserLocked}>
                  {userSaving ? "Saving..." : "Save Overrides"}
                </Button>
              </div>
            </div>

            {userErrorMessage ? (
              <div className="mb-4 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm" style={{ color: 'var(--color-danger)' }}>
                {userErrorMessage}
              </div>
            ) : null}

            {userLoading ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Loading user permission overrides...
              </div>
            ) : !selectedUserId ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Select a user to continue.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUserResult.groups.map((group) => {
                  const groupKey = getGroupKey(group);
                  const isOpen = effectiveUserOpenGroups[groupKey] ?? false;
                  const summary = getOverrideGroupSummary(group, userOverridesDraft);

                  return (
                    <div
                      key={group.module}
                      className="overflow-hidden rounded-2xl border"
                      style={{ borderColor: 'var(--color-border-subtle)' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleUserOpenGroup(groupKey)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-bg-subtle)]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {isOpen ? (
                            <ChevronDown size={16} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                          ) : (
                            <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                          )}

                          <div className="min-w-0">
                            <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                              {group.module}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              <span>{summary.allow} allow</span>
                              <span>{summary.deny} deny</span>
                              <span>{summary.inherit} inherit</span>
                            </div>
                          </div>
                        </div>

                        <Badge scheme="zinc">
                          {group.permissions.length} permissions
                        </Badge>
                      </button>

                      {isOpen ? (
                        <div className="grid gap-3 border-t p-4 md:grid-cols-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
                          {group.permissions.map((permission) => {
                            const value = userOverridesDraft[permission.key] ?? "inherit";

                            return (
                              <div
                                key={permission.key}
                                className="rounded-xl border p-4"
                                style={{ borderColor: 'var(--color-border-subtle)' }}
                              >
                                <div className="mb-4 min-w-0">
                                  <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                    {permission.label}
                                  </div>
                                  <div className="mt-1 text-xs leading-4" style={{ color: 'var(--color-text-muted)' }} title={permission.key}>
                                    {getPermissionDescription(permission)}
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  {(["inherit", "allow", "deny"] as const).map((option) => {
                                    const active = value === option;

                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        disabled={isSelectedOverrideUserLocked}
                                        onClick={() =>
                                          setOverrideValue(
                                            permission.key,
                                            option as
                                              | UserPermissionOverrideEffect
                                              | "inherit",
                                          )
                                        }
                                        className={[
                                          "rounded-xl border px-3 py-2 text-center text-xs font-semibold transition",
                                          isSelectedOverrideUserLocked
                                            ? "cursor-not-allowed opacity-70"
                                            : "",
                                        ].join(" ")}
                                        style={{
                                          background: active
                                            ? option === "allow"
                                              ? 'var(--color-brand)'
                                              : option === "deny"
                                                ? 'var(--color-danger)'
                                                : 'var(--color-bg-subtle)'
                                            : 'var(--color-bg-surface)',
                                          color: active
                                            ? option === "allow" || option === "deny"
                                              ? 'var(--color-text-on-brand)'
                                              : 'var(--color-text-primary)'
                                            : 'var(--color-text-secondary)',
                                          borderColor: active
                                            ? option === "allow"
                                              ? 'var(--color-brand)'
                                              : option === "deny"
                                                ? 'var(--color-danger)'
                                                : 'var(--color-border-default)'
                                            : 'var(--color-border-subtle)',
                                        }}
                                      >
                                        {option === "inherit"
                                          ? "Inherit"
                                          : option === "allow"
                                            ? "Allow"
                                            : "Deny"}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {modal.modalElement}
    </div>
  );
}
