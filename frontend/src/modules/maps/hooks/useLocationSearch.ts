import { useState, useEffect, useRef, useCallback } from "react";
import { searchLocation } from "../api/maps.api";
import type { SearchResult } from "../types/maps.types";

type UseLocationSearchOptions = {
  selectedValue?: string;
  onClear?: () => void;
};

type UseLocationSearchResult = {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  clearResults: () => void;
};

export function useLocationSearch({ selectedValue, onClear }: UseLocationSearchOptions = {}): UseLocationSearchResult {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    if (selectedValue !== undefined) {
      skipNextSearchRef.current = true;
      setQuery(selectedValue);
      setResults([]);
      setError(null);
    }
  }, [selectedValue]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      setResults([]);
      setError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const res = await searchLocation(trimmed, 5);
        setResults(res);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const clearResults = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    onClear?.();
  }, [onClear]);

  return { query, setQuery, results, loading, error, clearResults };
}