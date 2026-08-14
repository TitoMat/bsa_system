import { useState, useEffect, useCallback, useRef } from "react";
import type { LatLng } from "../types/maps.types";
import { isValidCoordinate } from "../utils/coordinates";

type UseCurrentLocationResult = {
  location: LatLng | null;
  loading: boolean;
  error: string | null;
  request: () => void;
};

export function useCurrentLocation(): UseCurrentLocationResult {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchingRef = useRef<number | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    setError(null);

    if (watchingRef.current !== null) {
      navigator.geolocation.clearWatch(watchingRef.current);
      watchingRef.current = null;
    }

    watchingRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (isValidCoordinate(latitude, longitude)) {
          setLocation({ latitude, longitude });
          setLoading(false);
          if (watchingRef.current !== null) {
            navigator.geolocation.clearWatch(watchingRef.current);
            watchingRef.current = null;
          }
        }
      },
      (err) => {
        setError(err.message || "Unable to retrieve your location.");
        setLoading(false);
        if (watchingRef.current !== null) {
          navigator.geolocation.clearWatch(watchingRef.current);
          watchingRef.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (watchingRef.current !== null) {
        navigator.geolocation.clearWatch(watchingRef.current);
      }
    };
  }, []);

  return { location, loading, error, request };
}