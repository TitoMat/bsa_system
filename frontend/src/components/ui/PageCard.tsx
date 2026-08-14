import type { PropsWithChildren } from "react";

type PageCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function PageCard({ title, subtitle, children }: PageCardProps) {
  return (
    <section
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: 'var(--color-border-subtle)',
        background: 'var(--color-bg-surface)',
      }}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
