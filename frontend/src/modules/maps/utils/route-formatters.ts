import type { RouteResult, GeoJSONFeature } from "../types/maps.types";
import { formatDistance, formatDuration } from "./coordinates";

export function formatRouteSummary(route: RouteResult): {
  distance: string;
  duration: string;
} {
  return {
    distance: formatDistance(route.distanceMeters),
    duration: formatDuration(route.durationSeconds),
  };
}

export function routeToGeoJSON(route: RouteResult): GeoJSONFeature {
  return {
    type: "Feature",
    properties: {
      routeType: "recommended",
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
    },
    geometry: {
      type: "LineString",
      coordinates: route.geometry.coordinates,
    },
  };
}