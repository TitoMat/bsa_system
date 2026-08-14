import type { SearchResult } from "../types/maps.types";

type LocationSearchResultProps = {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  onSelect: (result: SearchResult) => void;
};

export function LocationSearchResult({ results, loading, error, onSelect }: LocationSearchResultProps) {
  if (error) {
    return (
      <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-danger-border)", background: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-surface-soft)", color: "var(--color-text-muted)" }}>
        Searching...
      </div>
    );
  }

  if (!results?.length) return null;

  return (
    <ul className="z-50 max-h-60 overflow-auto rounded-lg border shadow-lg" style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-elevated)" }}>
      {results.map((result) => (
        <li key={result.id}>
          <button
            type="button"
            onClick={() => onSelect(result)}
            className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-[var(--color-bg-surface-muted)]"
            style={{ color: "var(--color-text-primary)" }}
          >
            <span className="block font-medium">{result.name}</span>
            <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
              {result.displayName}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}