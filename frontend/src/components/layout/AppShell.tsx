import { useEffect, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SessionWarningModal } from "./SessionWarningModal";
import { useAuthStore } from "../../features/auth/useAuthStore";
import {
  getRemainingSessionMs,
  isSessionExpired,
  shouldWarnSessionExpiry,
  startSession,
  touchSession,
} from "../../lib/session";
import {
  notifySessionExpired,
  notifySessionExpiring,
} from "../../lib/sessionExpiration";
import { ensureFreshToken } from "../../lib/tokenRefresh";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "focus",
];

const TOKEN_CHECK_INTERVAL_MS = 30 * 1000;

type AppShellProps = PropsWithChildren<{
  noCard?: boolean;
}>;

export function AppShell({ children, noCard = false }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const logoutLocal = useAuthStore((state) => state.logoutLocal);

  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const idleAutosaveTriggeredRef = useRef(false);

  useEffect(() => {
    startSession();

    let throttled = false;
    let lastTokenCheck = 0;

    const handleActivity = () => {
      if (throttled) return;
      if (document.visibilityState !== "visible") return;

      throttled = true;
      touchSession();
      setWarningOpen(false);

      window.setTimeout(() => {
        throttled = false;
      }, 1000);
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    // visibilitychange fires on document, not window; return to the tab
    // counts as activity so the idle window resets.
    document.addEventListener("visibilitychange", handleActivity);

    const timer = window.setInterval(() => {
      const remainingMs = getRemainingSessionMs();
      const nextRemainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      setRemainingSeconds(nextRemainingSeconds);

      if (remainingMs > 2 * 60 * 1000) {
        idleAutosaveTriggeredRef.current = false;
      } else if (remainingMs > 0 && !idleAutosaveTriggeredRef.current) {
        idleAutosaveTriggeredRef.current = true;
        void notifySessionExpiring({ reason: "proactive" });
      }

      // Keep the JWT alive for active sessions even without API calls
      if (Date.now() - lastTokenCheck > TOKEN_CHECK_INTERVAL_MS) {
        lastTokenCheck = Date.now();
        if (useAuthStore.getState().token) {
          void ensureFreshToken();
        }
      }

      // Idle timeout only applies while the tab is visible; returning to the
      // tab (visibilitychange/focus) resets the window.
      if (isSessionExpired() && document.visibilityState === "visible") {
        console.log("[SESSION] idle timeout reached, logging out");
        setWarningOpen(false);
        void notifySessionExpired({ reason: "expired" });
        return;
      }

      setWarningOpen(shouldWarnSessionExpiry());
    }, 1000);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }

      document.removeEventListener("visibilitychange", handleActivity);

      window.clearInterval(timer);
    };
  }, [logoutLocal, navigate]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  function handleStaySignedIn() {
    touchSession();
    void ensureFreshToken();
    setWarningOpen(false);
  }

  async function handleLogoutNow() {
    setWarningOpen(false);
    await notifySessionExpiring({ reason: "logout" });
    logoutLocal();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <div
        id="app-shell"
        className="flex h-screen overflow-hidden"
        style={{
          background: "var(--color-bg-canvas)",
          color: "var(--color-text-primary)",
        }}
      >
        {mobileSidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 bg-[var(--color-bg-inverse)]/35 backdrop-blur-[1px] lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}

        <Sidebar mobileOpen={mobileSidebarOpen} />

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative shrink-0">
            <Topbar onOpenSidebar={() => setMobileSidebarOpen(true)} />
          </div>

          <main className="relative flex-1 overflow-y-auto p-4 lg:p-5">
            {noCard ? (
              children
            ) : (
              <div
                className="min-h-full rounded-2xl border p-4 shadow-md lg:p-6"
                style={{
                  background: "var(--color-bg-surface)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                {children}
              </div>
            )}
          </main>
        </div>
      </div>

      <SessionWarningModal
        open={warningOpen}
        remainingSeconds={remainingSeconds}
        onStaySignedIn={handleStaySignedIn}
        onLogout={() => void handleLogoutNow()}
      />
    </>
  );
}
