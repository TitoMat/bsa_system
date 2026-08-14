import { useState, useEffect, useRef, useCallback } from "react";
import { calculateRoute } from "../api/maps.api";
import type { LatLng, RouteResult } from "../types/maps.types";
import { isValidCoordinate } from "../utils/coordinates";

type UseRouteCalculationResult = {
  route: RouteResult | null;
  loading: boolean;
  error: string | null;
  calculate: (origin: LatLng, destination: LatLng) => void;
  clearRoute: () => void;
};

export function useRouteCalculation(): UseRouteCalculationResult {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<{ origin: LatLng; destination: LatLng } | null>(null);

  const calculate = useCallback(async (origin: LatLng, destination: LatLng) => {
    if (!isValidCoordinate(origin.latitude, origin.longitude)) {
      setError("Invalid pickup coordinates.");
      return;
    }
    if (!isValidCoordinate(destination.latitude, destination.longitude)) {
      setError("Invalid destination coordinates.");
      return;
    }

    const key = `${origin.latitude},${origin.longitude}-${destination.latitude},${destination.longitude}`;
    const lastKey = lastRequestRef.current
      ? `${lastRequestRef.current.origin.latitude},${lastRequestRef.current.origin.longitude}-${lastRequestRef.current.destination.latitude},${lastRequestRef.current.destination.longitude}`
      : null;

    if (key === lastKey && route) return;
    lastRequestRef.current = { origin, destination };

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await calculateRoute(
        {
          origin,
          destination,
          travelMode: "car",
        },
        abortRef.current?.signal
      );
      setRoute(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Unable to calculate a route between these locations.");
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }, [route]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
    lastRequestRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return { route, loading, error, calculate, clearRoute };
}