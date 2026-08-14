// frontend/src/lib/session.ts
const SESSION_KEY = "bsa_last_activity_at";
const SESSION_DURATION_MS = 60 * 60 * 1000; // 60 minutes
const WARNING_DURATION_MS = 60 * 1000; // 1 minute

export function startSession() {
  localStorage.setItem(SESSION_KEY, Date.now().toString());
}

export function touchSession() {
  localStorage.setItem(SESSION_KEY, Date.now().toString());
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getLastActivity(): number | null {
  const value = localStorage.getItem(SESSION_KEY);
  return value ? Number(value) : null;
}

export function getRemainingSessionMs() {
  const lastActivity = getLastActivity();

  if (!lastActivity) return SESSION_DURATION_MS;

  const remaining = SESSION_DURATION_MS - (Date.now() - lastActivity);
  return Math.max(0, remaining);
}

export function isSessionExpired() {
  return getRemainingSessionMs() <= 0;
}

export function shouldWarnSessionExpiry() {
  const remaining = getRemainingSessionMs();
  return remaining > 0 && remaining <= WARNING_DURATION_MS;
}