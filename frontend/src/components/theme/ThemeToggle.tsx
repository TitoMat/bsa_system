import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

const OPTIONS = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setPreference(value)}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
            preference === value
              ? "bg-[var(--color-brand)] text-[var(--color-text-on-brand)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-muted)]"
          }`}
          aria-label={`${label} mode`}
          title={label}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
