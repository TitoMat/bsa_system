import { api } from "../../../api/axios";
import type {
  SearchResult,
  ReverseGeocodeResult,
  RouteRequest,
  RouteResult,
  PoiMarker,
} from "../types/maps.types";

export const searchLocation = async (q: string, limit = 5): Promise<SearchResult[]> => {
  const response = await api.get("/maps/search", {
    params: { q, limit },
  });
  const data = response.data as SearchResult[] | { results?: SearchResult[] };
  return Array.isArray(data) ? data : (data.results ?? []);
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> => {
  const response = await api.get("/maps/reverse", {
    params: { latitude, longitude },
  });
  const data = response.data as Record<string, unknown>;
  const location = data.location as ReverseGeocodeResult | undefined;
  return (data.displayName ? data : (location ?? data)) as unknown as ReverseGeocodeResult;
};

export const calculateRoute = async (
  body: RouteRequest,
  signal?: AbortSignal
): Promise<RouteResult> => {
  const response = await api.post(
    "/maps/route",
    {
      originLatitude: body.origin.latitude,
      originLongitude: body.origin.longitude,
      destinationLatitude: body.destination.latitude,
      destinationLongitude: body.destination.longitude,
      travelMode: body.travelMode,
    },
    { signal }
  );
  const data = response.data as Record<string, unknown>;
  const route = data.route as RouteResult | undefined;
  return (data.distanceMeters ? data : (route ?? data)) as unknown as RouteResult;
};

export const searchPoi = async (
  latitude: number,
  longitude: number,
  radius = 5000,
  categories?: string[],
): Promise<PoiMarker[]> => {
  const params: Record<string, string | number> = { latitude, longitude, radius };
  if (categories && categories.length > 0) {
    params.categories = categories.join(",");
  }
  const response = await api.get("/maps/poi", { params });
  return (response.data ?? []) as PoiMarker[];
};
