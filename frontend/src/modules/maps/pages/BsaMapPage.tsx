import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeftRight, MapPin, Layers } from "lucide-react";
import BsaMap from "../components/BsaMap";
import { LocationSearch } from "../components/LocationSearch";
import { RouteSummary } from "../components/RouteSummary";
import { PoiPanel } from "../components/PoiPanel";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { useRouteCalculation } from "../hooks/useRouteCalculation";
import { usePoiSearch } from "../hooks/usePoiSearch";
import type { SearchResult, LatLng, MapMarker } from "../types/maps.types";
import { POI_CATEGORIES } from "../types/maps.types";
import type { PoiCategory } from "../types/maps.types";
import { isValidCoordinate } from "../utils/coordinates";
import { reverseGeocode } from "../api/maps.api";
import "../map-panels.css";

const DEFAULT_PANEL_WIDTH = 340;

export default function BsaMapPage() {
  const [pickup, setPickup] = useState<MapMarker | null>(null);
  const [destination, setDestination] = useState<MapMarker | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 600);

  const [poiEnabled, setPoiEnabled] = useState(false);
  const [activePoiCategories, setActivePoiCategories] = useState<string[]>([]);
  const [poiPanelOpen, setPoiPanelOpen] = useState(false);

  const poiCenter: LatLng = pickup?.position ?? { latitude: 14.5995, longitude: 120.9842 };

  const { loading: locationLoading, error: locationError, request: requestLocation, location } = useCurrentLocation();
  const { route, loading: routeLoading, error: routeError, calculate, clearRoute } = useRouteCalculation();

  const { pois, loading: poiLoading, error: poiError } = usePoiSearch(activePoiCategories, {
    latitude: poiCenter.latitude,
    longitude: poiCenter.longitude,
    enabled: poiEnabled && activePoiCategories.length > 0,
  });

  useEffect(() => {
    const measure = () => {
      setLeftPanelWidth(leftPanelRef.current?.getBoundingClientRect().width ?? DEFAULT_PANEL_WIDTH);
    };
    measure();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && leftPanelRef.current) {
      observer = new ResizeObserver(measure);
      observer.observe(leftPanelRef.current);
    }

    const onViewport = () => {
      setIsMobile(window.innerWidth < 600);
    };
    onViewport();
    window.addEventListener("resize", onViewport);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", onViewport);
    };
  }, []);

  useEffect(() => {
    if (!location) return;
    const point: LatLng = { latitude: location.latitude, longitude: location.longitude };
    if (!isValidCoordinate(point.latitude, point.longitude)) return;

    reverseGeocode(point.latitude, point.longitude)
      .then((result) => {
        const marker: MapMarker = { id: `loc-${Date.now()}`, type: "pickup", position: point, address: result.displayName, draggable: true };
        setPickup(marker);
        setPickupAddress(result.displayName);
        setDestination(null);
        setDestinationAddress("");
        clearRoute();
      })
      .catch(() => {
        const marker: MapMarker = { id: `loc-${Date.now()}`, type: "pickup", position: point, address: `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`, draggable: true };
        setPickup(marker);
        setPickupAddress(`${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`);
        setDestination(null);
        setDestinationAddress("");
        clearRoute();
      });
  }, [location, clearRoute]);

  function handlePickupSelect(result: SearchResult) {
    const point: LatLng = { latitude: result.latitude, longitude: result.longitude };
    const marker: MapMarker = { id: result.id, type: "pickup", position: point, address: result.displayName, draggable: true };
    setPickup(marker);
    setPickupAddress(result.displayName);
    setDestination(null);
    setDestinationAddress("");
    clearRoute();
  }

  function handleDestinationSelect(result: SearchResult) {
    const point: LatLng = { latitude: result.latitude, longitude: result.longitude };
    const marker: MapMarker = { id: result.id, type: "destination", position: point, address: result.displayName, draggable: true };
    setDestination(marker);
    setDestinationAddress(result.displayName);
    setPickupAddress(pickup?.address ?? "");
    if (pickup && isValidCoordinate(pickup.position.latitude, pickup.position.longitude)) {
      calculate(pickup.position, point);
    }
  }

  function handleMapClick(e: { lngLat: { lng: number; lat: number } }) {
    const { lng, lat } = e.lngLat;
    if (!isValidCoordinate(lat, lng)) return;

    if (!pickup || (pickup && destination)) {
      reverseGeocode(lat, lng).then((result) => {
        const point: LatLng = { latitude: lat, longitude: lng };
        const marker: MapMarker = { id: `map-${Date.now()}`, type: "pickup", position: point, address: result.displayName, draggable: true };
        setPickup(marker);
        setPickupAddress(result.displayName);
        setDestination(null);
        setDestinationAddress("");
        clearRoute();
      }).catch(() => {
        const point: LatLng = { latitude: lat, longitude: lng };
        const marker: MapMarker = { id: `map-${Date.now()}`, type: "pickup", position: point, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, draggable: true };
        setPickup(marker);
        setPickupAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setDestination(null);
        setDestinationAddress("");
        clearRoute();
      });
    } else if (pickup && !destination) {
      reverseGeocode(lat, lng).then((result) => {
        const point: LatLng = { latitude: lat, longitude: lng };
        const marker: MapMarker = { id: `map-${Date.now()}`, type: "destination", position: point, address: result.displayName, draggable: true };
        setDestination(marker);
        setDestinationAddress(result.displayName);
        calculate(pickup.position, point);
      }).catch(() => {
        const point: LatLng = { latitude: lat, longitude: lng };
        const marker: MapMarker = { id: `map-${Date.now()}`, type: "destination", position: point, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, draggable: true };
        setDestination(marker);
        setDestinationAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        calculate(pickup.position, point);
      });
    }
  }

  function handleMarkerDragEnd(type: "pickup" | "destination", position: { latitude: number; longitude: number }) {
    if (type === "pickup") {
      reverseGeocode(position.latitude, position.longitude).then((result) => {
        setPickup((prev) => prev ? { ...prev, position, address: result.displayName } : null);
        setPickupAddress(result.displayName);
        if (destination && isValidCoordinate(destination.position.latitude, destination.position.longitude)) {
          calculate(position, destination.position);
        }
      }).catch(() => {
        setPickup((prev) => prev ? { ...prev, position } : null);
        setPickupAddress(`${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`);
      });
    } else {
      reverseGeocode(position.latitude, position.longitude).then((result) => {
        setDestination((prev) => prev ? { ...prev, position, address: result.displayName } : null);
        setDestinationAddress(result.displayName);
        if (pickup && isValidCoordinate(pickup.position.latitude, pickup.position.longitude)) {
          calculate(pickup.position, position);
        }
      }).catch(() => {
        setDestination((prev) => prev ? { ...prev, position } : null);
        setDestinationAddress(`${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`);
      });
    }
  }

  function handlePickupClear() {
    setPickup(null);
    setPickupAddress("");
    setDestination(null);
    setDestinationAddress("");
    clearRoute();
  }

  function handleDestinationClear() {
    setDestination(null);
    setDestinationAddress("");
    clearRoute();
  }

  function handleSwap() {
    if (!pickup || !destination) return;
    const oldPickup = pickup;
    const oldDest = destination;
    const oldPickupAddr = pickupAddress;
    const oldDestAddr = destinationAddress;

    setPickup({ ...oldDest, type: "pickup" });
    setDestination({ ...oldPickup, type: "destination" });
    setPickupAddress(oldDestAddr);
    setDestinationAddress(oldPickupAddr);

    if (isValidCoordinate(oldDest.position.latitude, oldDest.position.longitude) && isValidCoordinate(oldPickup.position.latitude, oldPickup.position.longitude)) {
      calculate(oldDest.position, oldPickup.position);
    }
  }

  function handleClearRoute() {
    setPickup(null);
    setDestination(null);
    setPickupAddress("");
    setDestinationAddress("");
    clearRoute();
  }

  function handleCurrentLocation() {
    requestLocation();
  }

  const handleTogglePoiCategory = useCallback((key: string) => {
    setActivePoiCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }, []);

  const handlePoiToggleAll = useCallback(() => {
    setActivePoiCategories((prev) =>
      prev.length === 0 ? POI_CATEGORIES.map((c) => c.key as PoiCategory) : [],
    );
  }, []);

  const handleTogglePoiVisibility = useCallback(() => {
    setPoiEnabled((prev) => {
      if (prev) {
        setPoiPanelOpen(false);
        setActivePoiCategories([]);
        return false;
      }
      setPoiPanelOpen(true);
      setActivePoiCategories(POI_CATEGORIES.map((c) => c.key as PoiCategory));
      return true;
    });
  }, []);

  function handleConfirmRoute() {
    if (pickup && destination && route) {
      console.log("Route confirmed:", { pickup, destination, route });
    }
  }

  return (
    <div className="relative h-[calc(100vh-10rem)]">
      <BsaMap
        pickup={pickup}
        destination={destination}
        route={route}
        loading={routeLoading}
        onMapClick={handleMapClick}
        onMarkerDragEnd={handleMarkerDragEnd}
        onLocate={handleCurrentLocation}
        locationLoading={locationLoading}
        locationError={locationError}
        leftPanelWidth={leftPanelWidth}
        isMobile={isMobile}
        pois={poiEnabled ? pois : undefined}
      />

      <div ref={leftPanelRef} className="bsa-map-panel-stack" aria-label="Route planning panels">
        <section className="bsa-map-card p-4" aria-label="Plan your route">
          <div className="mb-4 flex items-center gap-2">
            <MapPin size={18} style={{ color: "var(--color-brand)" }} />
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Plan Your Route</h2>
          </div>

          <div className="flex flex-col gap-4">
            <LocationSearch label="Pickup" placeholder="Search pickup location" selectedValue={pickupAddress} onSelect={handlePickupSelect} onClear={handlePickupClear} />
            <LocationSearch label="Destination" placeholder="Search destination" selectedValue={destinationAddress} onSelect={handleDestinationSelect} onClear={handleDestinationClear} />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSwap}
                className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-[var(--color-bg-surface-muted)]"
                style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
              >
                <ArrowLeftRight size={14} />
                Swap
              </button>
              <button
                type="button"
                onClick={handleClearRoute}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-[var(--color-bg-surface-muted)]"
                style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        <RouteSummary
          route={route}
          pickupAddress={pickupAddress}
          destinationAddress={destinationAddress}
          onConfirm={handleConfirmRoute}
          onClear={handleClearRoute}
          onSwap={handleSwap}
          loading={routeLoading}
          error={routeError}
        />
      </div>

      {locationError ? (
        <div className="bsa-location-banner rounded-lg border px-4 py-2 text-sm shadow-lg" style={{ borderColor: "var(--color-warning-border)", background: "var(--color-bg-elevated)", color: "var(--color-warning)" }}>
          {locationError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleTogglePoiVisibility}
        className={`bsa-poi-toggle absolute bottom-4 right-4 z-[1001] flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-lg transition ${
          poiEnabled ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : ""
        }`}
        style={!poiEnabled ? { borderColor: "var(--color-border-default)", background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" } : undefined}
      >
        <Layers size={14} />
        {poiEnabled ? "POI On" : "Show POI"}
      </button>

      {poiEnabled && poiPanelOpen ? (
        <div className="bsa-poi-panel-wrapper absolute bottom-16 right-4 z-[1002] w-64">
          <PoiPanel
            activeCategories={activePoiCategories}
            onToggleCategory={handleTogglePoiCategory}
            onToggleAll={handlePoiToggleAll}
            loading={poiLoading}
            resultCount={pois.length}
          />
        </div>
      ) : null}

      {poiError ? (
        <div className="absolute bottom-28 right-4 z-[1002] max-w-xs rounded-lg border px-3 py-1.5 text-xs shadow-lg" style={{ borderColor: "var(--color-danger-border)", background: "var(--color-bg-elevated)", color: "var(--color-danger)" }}>
          {poiError}
        </div>
      ) : null}
    </div>
  );
}