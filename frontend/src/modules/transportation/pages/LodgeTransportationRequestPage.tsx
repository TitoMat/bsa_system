import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Save, Clock, Route, Eraser, ChevronDown } from 'lucide-react';
import BsaMap from '../../maps/components/BsaMap';
import { LocationSearch } from '../../maps/components/LocationSearch';
import { useRouteCalculation } from '../../maps/hooks/useRouteCalculation';
import { reverseGeocode } from '../../maps/api/maps.api';
import { isValidCoordinate } from '../../maps/utils/coordinates';
import type { LatLng, MapMarker, SearchResult } from '../../maps/types/maps.types';
import type { CreateTransportationRequestDto, TransportationRequestType, TransportationPriority, TransportationTripType } from '../types/transportation.types';
import { createTransportationRequest, submitTransportationRequest, getFleetAssignments } from '../api/transportation.api';
import { getApiErrorMessage } from '../../../lib/apiError';
import { useAuthStore } from '../../../features/auth/useAuthStore';
import { useIsMobile } from '../../../hooks/useIsMobile';

const TIME_MULTIPLIER = 3;

function formatTime(seconds: number): string {
  const multiplied = seconds * TIME_MULTIPLIER;
  const hrs = Math.floor(multiplied / 3600);
  const mins = Math.round((multiplied % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export default function LodgeTransportationRequestPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const isMobile = useIsMobile();
  const [formExpanded, setFormExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [requestType, setRequestType] = useState<TransportationRequestType>('OFFICIAL_TRIP');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState<TransportationPriority>('NORMAL');
  const [tripType, setTripType] = useState<TransportationTripType>('ONE_WAY');
  const [passengerCount, setPassengerCount] = useState(1);
  const [requestedAssignmentPool, setRequestedAssignmentPool] = useState('GENERAL');
  const [contactNumber, setContactNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [requestorName, setRequestorName] = useState(authUser?.name ?? '');
  const [requestorEmail, setRequestorEmail] = useState(authUser?.email ?? '');
  const [scheduledPickupAt, setScheduledPickupAt] = useState('');
  const [expectedEndAt, setExpectedEndAt] = useState('');
  const [expectedReturnAt, setExpectedReturnAt] = useState('');

  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [pickupMarker, setPickupMarker] = useState<MapMarker | null>(null);

  const [destinationAddress, setDestinationAddress] = useState('');
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [destMarker, setDestMarker] = useState<MapMarker | null>(null);

  const { route, loading: routeLoading, calculate, clearRoute } = useRouteCalculation();

  function handlePickupSelect(result: SearchResult) {
    const point: LatLng = { latitude: result.latitude, longitude: result.longitude };
    setPickupAddress(result.displayName);
    setPickupLat(result.latitude);
    setPickupLng(result.longitude);
    setPickupMarker({ id: result.id, type: 'pickup', position: point, address: result.displayName, draggable: true });
    if (destLat && destLng) {
      calculate(point, { latitude: destLat, longitude: destLng });
    }
  }

  function handleDestinationSelect(result: SearchResult) {
    const point: LatLng = { latitude: result.latitude, longitude: result.longitude };
    setDestinationAddress(result.displayName);
    setDestLat(result.latitude);
    setDestLng(result.longitude);
    setDestMarker({ id: result.id, type: 'destination', position: point, address: result.displayName, draggable: true });
    if (pickupLat && pickupLng) {
      calculate({ latitude: pickupLat, longitude: pickupLng }, point);
    }
  }

  function handlePickupClear() {
    setPickupAddress('');
    setPickupLat(null);
    setPickupLng(null);
    setPickupMarker(null);
    clearRoute();
  }

  function handleDestinationClear() {
    setDestinationAddress('');
    setDestLat(null);
    setDestLng(null);
    setDestMarker(null);
    clearRoute();
  }

  function handleMapClick(e: { lngLat: { lng: number; lat: number } }) {
    const { lng, lat } = e.lngLat;
    if (!isValidCoordinate(lat, lng)) return;

    if (!pickupMarker) {
      reverseGeocode(lat, lng).then((r) => {
        const point: LatLng = { latitude: lat, longitude: lng };
        setPickupAddress(r.displayName);
        setPickupLat(lat);
        setPickupLng(lng);
        setPickupMarker({ id: `p-${Date.now()}`, type: 'pickup', position: point, address: r.displayName, draggable: true });
      }).catch(() => {
        setPickupLat(lat);
        setPickupLng(lng);
        setPickupAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setPickupMarker({ id: `p-${Date.now()}`, type: 'pickup', position: { latitude: lat, longitude: lng }, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, draggable: true });
      });
    } else if (!destMarker) {
      reverseGeocode(lat, lng).then((r) => {
        const point: LatLng = { latitude: lat, longitude: lng };
        setDestinationAddress(r.displayName);
        setDestLat(lat);
        setDestLng(lng);
        setDestMarker({ id: `d-${Date.now()}`, type: 'destination', position: point, address: r.displayName, draggable: true });
        if (pickupLat && pickupLng) calculate({ latitude: pickupLat, longitude: pickupLng }, point);
      }).catch(() => {
        setDestLat(lat);
        setDestLng(lng);
        setDestinationAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setDestMarker({ id: `d-${Date.now()}`, type: 'destination', position: { latitude: lat, longitude: lng }, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, draggable: true });
        if (pickupLat && pickupLng) calculate({ latitude: pickupLat, longitude: pickupLng }, { latitude: lat, longitude: lng });
      });
    }
  }

  function handleMarkerDragEnd(type: 'pickup' | 'destination', pos: { latitude: number; longitude: number }) {
    if (type === 'pickup') {
      reverseGeocode(pos.latitude, pos.longitude).then((r) => {
        setPickupAddress(r.displayName);
        setPickupLat(pos.latitude);
        setPickupLng(pos.longitude);
        setPickupMarker((prev) => prev ? { ...prev, position: pos, address: r.displayName } : null);
        if (destLat && destLng) calculate(pos, { latitude: destLat, longitude: destLng });
      }).catch(() => { setPickupLat(pos.latitude); setPickupLng(pos.longitude); });
    } else {
      reverseGeocode(pos.latitude, pos.longitude).then((r) => {
        setDestinationAddress(r.displayName);
        setDestLat(pos.latitude);
        setDestLng(pos.longitude);
        setDestMarker((prev) => prev ? { ...prev, position: pos, address: r.displayName } : null);
        if (pickupLat && pickupLng) calculate({ latitude: pickupLat, longitude: pickupLng }, pos);
      }).catch(() => { setDestLat(pos.latitude); setDestLng(pos.longitude); });
    }
  }

  const handleClearForm = useCallback(() => {
    setTitle('');
    setPurpose('');
    setScheduledPickupAt('');
    setExpectedEndAt('');
    setExpectedReturnAt('');
    setPickupAddress('');
    setPickupLat(null);
    setPickupLng(null);
    setPickupMarker(null);
    setDestinationAddress('');
    setDestLat(null);
    setDestLng(null);
    setDestMarker(null);
    setSpecialInstructions('');
    setRequestorName(authUser?.name ?? '');
    setRequestorEmail(authUser?.email ?? '');
    setError(null);
    clearRoute();
  }, [clearRoute, authUser]);

  async function handleSubmit(submitAfter = false) {
    setError(null);

    if (!title.trim()) { setError('Title is required'); return; }
    if (!scheduledPickupAt) { setError('Scheduled pickup is required'); return; }
    if (!expectedEndAt) { setError('Expected end is required'); return; }
    if (new Date(expectedEndAt).getTime() <= new Date(scheduledPickupAt).getTime()) { setError('Expected end must be after the scheduled pickup'); return; }
    if (tripType === 'ROUND_TRIP' && !expectedReturnAt) { setError('Return date is required for round trips'); return; }
    if (tripType === 'ROUND_TRIP' && expectedReturnAt && new Date(expectedEndAt).getTime() <= new Date(expectedReturnAt).getTime()) { setError('Expected end must be after the expected return'); return; }
    if (!requestorName.trim()) { setError('Requestor name is required'); return; }
    if (!requestorEmail.trim()) { setError('Requestor email is required'); return; }
    if (requestorEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestorEmail.trim())) { setError('Requestor email is invalid'); return; }
    if (!pickupLat || !pickupLng) { setError('Pickup location is required'); return; }
    if (!destLat || !destLng) { setError('Destination is required'); return; }
    if (pickupLat === destLat && pickupLng === destLng) { setError('Pickup and destination must be different'); return; }
    if (tripType === 'ROUND_TRIP' && !expectedReturnAt) { setError('Return date is required for round trips'); return; }

    setLoading(true);
    try {
      const payload: CreateTransportationRequestDto = {
        requestType,
        title: title.trim(),
        purpose: purpose.trim() || undefined,
        priority,
        requestorName: requestorName.trim(),
        requestorEmail: requestorEmail.trim(),
        tripType,
        passengerCount,
        requestedAssignmentPool,
        contactNumber: contactNumber.trim() || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        scheduledPickupAt: new Date(scheduledPickupAt).toISOString(),
        expectedEndAt: new Date(expectedEndAt).toISOString(),
        expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : undefined,
        pickupAddress,
        pickupLatitude: pickupLat,
        pickupLongitude: pickupLng,
        destinationAddress,
        destinationLatitude: destLat,
        destinationLongitude: destLng,
        estimatedDistanceMeters: route?.distanceMeters,
        estimatedDurationSeconds: route ? route.durationSeconds * TIME_MULTIPLIER : undefined,
        routeGeometry: route?.geometry as unknown as Record<string, unknown>,
      };

      const created = await createTransportationRequest(payload);

      if (submitAfter) {
        const submitted = await submitTransportationRequest(created.id);
        if (submitted.status === 'DRIVER_ASSIGNED') {
          let detail = '';
          try {
            const [assignment] = await getFleetAssignments(submitted.id);
            if (assignment?.driver?.name || assignment?.vehicle?.plateNumber) {
              detail = ` — ${assignment.driver?.name ?? ''}${assignment.vehicle?.plateNumber ? ` (${assignment.vehicle.plateNumber})` : ''}`;
            }
          } catch {
            // Assignment detail is best-effort; the confirmation still shows.
          }
          setSuccess(`Request ${submitted.requestNumber} ASSIGNED${detail}`);
        } else if (submitted.status === 'FOR_DISPATCH') {
          setSuccess(`Request ${submitted.requestNumber} submitted — needs assignment (no eligible driver/vehicle available)`);
        } else {
          setSuccess(`Request ${submitted.requestNumber} submitted`);
        }
        setTimeout(() => navigate('/transportation-requests'), 2000);
      } else {
        setSuccess(`Draft saved: ${created.requestNumber}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create request'));
    } finally {
      setLoading(false);
    }
  }

  const labelClass = 'block text-xs font-medium mb-1';
  const labelColor = { color: 'var(--color-text-secondary)' };
  const selectClass = 'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)]';
  const selectStyle = { borderColor: 'var(--color-border-default)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' };
  const inputClass = 'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)]';
  const inputStyle = { borderColor: 'var(--color-border-default)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' };

  const iconButtonClass = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition hover:bg-[var(--color-bg-surface-muted)]';
  const iconButtonColor = { color: 'var(--color-text-secondary)' };
  const textButtonClass = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition';

  return (
    <div
      className="relative -m-4 h-[calc(100vh-6rem)] overflow-hidden supports-[height:100dvh]:h-[calc(100dvh-6rem)] lg:-m-5"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      {/* ── Map background ── */}
      <div className="absolute inset-0">
        <BsaMap
          pickup={pickupMarker}
          destination={destMarker}
          route={route ?? null}
          loading={routeLoading}
          onMapClick={handleMapClick}
          onMarkerDragEnd={handleMarkerDragEnd}
          onLocate={() => {}}
          locationLoading={false}
          locationError={null}
          isMobile={isMobile}
        />
      </div>

      {/* ── Route summary chip (visible even when the form is collapsed) ── */}
      {route ? (
        <div
          className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border px-3.5 py-1.5 shadow-md lg:top-4"
          style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-bg-elevated)' }}
        >
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
            <Route size={13} style={{ color: 'var(--color-text-secondary)' }} />
            {formatDistance(route.distanceMeters)}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
            <Clock size={13} style={{ color: 'var(--color-text-secondary)' }} />
            {formatTime(route.durationSeconds)}
          </span>
        </div>
      ) : null}

      {/* ── Form overlay: bottom sheet on mobile, floating card on desktop ── */}
      <div
        className={
          isMobile
            ? `absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-2xl border border-b-0 shadow-2xl transition-all duration-300 ${formExpanded ? 'h-[62dvh]' : 'h-auto'}`
            : 'absolute bottom-4 left-4 top-4 z-20 flex w-[420px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl'
        }
        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full lg:hidden" style={{ background: 'var(--color-border-default)' }} />

        <header className="shrink-0 px-4 pb-3 pt-4 lg:pt-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/transportation-requests')}
                className={iconButtonClass}
                style={iconButtonColor}
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="truncate text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Lodge Request</h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setFormExpanded((prev) => !prev)}
                  className={iconButtonClass}
                  style={iconButtonColor}
                  aria-label={formExpanded ? 'Collapse form' : 'Expand form'}
                >
                  <ChevronDown size={18} className={`transition-transform duration-300 ${formExpanded ? '' : 'rotate-180'}`} />
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleClearForm}
                className={isMobile ? iconButtonClass : `${textButtonClass} border hover:bg-[var(--color-bg-surface-muted)]`}
                style={{ ...(isMobile ? iconButtonColor : { borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }) }}
                aria-label="Clear form"
                title="Clear form"
              >
                <Eraser size={16} />
                {isMobile ? null : 'Clear'}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className={`${textButtonClass} border hover:bg-[var(--color-bg-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50`}
                style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}
              >
                <Save size={16} /> Save
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className={`${textButtonClass} text-white disabled:cursor-not-allowed disabled:opacity-50`}
                style={{ background: 'var(--color-brand)' }}
              >
                <Send size={16} /> {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </header>

        {isMobile && !formExpanded ? null : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
            {error ? (
              <div className="mb-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mb-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--color-success-border)', background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
                {success}
              </div>
            ) : null}

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(true); }} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} style={labelColor}>Request Type *</label>
                  <select value={requestType} onChange={(e) => setRequestType(e.target.value as TransportationRequestType)} className={selectClass} style={selectStyle}>
                    <option value="OFFICIAL_TRIP">Official Trip</option>
                    <option value="EMPLOYEE_TRANSPORT">Employee Transport</option>
                    <option value="AIRPORT_TRANSFER">Airport Transfer</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={labelColor}>Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as TransportationPriority)} className={selectClass} style={selectStyle}>
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass} style={labelColor}>Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Airport pickup for CFO" className={inputClass} style={inputStyle} />
              </div>

              <div>
                <label className={labelClass} style={labelColor}>Purpose</label>
                <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="Brief description of the trip" className={inputClass} style={inputStyle} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} style={labelColor}>Requestor Name *</label>
                  <input type="text" value={requestorName} onChange={(e) => setRequestorName(e.target.value)} placeholder="Full name of the person requesting" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass} style={labelColor}>Requestor Email *</label>
                  <input type="email" value={requestorEmail} onChange={(e) => setRequestorEmail(e.target.value)} placeholder="name@example.com" className={inputClass} style={inputStyle} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass} style={labelColor}>Trip Type *</label>
                  <select value={tripType} onChange={(e) => setTripType(e.target.value as TransportationTripType)} className={selectClass} style={selectStyle}>
                    <option value="ONE_WAY">One Way</option>
                    <option value="ROUND_TRIP">Round Trip</option>
                    <option value="MULTI_STOP">Multi Stop</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={labelColor}>Pax *</label>
                  <input type="number" min={1} value={passengerCount} onChange={(e) => setPassengerCount(Math.max(1, parseInt(e.target.value) || 1))} className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass} style={labelColor}>Contact #</label>
                  <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Phone number" className={inputClass} style={inputStyle} />
                </div>
              </div>

              <div>
                <label className={labelClass} style={labelColor}>Assignment Pool</label>
                <select value={requestedAssignmentPool} onChange={(e) => setRequestedAssignmentPool(e.target.value)} className={selectClass} style={selectStyle}>
                  <option value="GENERAL">GENERAL</option>
                  <option value="EXECUTIVE">EXECUTIVE</option>
                  <option value="SPECIAL">SPECIAL</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} style={labelColor}>Scheduled Pickup *</label>
                  <input type="datetime-local" value={scheduledPickupAt} onChange={(e) => setScheduledPickupAt(e.target.value)} className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass} style={labelColor}>Expected End *</label>
                  <input type="datetime-local" value={expectedEndAt} onChange={(e) => setExpectedEndAt(e.target.value)} className={inputClass} style={inputStyle} />
                </div>
              </div>

              {tripType === 'ROUND_TRIP' ? (
                <div>
                  <label className={labelClass} style={labelColor}>Expected Return *</label>
                  <input type="datetime-local" value={expectedReturnAt} onChange={(e) => setExpectedReturnAt(e.target.value)} className={inputClass} style={inputStyle} />
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <LocationSearch label="Pickup" placeholder="Search pickup location" selectedValue={pickupAddress} onSelect={handlePickupSelect} onClear={handlePickupClear} />
                <LocationSearch label="Destination" placeholder="Search destination" selectedValue={destinationAddress} onSelect={handleDestinationSelect} onClear={handleDestinationClear} />
              </div>

              <div>
                <label className={labelClass} style={labelColor}>Special Instructions</label>
                <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} placeholder="Any special requirements or notes" className={inputClass} style={inputStyle} />
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}