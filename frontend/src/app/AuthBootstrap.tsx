// frontend/src/app/AuthBootstrap.tsx
import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { meRequest } from "../api/auth";
import { useAuthStore } from "../features/auth/useAuthStore";
import { useTheme } from "../hooks/useTheme";
import { startSession } from "../lib/session";

export function AuthBootstrap({ children }: PropsWithChildren) {
  const setUser = useAuthStore((state) => state.setUser);
  const { setPreference } = useTheme();

  // Show splash only briefly — remove immediately on mount.
  // Auth check runs in the background; ProtectedLayout handles the
  // /login redirect for unauthenticated users.
  const [mounted, setMounted] = useState(false);

  // ── Remove splash on first paint ────────────────────────────────────
  useEffect(() => {
    const splash = document.getElementById("boot-splash");
    if (splash) {
      splash.classList.add("hide");
      const id = window.setTimeout(() => splash.remove(), 300);
      setMounted(true);
      return () => window.clearTimeout(id);
    }
    setMounted(true);
  }, []);

  // ── Auth check (background, non-blocking) ───────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const nextUser = await meRequest();
        if (cancelled) return;
        if (nextUser) {
          setUser(nextUser);
          if (nextUser.themePreference) {
            setPreference(
              nextUser.themePreference as "light" | "dark" | "system",
            );
          }
          startSession();
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;

  return <>{children}</>;
}
