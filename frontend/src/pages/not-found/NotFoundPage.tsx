import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="rounded-3xl border p-10 text-center shadow-xl"
        style={{
          borderColor: "var(--color-border-default)",
          background: "var(--color-bg-surface)",
        }}
      >
        <p
          className="text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--color-brand)" }}
        >
          404
        </p>
        <h1
          className="mt-2 text-3xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Page not found
        </h1>
        <p
          className="mt-3 text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          Mukhang naligaw ang route sa corridor ng app.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-xl px-4 py-3 text-sm font-semibold text-[var(--color-text-on-brand)]"
          style={{ background: "var(--gradient-brand)" }}
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}