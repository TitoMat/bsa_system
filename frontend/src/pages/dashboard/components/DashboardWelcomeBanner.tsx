import { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Shuffle } from "lucide-react";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../features/auth/useAuthStore";
import { QUICK_LINKS, type DashboardQuickLink } from "../quickLinks";
import { UserAvatar } from "./UserAvatar";

function getFirstName(name?: string) {
  if (!name) return "there";
  return name.trim().split(" ")[0];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface Quote {
  text: string;
  author: string;
}

const LOCAL_QUOTES: Quote[] = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Quality means doing it right when no one is looking.", author: "Henry Ford" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
];

function pickRandomQuote(quotes: Quote[]): Quote | null {
  if (quotes.length === 0) return null;
  const index = Math.floor(Math.random() * quotes.length);
  return quotes[index];
}

function getVisibleQuickLinks(
  userPermissions: string[],
  max = 5,
): DashboardQuickLink[] {
  return QUICK_LINKS.filter((link) =>
    hasPermission(userPermissions, link.requiredPermission),
  )
    .sort((a, b) => a.priority - b.priority)
    .slice(0, max);
}

export function DashboardWelcomeBanner({
  isRefreshing = false,
  onRefresh,
}: {
  isRefreshing?: boolean;
  onRefresh?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const userPermissions = user?.permissions;

  const [quote, setQuote] = useState(() => pickRandomQuote(LOCAL_QUOTES));

  const firstName = getFirstName(user?.name);
  const greeting = getGreeting();
  const quickLinks = getVisibleQuickLinks(userPermissions ?? []);

  function handleRandomizeQuote() {
    setQuote(pickRandomQuote(LOCAL_QUOTES));
  }

  return (
    <section
      className="dashboard-welcome-banner relative overflow-hidden rounded-[18px] border p-5 lg:p-7"
      aria-labelledby="dashboard-greeting"
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 md:block" aria-hidden="true">
        <div className="dashboard-banner-blob dashboard-banner-blob-1" />
        <div className="dashboard-banner-blob dashboard-banner-blob-2" />
        <div className="dashboard-banner-blob dashboard-banner-blob-3" />
      </div>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5 lg:items-center">
          <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="lg" />

          <div className="min-w-0">
            <h2
              id="dashboard-greeting"
              className="text-xl font-bold lg:text-2xl"
              style={{ color: "var(--color-text-primary)" }}
            >
              {greeting}, {firstName}!
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Here&apos;s what needs your attention today.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-start gap-3 lg:max-w-[46%] lg:flex-1">
          {quote ? (
            <blockquote
              className="min-w-0 max-w-md flex-1 border-l-2 pl-3 text-left"
              style={{ borderColor: "var(--color-brand)" }}
            >
              <p className="text-sm italic" style={{ color: "var(--color-text-secondary)" }}>
                &ldquo;{quote.text}&rdquo;
              </p>
              {quote.author ? (
                <footer className="mt-0.5 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  — {quote.author}
                </footer>
              ) : null}
            </blockquote>
          ) : null}
          <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleRandomizeQuote}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--color-border-default)",
              background: "var(--color-bg-surface)",
              color: "var(--color-text-secondary)",
            }}
            aria-label="Show another quote"
            title="Show another quote"
          >
            <Shuffle size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: "var(--color-border-default)",
              background: "var(--color-bg-surface)",
              color: "var(--color-text-secondary)",
            }}
            aria-label="Refresh all dashboard data"
            title="Refresh all dashboard data"
          >
            <RefreshCw
              size={15}
              className={isRefreshing ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
        </div>
      </div>

      {quickLinks.length ? (
        <div className="relative mt-5 lg:mt-6">
          <p
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--color-text-muted)" }}
          >
            Quick Links
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.id}>
                  <Link
                    to={link.route}
                    className="group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition hover:-translate-y-px hover:shadow-sm"
                    style={{
                      borderColor: "var(--color-border-subtle)",
                      background: "var(--color-bg-surface)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: "var(--color-brand-soft)", color: "var(--color-brand)" }}
                    >
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block truncate text-xs font-semibold"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {link.label}
                      </span>
                      {link.description ? (
                        <span
                          className="block truncate text-[11px]"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {link.description}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
