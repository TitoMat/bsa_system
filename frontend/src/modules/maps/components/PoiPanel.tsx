import { MapPin, ChevronDown, Loader2 } from "lucide-react";
import { POI_CATEGORIES } from "../types/maps.types";

type PoiPanelProps = {
  activeCategories: string[];
  onToggleCategory: (key: string) => void;
  onToggleAll: () => void;
  loading?: boolean;
  resultCount: number;
};

export function PoiPanel({
  activeCategories,
  onToggleCategory,
  onToggleAll,
  loading,
  resultCount,
}: PoiPanelProps) {
  return (
    <div
      className="bsa-poi-panel rounded-xl border shadow-lg"
      style={{
        borderColor: "var(--color-border-subtle)",
        background: "var(--color-bg-elevated)",
      }}
    >
      <details className="group" open>
        <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          <span className="flex items-center gap-2">
            <MapPin size={14} style={{ color: "var(--color-brand)" }} />
            Nearby Places
            {loading ? (
              <Loader2 size={12} className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
            ) : resultCount > 0 ? (
              <span className="rounded-full px-1.5 text-xs" style={{ background: "var(--color-brand-soft)", color: "var(--color-brand)" }}>
                {resultCount}
              </span>
            ) : null}
          </span>
          <ChevronDown size={14} className="transition-transform duration-150 group-open:rotate-180" style={{ color: "var(--color-text-muted)" }} />
        </summary>

        <div className="border-t px-3 py-2" style={{ borderColor: "var(--color-border-subtle)" }}>
          <button
            type="button"
            onClick={onToggleAll}
            className="mb-2 text-xs font-medium underline-offset-2 hover:underline"
            style={{ color: "var(--color-brand)" }}
          >
            {activeCategories.length === 0 ? "Show all" : "Hide all"}
          </button>

          <div className="flex flex-wrap gap-1.5">
            {POI_CATEGORIES.map((cat) => {
              const isActive = activeCategories.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => onToggleCategory(cat.key)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                    isActive
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                      : "text-[var(--color-text-muted)] hover:border-[var(--color-border-default)] hover:text-[var(--color-text-secondary)]"
                  }`}
                  style={!isActive ? { borderColor: "transparent" } : undefined}
                >
                  <span className="text-xs leading-none">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}
