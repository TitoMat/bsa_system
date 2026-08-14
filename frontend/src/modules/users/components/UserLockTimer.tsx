// frontend/src/modules/users/components/UserLockTimer.tsx
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../shared/components/Badge";

type Props = {
  lockedUntil?: string | null;
};

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
}

export default function UserLockTimer({ lockedUntil }: Props) {
  const targetTime = useMemo(() => {
    if (!lockedUntil) return null;

    const parsed = new Date(lockedUntil).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }, [lockedUntil]);

  const [remainingMs, setRemainingMs] = useState(() => {
    if (!targetTime) return 0;
    return Math.max(0, targetTime - Date.now());
  });

  useEffect(() => {
    if (!targetTime) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      setRemainingMs(Math.max(0, targetTime - Date.now()));
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [targetTime]);

  if (!targetTime) return null;
  if (remainingMs <= 0) return null;

  return (
    <Badge scheme="amber">Locked: {formatRemaining(remainingMs)}</Badge>
  );
}