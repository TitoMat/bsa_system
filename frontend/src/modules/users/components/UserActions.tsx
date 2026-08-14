import { Unlock, RotateCcw, Power } from "lucide-react";
import { Button } from "../../../shared/components/Button";
import type { UserItem } from "../types/user.types";

type Props = {
  user: UserItem;
  onUnlock: (user: UserItem) => void;
  onReset: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
};

export default function UserActions({
  user,
  onUnlock,
  onReset,
  onToggleStatus,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      {user.isLocked && (
        <Button type="button" size="sm" variant="success-outline" onClick={() => onUnlock(user)}>
          <Unlock className="h-3.5 w-3.5" />
          Unlock
        </Button>
      )}

      <Button type="button" size="sm" variant="secondary" onClick={() => onReset(user)}>
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>

      <Button
        type="button"
        size="sm"
        variant={user.status === "ACTIVE" ? 'danger-outline' : 'secondary'}
        onClick={() => onToggleStatus(user)}
      >
        <Power className="h-3.5 w-3.5" />
        {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}