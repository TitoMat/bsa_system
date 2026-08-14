import { useState, useCallback } from "react";
import type { LatLng } from "../types/maps.types";
import { isValidCoordinate } from "../utils/coordinates";

type UseMapSelectionResult = {
  onMapClick: (e: { lngLat: { lng: number; lat: number } }) => void;
  selectedPoint: LatLng | null;
  setSelectedPoint: (p: LatLng | null) => void;
}

export function useMapSelection(
  onSelect: (point: LatLng) => void
): UseMapSelectionResult {
  const [selectedPoint, setSelectedPoint] = useState<LatLng | null>(null);

  const onMapClick = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      const { lng, lat } = e.lngLat;
      if (!isValidCoordinate(lat, lng)) return;
      const point: LatLng = { latitude: lat, longitude: lng };
      setSelectedPoint(point);
      onSelect(point);
    },
    [onSelect]
  );

  return { onMapClick, selectedPoint, setSelectedPoint };
}