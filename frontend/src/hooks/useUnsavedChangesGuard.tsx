import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmModal } from '../components/ui/ConfirmModal';

type PendingChange = { kind: 'action'; action: () => void } | { kind: 'blocker' };

type UseUnsavedChangesGuardOptions = {
  /** Runs when a discard is confirmed, before the pending change is applied. */
  onDiscard?: () => void;
  /** Runs when the user cancels the confirmation dialog. */
  onCancel?: () => void;
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Guards against losing unsaved changes:
 * - `beforeunload` prompt for full page unloads / tab close
 * - `useBlocker` intercepts in-app router navigations (back/forward, links)
 * - `guard(action)` intercepts internal state changes (section/year/month)
 * All paths surface a single confirm dialog; confirmed discards apply the
 * pending change, cancelled stays put. The dialog traps focus while open and
 * restores focus to the previously active element when it closes.
 */
export function useUnsavedChangesGuard(isDirty: boolean, options: UseUnsavedChangesGuardOptions = {}) {
  const { onDiscard, onCancel } = options;
  const [pending, setPending] = useState<PendingChange | null>(null);
  const dirtyRef = useRef(isDirty);
  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const blocker = useBlocker(
    useCallback(() => dirtyRef.current, []),
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setPending({ kind: 'blocker' });
    } else if (pending?.kind === 'blocker') {
      setPending(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state]);

  const guard = useCallback((action: () => void) => {
    if (dirtyRef.current) {
      setPending({ kind: 'action', action });
    } else {
      action();
    }
  }, []);

  const hasPending = pending !== null;

  // Focus trap + restore while the confirmation dialog is open.
  useEffect(() => {
    if (!hasPending) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function findDialog(): HTMLElement | null {
      return document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    }

    function focusFirst() {
      const dialog = findDialog();
      const first = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const dialog = findDialog();
      if (!dialog) return;
      const nodes = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!dialog.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }

    focusFirst();
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [hasPending]);

  const confirmDiscard = useCallback(() => {
    const next = pending;
    setPending(null);
    if (!next) return;
    onDiscard?.();
    if (next.kind === 'action') {
      next.action();
    } else if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker, onDiscard, pending]);

  const cancelDiscard = useCallback(() => {
    setPending(null);
    onCancel?.();
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker, onCancel]);

  const modalElement = hasPending ? (
    <ConfirmModal
      open
      title="Discard unsaved changes?"
      message="You have unsaved changes in this report. They will be lost if you continue."
      confirmLabel="Discard Changes"
      cancelLabel="Stay"
      variant="danger"
      onConfirm={confirmDiscard}
      onCancel={cancelDiscard}
    />
  ) : null;

  return { guard, modalElement, hasPending };
}
