import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng, MapMarker, RouteResult } from "../types/maps.types";
import type { VehicleMapFeature } from "../../transportation/types/fleetMapState.types";
import { useTheme } from "../../../hooks/useTheme";
import { MapControls } from "./MapControls";
import { ROUTE_COLOR, PICKUP_COLOR, DESTINATION_COLOR, PICKUP_BG, DESTINATION_BG } from "../mapColors";
import { vehicleMarkerHtml } from "./vehicleMarker";

type LeafletMapProps = {
  center?: LatLng;
  zoom?: number;
  pickup: MapMarker | null;
  destination: MapMarker | null;
  route: RouteResult | null;
  loading?: boolean;
  onMapClick: (e: { lngLat: { lng: number; lat: number } }) => void;
  onMarkerDragEnd: (type: "pickup" | "destination", position: { latitude: number; longitude: number }) => void;
  onLocate: () => void;
  locationLoading: boolean;
  locationError: string | null;
  leftPanelWidth?: number;
  isMobile?: boolean;
  vehicles?: VehicleMapFeature[];
  selectedVehicleId?: string | null;
  highlightVehicleId?: string | null;
  onVehicleClick?: (id: string) => void;
};

const DEFAULT_CENTER: LatLng = { latitude: 14.5995, longitude: 120.9842 };
const DEFAULT_ZOOM = 12;
const DEFAULT_PANEL_WIDTH = 340;
const PANEL_GAP = 20;
const ROUTE_VIEW_GAP = 40;
const LIGHT_TILE_URL = import.meta.env.VITE_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
const LIGHT_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

type LeafletFitPadding = { top: number; right: number; bottom: number; left: number };

function computeLeafletFitPadding(containerWidth: number, panelWidth: number, isMobile: boolean): LeafletFitPadding {
  if (isMobile) {
    return { top: 50, right: 24, bottom: 320, left: 24 };
  }
  const left = Math.min(
    (panelWidth || DEFAULT_PANEL_WIDTH) + PANEL_GAP + ROUTE_VIEW_GAP,
    Math.max(containerWidth - 140, DEFAULT_PANEL_WIDTH + PANEL_GAP + ROUTE_VIEW_GAP)
  );
  return { top: 80, right: 48, bottom: 80, left };
}

function markerIcon(label: string, color: string, background: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${background};border:2px solid ${color};display:flex;align-items:center;justify-content:center;color:${color};font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${label}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function LeafletMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  pickup,
  destination,
  route,
  loading = false,
  onMapClick,
  onMarkerDragEnd,
  onLocate,
  locationLoading,
  locationError,
  leftPanelWidth = DEFAULT_PANEL_WIDTH,
  isMobile = false,
  vehicles,
  selectedVehicleId,
  highlightVehicleId,
  onVehicleClick,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapError, setMapError] = useState<string | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(0);
  const [tilesTotal, setTilesTotal] = useState(0);
  const { resolvedTheme } = useTheme();
  const tileUrlRef = useRef<string>(LIGHT_TILE_URL);

  const createTileLayer = (url: string): L.TileLayer => {
    const layer = L.tileLayer(url, {
      attribution: url === DARK_TILE_URL ? DARK_TILE_ATTRIBUTION : LIGHT_TILE_ATTRIBUTION,
      maxZoom: 19,
    });
    layer.on("tileerror", () => {
      setMapError("Some map tiles failed to load. Data panels below still work.");
    });
    layer.on("tileloadstart", () => {
      setTilesTotal((n) => n + 1);
    });
    layer.on("tileload", () => {
      setTilesLoaded((n) => n + 1);
    });
    return layer;
  };

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const onMarkerDragEndRef = useRef(onMarkerDragEnd);
  useEffect(() => {
    onMarkerDragEndRef.current = onMarkerDragEnd;
  }, [onMarkerDragEnd]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const vehicleMarkers = vehicleMarkersRef.current;

    const map = L.map(containerRef.current, {
      center: [center.latitude, center.longitude],
      zoom,
    });

    const startUrl = resolvedTheme === "dark" ? DARK_TILE_URL : LIGHT_TILE_URL;
    tileUrlRef.current = startUrl;
    const tileLayer = createTileLayer(startUrl);
    tileLayer.addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onMapClickRef.current({ lngLat: { lng: e.latlng.lng, lat: e.latlng.lat } });
    });

    mapRef.current = map;
    tileLayerRef.current = tileLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      pickupMarkerRef.current = null;
      destinationMarkerRef.current = null;
      routeLineRef.current = null;
      vehicleMarkers.forEach((m) => m.remove());
      vehicleMarkers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const targetUrl = resolvedTheme === "dark" ? DARK_TILE_URL : LIGHT_TILE_URL;
    if (tileUrlRef.current === targetUrl) return;
    tileUrlRef.current = targetUrl;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    setTilesLoaded(0);
    setTilesTotal(0);
    const layer = createTileLayer(targetUrl);
    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [resolvedTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    if (pickup) {
      const marker = L.marker([pickup.position.latitude, pickup.position.longitude], {
        draggable: true,
        icon: markerIcon("A", PICKUP_COLOR, PICKUP_BG),
      });
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        onMarkerDragEndRef.current("pickup", { latitude: ll.lat, longitude: ll.lng });
      });
      marker.addTo(map);
      pickupMarkerRef.current = marker;
    }

    if (destinationMarkerRef.current) {
      map.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    if (destination) {
      const marker = L.marker([destination.position.latitude, destination.position.longitude], {
        draggable: true,
        icon: markerIcon("B", DESTINATION_COLOR, DESTINATION_BG),
      });
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        onMarkerDragEndRef.current("destination", { latitude: ll.lat, longitude: ll.lng });
      });
      marker.addTo(map);
      destinationMarkerRef.current = marker;
    }
  }, [pickup, destination]);

  // Fleet vehicle markers (R6) — parity with the MapLibre GL engine.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    vehicleMarkersRef.current.forEach((m) => map.removeLayer(m));
    vehicleMarkersRef.current.clear();

    if (!vehicles || vehicles.length === 0) return;

    for (const vehicle of vehicles) {
      const emphasized =
        vehicle.id === selectedVehicleId || vehicle.id === highlightVehicleId;
      const icon = L.divIcon({
        className: "",
        html: vehicleMarkerHtml(vehicle, emphasized),
        iconSize: [34, 48],
        iconAnchor: [17, 17],
      });
      const marker = L.marker(vehicle.coordinate, { draggable: false, icon });
      marker.on("click", () => {
        onVehicleClick?.(vehicle.id);
      });
      marker.addTo(map);
      vehicleMarkersRef.current.set(vehicle.id, marker);
    }
  }, [vehicles, selectedVehicleId, highlightVehicleId, onVehicleClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (route?.geometry?.type === "LineString" && route.geometry.coordinates.length > 1) {
      const coords = route.geometry.coordinates.map((c) => [c[0], c[1]] as [number, number]);
      const line = L.polyline(coords, {
        color: ROUTE_COLOR,
        weight: 5,
        opacity: 0.85,
      });
      line.addTo(map);
      routeLineRef.current = line;

      const containerWidth = map.getContainer().clientWidth || 1024;
      const fitPadding = computeLeafletFitPadding(containerWidth, leftPanelWidth, isMobile);
      map.fitBounds(line.getBounds(), {
        paddingTopLeft: [fitPadding.left, fitPadding.top],
        paddingBottomRight: [fitPadding.right, fitPadding.bottom],
        maxZoom: 15,
      });
    }
  }, [route, leftPanelWidth, isMobile]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleLocate = useCallback(() => {
    onLocate();
  }, [onLocate]);

  return (
    <div className="bsa-map-container relative h-full w-full">
      <div ref={containerRef} className="bsa-map-target absolute inset-0" />

      <div className="absolute bottom-2 left-2 z-[1001] rounded border px-2 py-1 text-[10px] font-medium" style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-elevated)", color: "var(--color-text-muted)" }}>
        Leaflet + OSM • {tilesLoaded}/{tilesTotal} tiles • v3
      </div>

      {mapError ? (
        <div className="absolute inset-x-0 bottom-0 z-[1000] m-3 rounded-lg border px-4 py-2 text-xs" style={{ borderColor: "var(--color-warning-border)", background: "var(--color-bg-elevated)", color: "var(--color-warning)" }}>
          {mapError}
        </div>
      ) : null}

      <MapControls
        onLocate={handleLocate}
        locationLoading={locationLoading}
        locationError={locationError}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {loading ? (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-elevated)", color: "var(--color-text-primary)" }}>
          Calculating route...
        </div>
      ) : null}
    </div>
  );
}
