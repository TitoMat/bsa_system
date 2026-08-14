import { useEffect, useMemo, useState } from 'react';
import type { BoardRequest } from '../api/transportation.api';
import type { MapMarker } from '../../maps/types/maps.types';
import BsaMap from '../../maps/components/BsaMap';
import DispatchControlBar from '../components/monitoring/DispatchControlBar';
import RequestOperationsPanel from '../components/monitoring/RequestOperationsPanel';
import TripDetailPanel from '../components/monitoring/TripDetailPanel';
import ReassignmentModal from '../components/monitoring/ReassignmentModal';
import MapLegend from '../components/monitoring/MapLegend';
import VehicleInfoCard from '../components/monitoring/VehicleInfoCard';
import { useFleetMonitoring } from '../hooks/useFleetMonitoring';
import { useFleetMapState } from '../hooks/useFleetMapState';
import { useSelectedRequest } from '../hooks/useSelectedRequest';
import { useDispatchConfiguration } from '../hooks/useDispatchConfiguration';
import { useRequestActions } from '../hooks/useRequestActions';
import { buildRouteResult, extractRouteGeometry } from '../utils/routeGeometry';
import { toVehicleMapFeatures } from '../utils/fleetMapState';

const DEFAULT_CENTER = { latitude: 14.5995, longitude: 120.9842 };

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

export default function TransportationRequestsPage() {
  const { board } = useFleetMonitoring();
  const { mapState, refreshMapState } = useFleetMapState();
  const { settings, executiveResources, toggleAuto, toggleBoss, changeStrategy } =
    useDispatchConfiguration();
  const { dispatchMsg, setDispatchMsg, autoAssign, reassign, refreshRoute } = useRequestActions();
  const isMobile = useIsMobile();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<BoardRequest | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const requests = useMemo(
    () => board.data?.requests ?? ([] as BoardRequest[]),
    [board.data],
  );
  const vehicles = useMemo(
    () => toVehicleMapFeatures(mapState.data),
    [mapState.data],
  );
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );
  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  );
  const hovered = useMemo(
    () => requests.find((r) => r.id === hoverId) ?? null,
    [requests, hoverId],
  );

  const detail = useSelectedRequest(selectedId);

  const pickupMarker: MapMarker | null = useMemo(() => {
    if (!selected) return null;
    return {
      id: `pickup-${selected.id}`,
      type: 'pickup',
      position: { latitude: selected.pickup.latitude, longitude: selected.pickup.longitude },
      address: selected.pickup.address,
      draggable: false,
    };
  }, [selected]);

  const destinationMarker: MapMarker | null = useMemo(() => {
    if (!selected) return null;
    return {
      id: `dest-${selected.id}`,
      type: 'destination',
      position: { latitude: selected.destination.latitude, longitude: selected.destination.longitude },
      address: selected.destination.address,
      draggable: false,
    };
  }, [selected]);

  // Route geometry comes from the request detail snapshot; distance/ETA from board freshness
  const routeResult = useMemo(() => {
    if (!selected) return null;
    const geometry = extractRouteGeometry(detail.data?.routeGeometry);
    if (!geometry) return null;
    return buildRouteResult(geometry, selected.route?.distanceMeters, selected.route?.durationSeconds);
  }, [selected, detail.data]);

  // Hover preview (temporary, never changes selection)
  const preview = useMemo(() => {
    if (!hovered || hovered.id === selectedId) return null;
    return {
      pickup: {
        id: `pv-pickup-${hovered.id}`,
        type: 'pickup' as const,
        position: { latitude: hovered.pickup.latitude, longitude: hovered.pickup.longitude },
        address: hovered.pickup.address,
        draggable: false,
      },
      destination: {
        id: `pv-dest-${hovered.id}`,
        type: 'destination' as const,
        position: { latitude: hovered.destination.latitude, longitude: hovered.destination.longitude },
        address: hovered.destination.address,
        draggable: false,
      },
    };
  }, [hovered, selectedId]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setShowDetail(true);
    setDispatchMsg(null);
  };

  const handleReassign = (reason: string) => {
    if (!reassignTarget) return;
    reassign.mutate(
      { id: reassignTarget.id, reason },
      {
        onSuccess: () => setReassignTarget(null),
      },
    );
  };

  // Vehicle on the map whose ACTIVE assignment belongs to the selected request
  const highlightVehicleId = useMemo(
    () => selected?.assignment?.vehicleId ?? null,
    [selected],
  );

  const handleVehicleSelect = (id: string) => {
    setSelectedVehicleId(id);
    setDispatchMsg(null);
  };

  const handleViewVehicleRequest = () => {
    if (!selectedVehicle?.requestId) return;
    const request = requests.find((r) => r.id === selectedVehicle.requestId);
    if (!request) return;
    setSelectedVehicleId(null);
    handleSelect(request.id);
  };

  const handleRetryMapState = () => {
    refreshMapState();
  };

  return (
    <div
      className="-m-4 flex h-[calc(100vh-6rem)] flex-col lg:-m-5 lg:flex-row"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      {/* ── Operations Column ── */}
      <div
        className="flex h-3/5 min-h-0 w-full flex-col border-b lg:h-auto lg:w-2/3 lg:min-w-0 lg:flex-shrink-0 lg:border-b-0 lg:border-r"
        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)' }}
      >
        <DispatchControlBar
          settings={settings.data}
          executiveResources={executiveResources.data}
          toggleAuto={toggleAuto}
          toggleBoss={toggleBoss}
          changeStrategy={changeStrategy}
        />
        <RequestOperationsPanel
          requests={requests}
          summary={board.data?.summary}
          isLoading={board.isLoading}
          isError={board.isError}
          selectedId={selectedId}
          onSelect={handleSelect}
          onHover={setHoverId}
        />
      </div>

      {/* ── Map Column ── */}
      <div className="relative order-first h-2/5 w-full lg:order-none lg:h-auto lg:w-1/3">
        <BsaMap
          center={pickupMarker?.position ?? DEFAULT_CENTER}
          zoom={13}
          pickup={pickupMarker}
          destination={destinationMarker}
          route={routeResult}
          preview={preview}
          loading={false}
          onMapClick={() => {}}
          onMarkerDragEnd={() => {}}
          onLocate={() => {}}
          locationLoading={false}
          locationError={null}
          leftPanelWidth={0}
          isMobile={isMobile}
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          highlightVehicleId={highlightVehicleId}
          onVehicleClick={handleVehicleSelect}
        />
        <MapLegend
          className="left-3 top-3 lg:left-4 lg:top-4"
          fleet={mapState.data?.summary ?? null}
          mapStateError={mapState.isError}
          onRetry={handleRetryMapState}
        />

        {selectedVehicle && (
          <VehicleInfoCard
            vehicle={selectedVehicle}
            onViewRequest={handleViewVehicleRequest}
            onClose={() => setSelectedVehicleId(null)}
          />
        )}

        {selected && showDetail && (
          <TripDetailPanel
            request={selected}
            onClose={() => setShowDetail(false)}
            onReassign={() => setReassignTarget(selected)}
            onAutoAssign={() => autoAssign.mutate(selected.id)}
            onAutoRedispatch={() =>
              reassign.mutate({ id: selected.id, reason: 'Auto redispatch after driver decline' })
            }
            onRefreshRoute={() => refreshRoute.mutate(selected.id)}
            autoAssignPending={autoAssign.isPending}
            reassignPending={reassign.isPending}
            refreshRoutePending={refreshRoute.isPending}
            dispatchMsg={dispatchMsg}
          />
        )}
      </div>

      {reassignTarget && (
        <ReassignmentModal
          request={reassignTarget}
          onClose={() => setReassignTarget(null)}
          onReassign={handleReassign}
          reassignPending={reassign.isPending}
        />
      )}
    </div>
  );
}
