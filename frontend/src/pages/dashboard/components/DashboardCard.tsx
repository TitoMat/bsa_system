// frontend/src/pages/dashboard/components/DashboardCard.tsx
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";

export function DashboardCard({
  icon: Icon,
  title,
  actionLabel,
  actionTo,
  footer,
  flush = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  actionLabel?: string;
  actionTo?: string;
  footer?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border"
      style={{
        background: "var(--color-bg-surface)",
        borderColor: "var(--color-border-subtle)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <header
        className="flex items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "var(--color-brand-soft)", color: "var(--color-brand)" }}
          >
            <Icon size={16} aria-hidden="true" />
          </span>
          <h3
            className="truncate text-sm font-semibold"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {title}
          </h3>
        </div>
        {actionLabel && actionTo ? (
          <Link
            to={actionTo}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--color-brand)" }}
          >
            {actionLabel}
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        ) : null}
      </header>

      <div className={flush ? "flex flex-1 flex-col" : "flex flex-1 flex-col p-4"}>{children}</div>

      {footer ? (
        <footer
          className="border-t px-4 py-2.5"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {footer}
          </p>
        </footer>
      ) : null}
    </section>
  );
}

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg"
          style={{ background: "var(--color-bg-subtle)" }}
        />
      ))}
    </div>
  );
}

export function WidgetEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-muted)" }}>
      {message}
    </div>
  );
}

export function WidgetErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border px-4 py-6 text-center text-sm"
      style={{
        borderColor: "var(--color-danger-border)",
        background: "var(--color-danger-soft)",
        color: "var(--color-danger)",
      }}
    >
      <span>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
          style={{
            borderColor: "var(--color-danger-border)",
            background: "var(--color-bg-surface)",
            color: "var(--color-danger)",
          }}
        >
          <RefreshCw size={12} aria-hidden="true" />
          Retry
        </button>
      ) : null}
    </div>
  );
}
