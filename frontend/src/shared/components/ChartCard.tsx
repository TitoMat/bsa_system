import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartCardProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  type?: "line" | "bar";
  accentClass?: string;
  valueFormatter?: (value: number) => string;
  loading?: boolean;
  emptyMessage?: string;
}

const defaultFormatter = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  formatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-md"
      style={{
        background: "var(--color-bg-elevated)",
        borderColor: "var(--color-border-default)",
      }}
    >
      <p style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p
        className="mt-1 font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {formatter(payload[0].value)}
      </p>
    </div>
  );
}

export function ChartCard({
  title,
  description,
  data,
  type = "line",
  accentClass = "bg-[var(--color-brand)]",
  valueFormatter = defaultFormatter,
  loading = false,
  emptyMessage = "No data available.",
}: ChartCardProps) {
  const hasData = data.length > 0;
  const brandColor = "var(--color-brand)";
  const mutedColor = "var(--color-text-muted)";

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border shadow-sm"
      style={{
        borderColor: "var(--color-border-subtle)",
        background: "var(--color-bg-surface)",
      }}
    >
      <div className={`h-1 w-full ${accentClass}`} />
      <div className="flex flex-col p-5">
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </p>
        {description && (
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {description}
          </p>
        )}

        <div className="mt-4" style={{ height: 220 }}>
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs" style={{ color: mutedColor }}>
                Loading...
              </p>
            </div>
          ) : hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              {type === "line" ? (
                <LineChart
                  data={data}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-subtle)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: mutedColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: mutedColor }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                      return String(v);
                    }}
                  />
                  <Tooltip
                    content={<CustomTooltip formatter={valueFormatter} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={brandColor}
                    strokeWidth={2}
                    dot={{ r: 3, fill: brandColor }}
                    activeDot={{ r: 5, fill: brandColor }}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={data}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-subtle)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: mutedColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: mutedColor }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                      return String(v);
                    }}
                  />
                  <Tooltip
                    content={<CustomTooltip formatter={valueFormatter} />}
                  />
                  <Bar
                    dataKey="value"
                    fill={brandColor}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs" style={{ color: mutedColor }}>
                {emptyMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
