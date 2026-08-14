// frontend/src/components/layout/SessionWarningModal.tsx
import { AppModal } from "../ui/AppModal";

type Props = {
  open: boolean;
  remainingSeconds: number;
  onStaySignedIn: () => void;
  onLogout: () => void;
};

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SessionWarningModal({
  open,
  remainingSeconds,
  onStaySignedIn,
  onLogout,
}: Props) {
  return (
    <AppModal
      open={open}
      onClose={onLogout}
      title="Session expiring soon"
      className="max-w-md"
      closeOnEscape={false}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onLogout} className="h-11 rounded-xl border border-[var(--color-border-default)] px-4 text-sm font-medium text-[var(--color-text-secondary)]">Logout now</button>
          <button type="button" onClick={onStaySignedIn} className="h-11 rounded-xl bg-[var(--color-info)] px-4 text-sm font-semibold text-[var(--color-text-on-brand)]">Stay signed in</button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          You've been inactive for a while. You'll be logged out in{' '}
          <span className="font-semibold text-[var(--color-danger)]">{formatSeconds(remainingSeconds)}</span>.
        </p>
        <div className="rounded-2xl border border-[var(--color-warning-border)] bg-[var(--color-warning-soft)] px-4 py-3 text-sm text-[var(--color-warning)]">
          Select <span className="font-semibold">Stay signed in</span> to continue your session.
        </div>
      </div>
    </AppModal>
  );
}
