// frontend/src/modules/users/components/UserLockStatus.tsx
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

dayjs.extend(duration);

type Props = {
  lockedUntil?: string | null;
};

export default function UserLockStatus({ lockedUntil }: Props) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const now = dayjs();
      const end = dayjs(lockedUntil);

      const diff = end.diff(now, "second");
      setRemaining(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  if (!lockedUntil) return null;

  if (remaining <= 0) {
    return (
      <span className="text-xs text-[var(--color-success)] font-medium">
        Unlocked
      </span>
    );
  }

  const d = dayjs.duration(remaining, "seconds");

  return (
    <div className="flex items-center gap-1 text-xs text-[var(--color-danger)] font-medium">
      <Clock className="h-3.5 w-3.5" />
      {d.minutes()}m {d.seconds()}s
    </div>
  );
}