// frontend/src/lib/tokenRefresh.ts
import { useAuthStore } from "../features/auth/useAuthStore";
import { refreshTokenRequest } from "../api/auth";
import {
  getJwtExpiresAt,
  notifySessionExpired,
} from "./sessionExpiration";

export const TOKEN_REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // refresh when < 10 min left

let refreshInFlight: Promise<string | null> | null = null;

function tokenRemainingMs(token: string | null): number {
  const expiresAt = getJwtExpiresAt(token);
  if (expiresAt === null) return Number.POSITIVE_INFINITY;
  return expiresAt - Date.now();
}

/** Return the current token, refreshing it first when it is expired or close
 *  to expiry. Concurrent callers share a single in-flight refresh.
 *  Returns null when refresh is required but fails (session must end).
 */
export async function ensureFreshToken(): Promise<string | null> {
  const token = useAuthStore.getState().token;

  if (tokenRemainingMs(token) > TOKEN_REFRESH_THRESHOLD_MS) {
    return token;
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const freshToken = await refreshTokenRequest();
        if (freshToken) {
          useAuthStore.getState().setToken(freshToken);
        }
        return freshToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  const refreshed = await refreshInFlight;
  if (refreshed) return refreshed;

  await notifySessionExpired({ reason: "expired" });
  return null;
}
