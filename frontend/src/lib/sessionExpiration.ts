export const SESSION_EXPIRED_EVENT = 'bsa:session-expired';

export const SESSION_EXPIRING_EVENT = 'bsa:session-expiring';
export type SessionExpiredDetail = {
  reason?: 'expired' | 'api' | 'logout' | 'proactive';
};

export type SessionExpiringDetail = SessionExpiredDetail & {
  expiresAt?: number;
};

type SessionExpiringHandler = (detail: SessionExpiringDetail) => void | Promise<void>;

let noticeActive = false;
let expiringActive = false;
const sessionExpiringHandlers = new Set<SessionExpiringHandler>();

export function registerSessionExpiringHandler(handler: SessionExpiringHandler) {
  sessionExpiringHandlers.add(handler);
  return () => {
    sessionExpiringHandlers.delete(handler);
  };
}

export async function notifySessionExpiring(detail: SessionExpiringDetail = {}) {
  if (expiringActive || window.location.pathname === '/login') {
    return;
  }

  expiringActive = true;
  window.dispatchEvent(
    new CustomEvent<SessionExpiringDetail>(SESSION_EXPIRING_EVENT, { detail }),
  );

  try {
    await Promise.allSettled(
      [...sessionExpiringHandlers].map((handler) => handler(detail)),
    );
  } finally {
    expiringActive = false;
  }
}

export async function notifySessionExpired(detail: SessionExpiredDetail = {}) {
  if (noticeActive || window.location.pathname === '/login') {
    return;
  }

  noticeActive = true;
  await notifySessionExpiring(detail);
  window.dispatchEvent(
    new CustomEvent<SessionExpiredDetail>(SESSION_EXPIRED_EVENT, { detail }),
  );
}

export function resetSessionExpiredNotice() {
  noticeActive = false;
}

export function getJwtExpiresAt(token: string | null) {
  if (!token) return null;

  const [, payload] = token.split('.');
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalized));
    const expiresAt = Number(decoded?.exp || 0) * 1000;

    return expiresAt || null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string | null) {
  const expiresAt = getJwtExpiresAt(token);
  return expiresAt !== null && expiresAt <= Date.now();
}
