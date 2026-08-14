import { useState, useEffect, useRef, useCallback } from "react";
import { searchPoi } from "../api/maps.api";
import type { PoiMarker } from "../types/maps.types";

type UsePoiSearchOptions = {
  latitude: number;
  longitude: number;
  radius?: number;
  enabled?: boolean;
};

type UsePoiSearchResult = {
  pois: PoiMarker[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function usePoiSearch(
  categories: string[],
  { latitude, longitude, radius = 5000, enabled = false }: UsePoiSearchOptions,
): UsePoiSearchResult {
  const [pois, setPois] = useState<PoiMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPois = useCallback(() => {
    if (!enabled || categories.length === 0) {
      setPois([]);
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
        const results = await searchPoi(latitude, longitude, radius, categories);
        setPois(results);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load POIs. Please try again.");
        setPois([]);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [enabled, categories, latitude, longitude, radius]);

  useEffect(() => {
    const cleanup = fetchPois();
    return () => cleanup?.();
  }, [fetchPois]);

  const refresh = useCallback(() => {
    fetchPois();
  }, [fetchPois]);

  return { pois, loading, error, refresh };
}
