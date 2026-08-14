import { ArrowUpRight, TrendingUp } from "lucide-react";

function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface TrendPoint {
  month: string;
  amount: number;
}

interface SparklineProps {
  data: TrendPoint[];
  color: string;
  height?: number;
}

function Sparkline({ data, color, height = 32 }: SparklineProps) {
  if (!data.length) return null;

  const values = data.map((d) => d.amount);
  const max = Math.max(...values, 1);
  const width = Math.max(data.length * 8, 40);

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
    </svg>
  );
}

export interface KpiCardProps {
  eyebrow: string;
  title: string;
  value: number | null;
  trend?: TrendPoint[];
  trendLabel?: string;
  accentClass?: string;
  linkTo?: string;
  linkLabel?: string;
  format?: "number" | "currency";
}

export function KpiCard({
  eyebrow,
  title,
  value,
  trend,
  trendLabel,
  accentClass = "bg-[var(--color-brand)]",
  linkTo,
  linkLabel,
  format = "number",
}: KpiCardProps) {
  const isUnavailable = value === null;
  const displayValue = isUnavailable
    ? "\u2014"
    : format === "currency"
      ? formatCurrency(value)
      : formatCount(value);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border shadow-sm"
      style={{
        borderColor: "var(--color-border-subtle)",
        background: "var(--color-bg-surface)",
      }}
    >
      <div className={`h-1 w-full ${accentClass}`} />
      <div className="flex flex-1 flex-col p-5">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          {eyebrow}
        </p>
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {title}
        </p>
        <p
          className={`mt-4 text-4xl font-bold tabular-nums ${
            isUnavailable ? "opacity-40" : ""
          }`}
          style={{ color: "var(--color-text-primary)" }}
          aria-label={`${title}: ${displayValue}`}
        >
          {displayValue}
        </p>
        <div className="flex-1" />
        {trend && trend.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Sparkline data={trend} color="var(--color-brand)" />
            {trendLabel && (
              <span
                className="text-[11px] whitespace-nowrap"
                style={{ color: "var(--color-text-muted)" }}
              >
                {trendLabel}
              </span>
            )}
          </div>
        )}
        {linkTo && linkLabel && (
          <div
            className="mt-3 border-t pt-3"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <a
              href={linkTo}
              className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-brand)" }}
            >
              {linkLabel}
              <ArrowUpRight size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function LargeKpiCard({
  eyebrow,
  title,
  value,
  trend,
  trendLabel,
  accentClass = "bg-[var(--color-brand)]",
  linkTo,
  linkLabel,
  format = "number",
}: KpiCardProps) {
  const isUnavailable = value === null;
  const displayValue = isUnavailable
    ? "\u2014"
    : format === "currency"
      ? formatCurrency(value)
      : formatCount(value);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border shadow-sm"
      style={{
        borderColor: "var(--color-border-subtle)",
        background: "var(--color-bg-surface)",
      }}
    >
      <div className={`h-1 w-full ${accentClass}`} />
      <div className="flex flex-1 flex-col p-5">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          {eyebrow}
        </p>
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {title}
        </p>
        <p
          className={`mt-4 text-4xl font-bold tabular-nums ${
            isUnavailable ? "opacity-40" : ""
          }`}
          style={{ color: "var(--color-text-primary)" }}
          aria-label={`${title}: ${displayValue}`}
        >
          {displayValue}
        </p>
        <div className="flex-1" />
        {trend && trend.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              <TrendingUp size={14} className="inline mr-1" />
              {trendLabel || "Monthly trend"}
            </span>
          </div>
        )}
        {linkTo && linkLabel && (
          <div
            className="mt-3 border-t pt-3"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <a
              href={linkTo}
              className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-brand)" }}
            >
              {linkLabel}
              <ArrowUpRight size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
