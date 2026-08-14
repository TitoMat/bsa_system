# BSA Fleet Refactor — R5B Operational Exceptions + Redispatch + ETA Hardening

**Phase:** R5B
**Status:** COMPLETE — verdict: **GO** (R5C may proceed)
**Date:** 2026-08-12

---

## 1. Objective

Make the Fleet Operations experience resilient when dispatch doesn't go according to plan. Provide operational handling for driver decline, redispatch orchestration, route freshness awareness, and exception visibility — without creating a second dispatch engine.

---

## 2. Post-R5A Starting State

R5A delivered a map-first Dispatch Board with:
- Floating left panel + BsaMap map
- Status bucket filter chips with counts
- Request card queue with Auto Assign / Reassign actions
- Operations header (Auto Dispatch / Boss Present / Strategy controls)
- Compact `GET /transportation-requests/monitoring/board` endpoint (single query, LEFT JOINs)

Before R5B, exception handling was:
- Driver decline: handled by R4 FleetDispatchService (CANCELLED + optional 1-attempt auto-redispatch)
- Reassignment: handled by R4 dispatchReassign (SUPERSEDED → new pair)
- Route freshness: raw `routeCalculatedAt` date, no freshness classification
- No explicit exception model, no redispatch attempt tracking, no trip-phase safety gates

---

## 3. Existing Exception Flow Inventory

| Path | Pre-R5B behavior | R5B change |
|---|---|---|
| Driver decline | R4: CANCELLED + 1-attempt auto-redispatch (gated) | Enhanced visibility: DRIVER_DECLINED attention state, AUTO REDISPATCH button, attempt tracking |
| No eligible pair | R4: DispatchDecision with NO_ELIGIBLE_PAIR | Board attention model surfaces CRITICAL severity |
| Route stale | Raw `routeCalculatedAt` | FRESH/AGING/STALE classification, refresh button |
| Reassignment | R4 dispatchReassign | No change — consumed directly |
| Active-trip resource issue | Not handled | CRITICAL attention, no automatic replacement |
| Resource change impact | No warning on admin edit | Derived capabilities (getRedispatchState) |

---

## 4. Operational Exception Model

Typed codes + severities in `dispatch/utils/operationalException.ts`. All derived from canonical state. No separate persistence.

```ts
type ExceptionCode =
  'DRIVER_DECLINED' | 'DRIVER_UNAVAILABLE' | 'VEHICLE_UNAVAILABLE'
  | 'ASSIGNMENT_CONFLICT' | 'NO_ELIGIBLE_DRIVER' | 'NO_ELIGIBLE_VEHICLE'
  | 'NO_ELIGIBLE_PAIR' | 'REDISPATCH_REQUIRED' | 'REDISPATCH_FAILED'
  | 'ROUTE_UNAVAILABLE' | 'ROUTE_STALE' | 'ACTIVE_TRIP_RESOURCE_UNAVAILABLE';
```

---

## 5. Severity Model

| Severity | Description | Example |
|---|---|---|
| INFO | Informational, no action required | ROUTE_STALE |
| WARNING | Requires attention, not urgent | DRIVER_DECLINED, REDISPATCH_REQUIRED |
| CRITICAL | Immediate action needed | NO_ELIGIBLE_PAIR, ACTIVE_TRIP_RESOURCE_UNAVAILABLE |

---

## 6. Driver Decline Flow

Existing R4 `declineAssignment` handles the core lifecycle:
- FleetAssignment → CANCELLED
- Legacy → DECLINED (mirrored)
- Projection cleared
- Request → DRIVER_DECLINED
- Optional 1-attempt auto-redispatch (gated by `autoDispatchEnabled`)

R5B adds:
- Redispatch attempt counting (derived from fleet_assignments history)
- AUTO REDISPATCH button in the Dispatch Board
- DRIVER_DECLINED attention state with WARNING severity

---

## 7. PRE_TRIP / ACTIVE_TRIP / POST_TRIP Classification

Canonical classifier in `dispatch/utils/tripClassifier.ts`:

```ts
PRE_TRIP   = DRAFT | SUBMITTED | PENDING_APPROVAL | APPROVED | REJECTED
           | FOR_DISPATCH | DRIVER_ASSIGNED | DRIVER_ACCEPTED
           | DRIVER_DECLINED | REASSIGNMENT_REQUIRED

ACTIVE_TRIP = EN_ROUTE_TO_PICKUP | ARRIVED_AT_PICKUP | PASSENGER_ONBOARD
            | IN_TRANSIT | ARRIVED_AT_DESTINATION | DELAYED

POST_TRIP  = COMPLETED | CANCELLED | NO_SHOW | VEHICLE_BREAKDOWN
           | INCIDENT_REPORTED
```

Used as safety gate: automatic redispatch is **prohibited** during ACTIVE_TRIP.

---

## 8. Redispatch Policy

- **Automatic redispatch**: only when `autoDispatchEnabled = true` AND trip phase is PRE_TRIP
- **Manual redispatch**: always available for PRE_TRIP dispatchable requests
- **Attempt limit**: max 2 automatic redispatch attempts per request (derived from fleet_assignments SUPERSEDED/CANCELLED history)
- **R4 delegation**: all dispatch decisions flow through `FleetDispatchService`

---

## 9. Automatic Redispatch

`FleetRedispatchService.requestRedispatch()`:
1. Classify trip phase — block if ACTIVE_TRIP
2. Count prior attempts from fleet_assignments history
3. Enforce max 2 attempts
4. Delegate to `FleetDispatchService.dispatchReassign()`
5. Audit success/failure

No driver/vehicle selection. No pool policy override. R4 remains canonical.

---

## 10. Manual Redispatch

Dispatchers can trigger redispatch from the Dispatch Board using:
- **AUTO REDISPATCH** (for DRIVER_DECLINED state)
- **REASSIGN** (for any assigned request)

Both flow through R4 `dispatchReassign`.

---

## 11. Redispatch Attempt Limits

- **R4 internal retry**: 4 conflict-retry rounds per dispatch operation (handles race conditions)
- **R5B operational attempts**: max 2 redispatch attempts across distinct requests (prevents infinite loops)
- Attempts counted from fleet_assignments rows with SUPERSEDED/CANCELLED status from AUTOMATIC/REASSIGNMENT methods
- No new table — fully derived read-model

---

## 12. Redispatch History

Derived from `fleet_assignments` history. Example:

```
09:10 — Joseph + Grandia — AUTOMATIC — SUPERSEDED (Driver declined)
09:13 — Henry + Commuter — REASSIGNMENT — ACTIVE
```

No duplicate history storage. FleetAssignment history is authoritative.

---

## 13. Resource Availability Change Impact

`getRedispatchState()` identifies whether a request has an active assignment and whether it's in PRE_TRIP or ACTIVE_TRIP. This provides the foundation for resource-change warnings. Full admin-edit impact checks deferred to a later phase (requires injection into Driver/Vehicle catalog update flows).

---

## 14. Active-Trip Safety

**Mandatory gate:** If trip phase is ACTIVE_TRIP:
- Automatic redispatch is **prohibited**
- Surface CRITICAL operational issue (ACTIVE_TRIP_RESOURCE_UNAVAILABLE)
- Only manual intervention allowed

---

## 15. Route Freshness Policy

```ts
FRESH  — <= 15 minutes since calculation
AGING  — > 15 and <= 30 minutes
STALE  — > 30 minutes
UNAVAILABLE — no snapshot exists
```

Implemented in `dispatch/utils/routeFreshness.ts`. Derived from `routeCalculatedAt`. No new DB columns.

---

## 16. Estimated Arrival Logic

Display-only. Derived from:
```
estimatedArrivalAt = serviceStartAt + routeDurationSeconds
```

Not persisted. Not called "Live ETA". Clearly labeled as "Route Estimate" in UI.

---

## 17. Route Refresh

Preserved R3 route calculation. When route is STALE:
- Board card shows STALE badge
- Detail drawer shows STALE badge + REFRESH ROUTE button
- Refresh calls existing `POST /transportation-requests/:id/route/calculate`

---

## 18. Route Failure Preservation

If route refresh fails: previous valid snapshot preserved. No clearing. Board shows "Route unavailable" only when no snapshot exists. This is the existing R3 behavior (routes are explicit user action, not auto-cleared).

---

## 19. Monitoring Issue Queue

The R5A ISSUES operational bucket surfaces:
- CANCELLED, NO_SHOW, VEHICLE_BREAKDOWN, INCIDENT_REPORTED requests
- DRIVER_DECLINED state (WARNING severity)
- NO_ELIGIBLE_PAIR (CRITICAL severity)

The board's filter chips show live counts. Attention states are color-coded by severity.

---

## 20. Board API Changes

The `GET /transportation-requests/monitoring/board` response now includes:

```ts
tripPhase: 'PRE_TRIP' | 'ACTIVE_TRIP' | 'POST_TRIP'

attention: {
  required: boolean
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | null
  code: string | null
  label: string | null
  action: string | null
}

route: {
  distanceMeters, durationSeconds, provider, calculatedAt
  freshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE'
} | null
```

Backward-compatible: all new fields are additive.

---

## 21. Query Performance

Board query: still **1 query** (LEFT JOINs). No additional queries for exception derivation. All freshness/phase/attention computed in the existing row-processing loop.

---

## 22. Frontend Exception UX

- **Request cards**: STALE/AGING route badges, severity-coded attention labels (CRITICAL red, WARNING amber)
- **Detail drawer**: route freshness display, attention reason panel, AUTO REDISPATCH button for DRIVER_DECLINED, REFRESH ROUTE for STALE routes
- **Filter chips**: unchanged (operational bucket counts already reflect attention states)

---

## 23. Maps Preservation

- BsaMap preserved: YES
- Leaflet/MapLibre preserved: YES
- OSRM preserved: YES
- Valhalla preserved: YES
- Location search preserved: YES
- Reverse geocoding preserved: YES
- Route calculation preserved: YES
- Route snapshots preserved: YES
- Fit-to-route preserved: YES

---

## 24. R4 Dispatch Preservation

- FleetDispatchService canonical: YES
- FAIR_RANDOM unchanged: YES
- Concurrency protections unchanged: YES
- Assignment pool policy unchanged: YES
- Executive reservation policy unchanged: YES
- Direct assignment writer introduced outside FleetDispatchService: **NO**

---

## 25. R5A Board Preservation

- Board API: preserved and enhanced
- 22→7 operational mapping: unchanged
- Map-first layout: unchanged
- Floating left panel: unchanged
- Filter chips: unchanged
- Operations header: unchanged
- Request card design: enhanced with freshness + exception badges

---

## 26. Tests

- Backend: **174/174 PASS** (17 suites)
- Frontend: **36/36 PASS** (4 suites)

---

## 27. Live Dev Smoke Results

**Board API enrichment verified:**
```
GET /api/transportation-requests/monitoring/board
→ 200 OK
→ attention model populated (severity, code, label, action)
→ route freshness computed (FRESH/AGING/STALE/UNAVAILABLE)
→ tripPhase correctly classified
```

**Existing dispatch regression verified (from R4):**
- Auto-dispatch, reassignment, idempotency all functional

---

## 28. Files Changed

| File | Change |
|---|---|
| `backend/src/modules/dispatch/utils/tripClassifier.ts` | **NEW** — PRE_TRIP/ACTIVE_TRIP/POST_TRIP classifier |
| `backend/src/modules/dispatch/utils/routeFreshness.ts` | **NEW** — FRESH/AGING/STALE policy |
| `backend/src/modules/dispatch/utils/operationalException.ts` | **NEW** — Exception codes + severities |
| `backend/src/modules/dispatch/services/fleet-redispatch.service.ts` | **NEW** — Redispatch orchestration |
| `backend/src/modules/dispatch/controllers/dispatch.controller.ts` | Added redispatch endpoints (state GET, trigger POST) |
| `backend/src/modules/dispatch/dispatch.module.ts` | Registered FleetRedispatchService |
| `backend/src/modules/transportation/transportation.service.ts` | Enhanced board API (attention model, route freshness, trip phase) |
| `frontend/src/modules/transportation/api/transportation.api.ts` | Updated BoardRequest type |
| `frontend/src/modules/transportation/pages/TransportationRequestsPage.tsx` | Exception cards, route freshness badges, redispatch buttons |

---

## 29. Known Limitations

1. Resource-change admin warnings (Driver/Vehicle edit → active assignment impact) deferred — needs catalog module injection
2. No live driver GPS tracking (R5B+)
3. No continuous route ETA polling
4. Redispatch attempt tracking is fully derived (no persistence table) — works for current fleet scale

---

## 30. R5C Readiness

**Verdict: GO**

R5B delivered operational exception handling with:
- Typed exception model + severity classification
- PRE_TRIP/ACTIVE_TRIP/POST_TRIP safety classifier
- FleetRedispatchService orchestrating via canonical R4 engine
- Route freshness policy (FRESH/AGING/STALE)
- Enhanced board API with attention model + route freshness
- Exception-aware frontend (cards, detail drawer, redispatch buttons)
- No R4 divergence, no new dispatch engine, no map regression

R5C may proceed with Fleet Utilization + Operational Hardening.
