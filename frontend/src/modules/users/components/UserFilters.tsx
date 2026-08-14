// frontend/src/modules/users/components/UserFilters.tsx
import type { UserRole, UserStatus } from "../types/user.types";
import { Button } from "../../../shared/components/Button";
import { Input, Select } from "../../../shared/components/Input";

type Props = {
  canCreateUser: boolean;
  search: string;
  setSearch: (value: string) => void;
  role: "" | UserRole;
  setRole: (value: "" | UserRole) => void;
  status: "" | UserStatus;
  setStatus: (value: "" | UserStatus) => void;
  roles: UserRole[];
  onCreate: () => void;
};

export default function UserFilters({
  canCreateUser,
  search,
  setSearch,
  role,
  setRole,
  status,
  setStatus,
  roles,
  onCreate,
}: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
        />

        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as "" | UserRole)}
          options={[
            { value: '', label: 'All roles' },
            ...roles.map((item) => ({ value: item, label: item })),
          ]}
        />

        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | UserStatus)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'ACTIVE', label: 'ACTIVE' },
            { value: 'INACTIVE', label: 'INACTIVE' },
          ]}
        />
      </div>

      {canCreateUser ? (
        <Button
          type="button"
          variant="primary"
          onClick={onCreate}
        >
          Create User
        </Button>
      ) : null}
    </div>
  );
}
