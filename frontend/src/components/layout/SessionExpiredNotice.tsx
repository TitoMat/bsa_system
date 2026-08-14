import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../features/auth/useAuthStore';
import {
  resetSessionExpiredNotice,
  SESSION_EXPIRED_EVENT,
  type SessionExpiredDetail,
} from '../../lib/sessionExpiration';

export function SessionExpiredNotice() {
  const logoutLocal = useAuthStore((state) => state.logoutLocal);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleSessionExpired(event: Event) {
      const customEvent = event as CustomEvent<SessionExpiredDetail>;
      void customEvent.detail;

      if (window.location.pathname === '/login') {
        resetSessionExpiredNotice();
        return;
      }

      logoutLocal();
      setOpen(true);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [logoutLocal]);

  const handleRedirect = useCallback(() => {
    setOpen(false);
    resetSessionExpiredNotice();
    window.location.replace('/login');
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-[var(--color-bg-inverse)]/35 px-4 py-6 backdrop-blur-[2px] sm:items-center">
      <div
        role="alert"
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--color-bg-surface)]/70 bg-[var(--color-bg-surface)] shadow-[var(--shadow-xl)]"
      >
        <div className="h-1.5 bg-[var(--color-brand)]" />
        <div className="p-6">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
              <span className="text-lg font-semibold">i</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Your session has ended
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                Please sign in again to continue.
              </p>
              <p className="mt-3 rounded-2xl border border-[var(--color-brand-soft)] bg-[var(--color-brand-soft)] px-4 py-3 text-sm leading-6 text-[var(--color-brand)]">
                For your security, inactive sessions are automatically signed out.
              </p>
              <button
                type="button"
                onClick={handleRedirect}
                className="mt-4 w-full rounded-xl bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-on-brand)] transition-colors hover:bg-[var(--color-brand-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
              >
                Sign in again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
