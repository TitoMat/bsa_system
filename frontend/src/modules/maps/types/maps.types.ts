export type LatLng = {
  latitude: number;
  longitude: number;
};

export type SearchResult = {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
};

export type ReverseGeocodeResult = {
  displayName: string;
  latitude: number;
  longitude: number;
};

export type RouteGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type GeoJSONFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  distanceLabel: string;
  durationLabel: string;
  geometry: RouteGeometry;
};

export type RouteRequest = {
  origin: LatLng;
  destination: LatLng;
  travelMode: 'car' | 'pedestrian' | 'bicycle';
};

export type MapMarker = {
  id: string;
  type: 'pickup' | 'destination';
  position: LatLng;
  address: string;
  draggable: boolean;
};

export type PoiMarker = {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
};

export const POI_CATEGORIES = [
  { key: 'fuel', label: 'Gas Stations', icon: '⛽' },
  { key: 'restaurant', label: 'Restaurants', icon: '🍴' },
  { key: 'cafe', label: 'Cafes', icon: '☕' },
  { key: 'hospital', label: 'Hospitals', icon: '🏥' },
  { key: 'pharmacy', label: 'Pharmacies', icon: '💊' },
  { key: 'school', label: 'Schools', icon: '🏫' },
  { key: 'police', label: 'Police', icon: '👮' },
  { key: 'atm', label: 'ATMs & Banks', icon: '💰' },
  { key: 'place_of_worship', label: 'Churches', icon: '⛪' },
  { key: 'parking', label: 'Parking', icon: '🅿️' },
  { key: 'toilets', label: 'Toilets', icon: '🚻' },
  { key: 'hotel', label: 'Hotels', icon: '🏨' },
  { key: 'fire_station', label: 'Fire Stations', icon: '🚒' },
] as const;

export type PoiCategory = (typeof POI_CATEGORIES)[number]['key'];

export type MapState = {
  center: LatLng;
  zoom: number;
  pickup: MapMarker | null;
  destination: MapMarker | null;
  route: RouteResult | null;
  routeGeoJSON: GeoJSONFeature | null;
  loading: boolean;
  error: string | null;
};
