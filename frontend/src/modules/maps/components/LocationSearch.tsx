import { useRef, useEffect, useState, useId } from "react";
import { Search } from "lucide-react";
import { useLocationSearch } from "../hooks/useLocationSearch";
import { LocationSearchResult } from "./LocationSearchResult";
import type { SearchResult } from "../types/maps.types";

type LocationSearchProps = {
  label: string;
  placeholder?: string;
  selectedValue?: string;
  onSelect: (result: SearchResult) => void;
  onClear?: () => void;
};

export function LocationSearch({ label, placeholder = "Search address", selectedValue, onSelect, onClear }: LocationSearchProps) {
  const { query, setQuery, results, loading, error, clearResults } = useLocationSearch({ selectedValue, onClear });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <label htmlFor={inputId} className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--color-brand)]"
          style={{
            borderColor: "var(--color-border-default)",
            background: "var(--color-bg-elevated)",
            color: "var(--color-text-primary)",
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              clearResults();
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            ✕
          </button>
        )}
      </div>
      {isFocused ? (
        <div className="absolute left-0 right-0 z-50 mt-1">
          <LocationSearchResult results={results} loading={loading} error={error} onSelect={onSelect} />
        </div>
      ) : null}
    </div>
  );
}