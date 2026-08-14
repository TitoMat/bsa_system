import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { LatLng, MapMarker, RouteResult, PoiMarker } from "../types/maps.types";
import type { VehicleMapFeature } from "../../transportation/types/fleetMapState.types";
import { useTheme } from "../../../hooks/useTheme";
import { MapControls } from "./MapControls";
import { LeafletMap } from "./LeafletMap";
import { ROUTE_COLOR, PICKUP_COLOR, DESTINATION_COLOR, PICKUP_BG, DESTINATION_BG } from "../mapColors";
import { vehicleMarkerHtml } from "./vehicleMarker";

type BsaMapProps = {
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
  pois?: PoiMarker[];
  preview?: { pickup: MapMarker; destination: MapMarker } | null;
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

const POI_COLORS: Record<string, string> = {
  fuel: "#E67E22",
  restaurant: "#E74C3C",
  cafe: "#8B4513",
  hospital: "#E74C3C",
  pharmacy: "#27AE60",
  school: "#3498DB",
  police: "#2C3E50",
  atm: "#F39C12",
  bank: "#F39C12",
  place_of_worship: "#9B59B6",
  parking: "#7F8C8D",
  toilets: "#95A5A6",
  hotel: "#E91E63",
  fire_station: "#E74C3C",
};

type FitPadding = { top: number; right: number; bottom: number; left: number };

function computeFitPadding(containerWidth: number, panelWidth: number, isMobile: boolean): FitPadding {
  if (isMobile) {
    return { top: 50, right: 24, bottom: 320, left: 24 };
  }
  const left = Math.min(
    (panelWidth || DEFAULT_PANEL_WIDTH) + PANEL_GAP + ROUTE_VIEW_GAP,
    Math.max(containerWidth - 140, DEFAULT_PANEL_WIDTH + PANEL_GAP + ROUTE_VIEW_GAP)
  );
  return { top: 80, right: 48, bottom: 80, left };
}

function detectWebGL2(): { supported: boolean; message: string } {
  try {
    const canvas = document.createElement("canvas");
    if (canvas.getContext("webgl2")) {
      return { supported: true, message: "" };
    }
    const hasWebGL1 =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return {
      supported: false,
      message: hasWebGL1
        ? "This browser supports WebGL 1 but not WebGL 2, which the map requires. Enable hardware acceleration (or update your graphics driver) and reload."
        : "WebGL 2 is not available in this browser. Enable hardware acceleration in your browser settings and reload.",
    };
  } catch {
    return {
      supported: false,
      message: "WebGL 2 could not be initialised in this browser.",
    };
  }
}

const LIGHT_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export default function BsaMap({
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
  pois,
  preview,
  vehicles,
  selectedVehicleId,
  highlightVehicleId,
  onVehicleClick,
}: BsaMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [useLeaflet, setUseLeaflet] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [layerVersion, setLayerVersion] = useState(0);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const previewPickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const previewDestinationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const vehicleMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const routeLayerRef = useRef<string | null>(null);
  const routeSourceRef = useRef<string | null>(null);
  const poiSourceRef = useRef<string | null>(null);
  const poiLayerRef = useRef<string | null>(null);
  const routeRef = useRef<RouteResult | null>(null);
  const { resolvedTheme } = useTheme();
  const currentThemeRef = useRef<"light" | "dark">(resolvedTheme);
  const fitPaddingRef = useRef<FitPadding>(computeFitPadding(1024, leftPanelWidth, isMobile));
  fitPaddingRef.current = computeFitPadding(
    mapContainerRef.current?.clientWidth || 1024,
    leftPanelWidth,
    isMobile
  );

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const onMarkerDragEndRef = useRef(onMarkerDragEnd);
  useEffect(() => {
    onMarkerDragEndRef.current = onMarkerDragEnd;
  }, [onMarkerDragEnd]);

  const onVehicleClickRef = useRef(onVehicleClick);
  useEffect(() => {
    onVehicleClickRef.current = onVehicleClick;
  }, [onVehicleClick]);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  const redrawRoute = useCallback((map: MaplibreMap, fitPadding: FitPadding) => {
    const currentRoute = routeRef.current;
    if (!currentRoute || currentRoute.geometry?.type !== "LineString" || currentRoute.geometry.coordinates.length <= 1) return;

    if (routeSourceRef.current) {
      if (map.getSource(routeSourceRef.current)) {
        map.removeLayer(routeLayerRef.current || routeSourceRef.current);
        map.removeSource(routeSourceRef.current);
      }
      routeLayerRef.current = null;
      routeSourceRef.current = null;
    }

    const sourceId = "route-source";
    const layerId = "route-layer";
    routeSourceRef.current = sourceId;
    routeLayerRef.current = layerId;

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: currentRoute.geometry.coordinates.map((c) => [c[1], c[0]]),
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": ROUTE_COLOR,
        "line-width": 5,
        "line-opacity": 0.85,
      },
    });

    const coords = currentRoute.geometry.coordinates.map((c) => [c[1], c[0]] as [number, number]);
    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );
    map.fitBounds(bounds, { padding: fitPadding, maxZoom: 15, duration: 500 });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const vehicleMarkers = vehicleMarkersRef.current;

    const forceLeaflet = new URLSearchParams(window.location.search).get("engine") === "leaflet";
    const webgl = detectWebGL2();
    if (forceLeaflet || !webgl.supported) {
      console.warn("Map: using Leaflet fallback:", forceLeaflet ? "forced via ?engine=leaflet" : webgl.message);
      setUseLeaflet(true);
      return;
    }

    let styleReady = false;
    let fallbackUsed = false;
    let styleFailTimer: ReturnType<typeof setTimeout> | null = null;
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const styleUrl = currentThemeRef.current === "dark" ? DARK_STYLE_URL : LIGHT_STYLE_URL;

    let map: MaplibreMap;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: [center.longitude, center.latitude],
        zoom,
        attributionControl: false,
      });
    } catch (err) {
      console.warn("Map: maplibre init failed, using Leaflet fallback:", err);
      setUseLeaflet(true);
      return;
    }

    initTimer = setTimeout(() => {
      if (styleReady) return;
      console.warn("Map: initial style load timed out, falling back to Leaflet:", styleUrl);
      map.remove();
      mapRef.current = null;
      setUseLeaflet(true);
    }, 20000);

    const markReady = () => {
      if (styleReady) return;
      styleReady = true;
      map.resize();
      if (styleFailTimer) {
        clearTimeout(styleFailTimer);
        styleFailTimer = null;
      }
      if (initTimer) {
        clearTimeout(initTimer);
        initTimer = null;
      }
      setMapLoaded(true);
      setMapError(null);
      if (import.meta.env.VITE_MAP_ATTRIBUTION) {
        map.addControl(
          new maplibregl.AttributionControl({
            customAttribution: import.meta.env.VITE_MAP_ATTRIBUTION,
          })
        );
      }
    };

    map.on("load", () => {
      markReady();
      if (routeRef.current) {
        redrawRoute(map, fitPaddingRef.current);
      }
    });

    map.on("error", (e: { error?: { message?: string; status?: number } }) => {
      const message = e?.error?.message ?? "Unknown map error";

      if (styleReady) {
        console.warn("Map tile error:", message);
        return;
      }

      if (fallbackUsed) {
        console.warn("Map fallback style error:", message);
        return;
      }

      fallbackUsed = true;
      console.warn("Map style failed, falling back to raster tiles:", message);
      map.setStyle(OSM_RASTER_STYLE as unknown as maplibregl.StyleSpecification);
      map.once("idle", markReady);

      styleFailTimer = setTimeout(() => {
        if (!styleReady) {
          setMapError(
            `Map service unavailable (${message}). Check your connection and reload.`
          );
        }
      }, 15000);
    });

    map.on("click", (e) => {
      if (e.lngLat) {
        onMapClickRef.current({ lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat } });
      }
    });

    mapRef.current = map;

    const resizeMap = () => {
      if (mapRef.current) mapRef.current.resize();
    };
    requestAnimationFrame(resizeMap);
    requestAnimationFrame(resizeMap);

    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(resizeMap);
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (styleFailTimer) clearTimeout(styleFailTimer);
      if (initTimer) clearTimeout(initTimer);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      pickupMarkerRef.current = null;
      destinationMarkerRef.current = null;
      previewPickupMarkerRef.current = null;
      previewDestinationMarkerRef.current = null;
      vehicleMarkers.forEach((m) => m.remove());
      vehicleMarkers.clear();
      routeLayerRef.current = null;
      routeSourceRef.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    if (pickup) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:${PICKUP_BG};border:2px solid ${PICKUP_COLOR};display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">A</div>`;
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([pickup.position.longitude, pickup.position.latitude])
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onMarkerDragEndRef.current("pickup", { latitude: lngLat.lat, longitude: lngLat.lng });
      });

      pickupMarkerRef.current = marker;
    }

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    if (destination) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:${DESTINATION_BG};border:2px solid ${DESTINATION_COLOR};display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">B</div>`;
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([destination.position.longitude, destination.position.latitude])
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onMarkerDragEndRef.current("destination", { latitude: lngLat.lat, longitude: lngLat.lng });
      });

      destinationMarkerRef.current = marker;
    }
  }, [pickup, destination, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (previewPickupMarkerRef.current) {
      previewPickupMarkerRef.current.remove();
      previewPickupMarkerRef.current = null;
    }
    if (previewDestinationMarkerRef.current) {
      previewDestinationMarkerRef.current.remove();
      previewDestinationMarkerRef.current = null;
    }

    if (!preview) return;

    const previewEl = (color: string, letter: string) => {
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.9);border:2px dashed ${color};display:flex;align-items:center;justify-content:center;color:${color};font-weight:700;font-size:10px;box-shadow:0 1px 4px rgba(0,0,0,0.25);">${letter}</div>`;
      return el;
    };

    const pk = new maplibregl.Marker({ element: previewEl(PICKUP_COLOR, "A"), draggable: false })
      .setLngLat([preview.pickup.position.longitude, preview.pickup.position.latitude])
      .addTo(map);
    previewPickupMarkerRef.current = pk;

    const dest = new maplibregl.Marker({ element: previewEl(DESTINATION_COLOR, "B"), draggable: false })
      .setLngLat([preview.destination.position.longitude, preview.destination.position.latitude])
      .addTo(map);
    previewDestinationMarkerRef.current = dest;
  }, [preview, mapLoaded]);

  // Fleet vehicle markers (R6). Re-created on data/selection change — same
  // "recreate per change" strategy as the pickup/dropoff DOM markers above.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    vehicleMarkersRef.current.forEach((marker) => marker.remove());
    vehicleMarkersRef.current.clear();

    if (!vehicles || vehicles.length === 0) return;

    for (const vehicle of vehicles) {
      const el = document.createElement("div");
      el.innerHTML = vehicleMarkerHtml(
        vehicle,
        vehicle.id === selectedVehicleId || vehicle.id === highlightVehicleId,
      );
      el.addEventListener("click", () => {
        onVehicleClickRef.current?.(vehicle.id);
      });
      const marker = new maplibregl.Marker({ element: el, draggable: false })
        .setLngLat(vehicle.coordinate)
        .addTo(map);
      vehicleMarkersRef.current.set(vehicle.id, marker);
    }
  }, [vehicles, selectedVehicleId, highlightVehicleId, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    redrawRoute(map, fitPaddingRef.current);
  }, [route, mapLoaded, leftPanelWidth, isMobile, redrawRoute, layerVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = "poi-source";
    const layerId = "poi-layer";

    if (poiSourceRef.current && map.getSource(poiSourceRef.current)) {
      map.removeLayer(layerId);
      map.removeSource(sourceId);
      poiSourceRef.current = null;
      poiLayerRef.current = null;
    }

    if (!pois || pois.length === 0) return;

    const features = pois.map((p) => ({
      type: "Feature" as const,
      properties: {
        id: p.id,
        name: p.name,
        category: p.category,
        color: POI_COLORS[p.category] || "#999999",
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.longitude, p.latitude],
      },
    }));

    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    poiSourceRef.current = sourceId;
    poiLayerRef.current = layerId;

    map.addLayer({
      id: layerId,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-radius": 6,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
      minzoom: 12,
    });

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true,
      maxWidth: "240px",
      offset: 12,
    });

    map.on("click", layerId, (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const props = feature.properties as { name: string; category: string };
      const coordinates = (feature.geometry as { type: "Point"; coordinates: [number, number] }).coordinates.slice() as [number, number];
      const categoryLabel = props.category.replace(/_/g, " ");

      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      popup.setLngLat(coordinates).setHTML(`<div style="font-size:12px;line-height:1.4"><strong>${props.name}</strong><br/><span style="color:#718096;text-transform:capitalize">${categoryLabel}</span></div>`).addTo(map);
    });

    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
    });
  }, [pois, mapLoaded, layerVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (currentThemeRef.current === resolvedTheme) return;
    currentThemeRef.current = resolvedTheme;
    const target = resolvedTheme === "dark" ? DARK_STYLE_URL : LIGHT_STYLE_URL;
    map.once("style.load", () => {
      setLayerVersion((v) => v + 1);
    });
    map.setStyle(target);
  }, [resolvedTheme, mapLoaded]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleLocate = useCallback(() => {
    onLocate();
  }, [onLocate]);

  if (useLeaflet) {
    return (
      <LeafletMap
        center={center}
        zoom={zoom}
        pickup={pickup}
        destination={destination}
        route={route}
        loading={loading}
        onMapClick={onMapClick}
        onMarkerDragEnd={onMarkerDragEnd}
        onLocate={onLocate}
        locationLoading={locationLoading}
        locationError={locationError}
        leftPanelWidth={leftPanelWidth}
        isMobile={isMobile}
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        highlightVehicleId={highlightVehicleId}
        onVehicleClick={onVehicleClick}
      />
    );
  }

  return (
    <div className="bsa-map-container relative h-full w-full">
      <div ref={mapContainerRef} className="bsa-map-target absolute inset-0" />

      <div className="absolute bottom-2 left-2 z-[1001] rounded border px-2 py-1 text-[10px] font-medium" style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-elevated)", color: "var(--color-text-muted)" }}>
        {mapLoaded ? "MapLibre GL • ready • v3" : mapError ? "MapLibre GL • error" : "MapLibre GL • loading"}
      </div>

      {mapError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: "var(--color-bg-surface-soft)" }}>
          <div className="text-center p-6">
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Map service unavailable</p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{mapError}</p>
          </div>
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
