import { useRouteError, Link } from "react-router-dom";

export function RouteErrorElement() {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : "Something went wrong while loading this page.";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="max-w-md rounded-3xl border p-10 text-center shadow-xl"
        style={{
          borderColor: "var(--color-danger-border)",
          background: "var(--color-bg-surface)",
        }}
      >
        <p
          className="text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--color-danger)" }}
        >
          Error
        </p>
        <h1
          className="mt-2 text-2xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Something went wrong
        </h1>
        <p
          className="mt-3 break-words text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          {message}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex rounded-xl px-4 py-3 text-sm font-semibold text-[var(--color-text-on-brand)]"
            style={{ background: "var(--gradient-brand)" }}
          >
            Reload page
          </button>
          <Link
            to="/dashboard"
            className="inline-flex rounded-xl border px-4 py-3 text-sm font-semibold"
            style={{
              borderColor: "var(--color-border-default)",
              color: "var(--color-text-primary)",
            }}
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
