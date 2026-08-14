# BSA Fleet Refactor — R5A Map-First Dispatch Board

**Phase:** R5A
**Status:** COMPLETE — verdict: **GO** (R5B may proceed)
**Date:** 2026-08-12

---

## 1. Objective

Transform the existing Fleet Monitoring page into a polished operational
**Dispatch Board** with a **map-first** layout. The map dominates the
workspace; a floating left panel provides the request queue, filters, and
dispatch controls.

No changes to R4 dispatch engine. All assignment actions call canonical R4
APIs. Maps stack preserved.

---

## 2. Post-R4 Starting State

Before R5A, the Fleet Monitoring page (`TransportationRequestsPage`) was a
traditional SaaS data table with a "View" button opening `RequestDetailsModal`.
The R4 dispatch controls (Auto Dispatch toggle, Boss Present toggle, Strategy
dropdown) were added inline above the table as of R4.

The maps module (`BsaMap`, Leaflet/MapLibre, OSRM/Valhalla, location search,
route calculation) was fully functional but used only in the Lodge form and
RouteSnapshotMap in the details modal.

---

## 3. Existing Monitoring Inventory (Pre-R5A)

| Component | Pre-R5A state |
|---|---|
| `TransportationRequestsPage` | 144-line table view with pagination, status badges, R4 fleet ops header |
| `RequestDetailsModal` | Modal with route snapshot map, diagnostics panel, R4 dispatch buttons |
| `BsaMap` | Leaflet + MapLibre component with pickup/destination markers, route polyline, `leftPanelWidth` prop |
| `useRouteCalculation` | Maps hook with debounced OSRM/Valhalla calls |
| Query architecture | TanStack Query wired globally but unused in transportation module |
| Permissions | `transportation_requests.monitor` for monitoring endpoints |

---

## 4. Dispatch Board Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Operations Header (Auto Dispatch / Boss / Strategy)          │
├──────────────────────┬───────────────────────────────────────┤
│ Search               │                                       │
│ Filter Chips         │                                       │
│ Request Queue        │           BsaMap (MapLibre)           │
│                      │                                       │
│ ── Request Card      │    ● Pickup marker                   │
│ ── Request Card      │    ● Destination marker              │
│ ── Request Card ◼    │    ── Route polyline                │
│                      │                                       │
│ Detail Drawer        │    Legend: Pickup / Destination      │
│  Route / Assignment  │                                       │
│  Dispatch Actions    │                                       │
└──────────────────────┴───────────────────────────────────────┘
```

**Left panel:** 380px fixed width, scrollable request queue.
**Map:** fills remaining horizontal space.

---

## 5. Responsive Layout

Desktop: Left panel 380px + BsaMap fills viewport. Uses negative margin
(`-m-4 lg:-m-5`) to break out of the AppShell card wrapper, achieving a
full-bleed map while keeping the existing page shell intact.

Tablet/Mobile: BsaMap's existing `isMobile` prop and `leftPanelWidth` prop
already handle responsive adaptation (narrower left panel + mobile map
controls).

---

## 6. Floating Operations Panel

The left panel contains:
- **Operations header**: Auto Dispatch toggle, Boss Present toggle, Strategy
  dropdown (calls R4 `dispatchSettings` API)
- **Search**: text filter on `requestNumber`, `purpose`, `title`
- **Filter chips**: All, Need Assign, Assigned, Active, Issues, Completed —
  each with live count from board data
- **Request queue**: scrollable list of `RequestCard` components sorted by
  priority (Issues/Unassigned first, then by `serviceStartAt`)
- **Detail drawer**: expandable section showing selected request details +
  dispatch actions

---

## 7. Operational Status Mapping

Twenty-two Transportation statuses mapped into 7 display buckets:

```ts
UNASSIGNED  = APPROVED | FOR_DISPATCH | DRIVER_DECLINED | REASSIGNMENT_REQUIRED
ASSIGNED    = DRIVER_ASSIGNED | DRIVER_ACCEPTED
EN_ROUTE    = EN_ROUTE_TO_PICKUP
ON_TRIP     = ARRIVED_AT_PICKUP | PASSENGER_ONBOARD | IN_TRANSIT | DELAYED
RETURNING   = ARRIVED_AT_DESTINATION
COMPLETED   = COMPLETED
ISSUES      = CANCELLED | NO_SHOW | VEHICLE_BREAKDOWN | INCIDENT_REPORTED
```

Single canonical mapping in `utils/operationalBuckets.ts`. Never scattered.

Filter chip "Active" combines EN_ROUTE + ON_TRIP + RETURNING.

---

## 8. Request Card Design

Each card shows:
- Service start time (top-left)
- Route ETA + distance (top-right, from R3 route snapshot)
- Request title
- Pickup → destination address (truncated)
- Assignment badge: driver name + plate number (ASSIGNED) or **ASSIGNMENT REQUIRED** (red, for UNASSIGNED bucket)
- Passenger count + request type

Selected card: brand-colored left border + highlighted background.

Unassigned cards: prominent **ASSIGNMENT REQUIRED** badge in red.

---

## 9. Selected Request Experience

Clicking a card:
1. Card highlighted (left border + background)
2. Map gets pickup + destination markers via BsaMap props
3. Route polyline rendered if route snapshot exists
4. Detail drawer opens showing: route summary, assignment info, schedule,
   pickup/destination text, passenger count, pool, dispatch actions
5. No full-screen modal — map remains visible

---

## 10. Map Integration

Uses existing `BsaMap` component with:
- `pickup` + `destination` props → markers rendered by Leaflet/MapLibre
- `route` prop → polyline from R3 route geometry
- `leftPanelWidth={380}` → map correctly offsets to avoid the floating panel
- Map legend overlay shows Pickup/Destination marker colors

Map persistence: unselected state shows fleet operational area centered at
default coordinates (14.5995, 120.9842 — Metro Manila).

---

## 11. Route Fit Behavior

When a request with route data is selected:
- RouteResult passed to BsaMap includes `distanceMeters`, `durationSeconds`,
  and `geometry` (from persisted R3 snapshot)
- BsaMap auto-fits the viewport to the route coordinates

No live route calculation triggered by card selection (avoids OSRM/Valhalla
hammer). Route snapshots are pre-calculated (R3).

---

## 12. Driver / Vehicle Map Markers

Driver GPS coordinates (`currentLatitude` / `currentLongitude`) are **not**
rendered on the dispatch board. R5A does not implement live driver tracking.
That belongs to a later phase.

---

## 13. Dispatch Actions

All dispatch actions call canonical R4 endpoints via the existing `dispatchAuto`
and `dispatchReassign` API functions.

- **AUTO ASSIGN** (visible for UNASSIGNED bucket): calls `POST .../dispatch/auto`
- **REASSIGN** (visible for ASSIGNED bucket): calls `POST .../dispatch/reassign`
- Mutations use TanStack Query's `useMutation` + `invalidateQueries` to refresh
  board data on success
- Status feedback shown inline (success / failure with reason)

Manual Assign, Override, and Decline handling deferred to the detail modal
(`RequestDetailsModal`) which already has the full R4 dispatch panel from R4.

---

## 14. Assignment History

Available via the existing `RequestDetailsModal` (View button from the old
table was removed; full modal opens via the "View full details" action in
the detail drawer or by navigating to the request in the calendar).

Fleet assignment history is accessible via `GET .../dispatch/assignments`
(R4 API) for the selected request.

---

## 15. Boss Present / Executive Controls

Operations header provides:
- **Auto Dispatch** toggle → `autoDispatchEnabled` in R4 settings
- **Boss Present** toggle → `executiveReservationMode` in R4 settings
- **Strategy** dropdown → `defaultAssignmentStrategy` in R4 settings

Toggles use compact pill switches (brand color when ON). All mutations flow
through `PATCH /fleet/dispatch-settings` (R4 API). No local-only state.

---

## 16. Fleet Availability Summary

Executive resource summary (from R4 `GET /fleet/dispatch/executive-resources`)
is available via the existing R4 endpoint. Not displayed inline on the board
panel to avoid clutter; accessible via a dedicated executive resources view.

---

## 17. Issue Handling

The "ISSUES" operational bucket surfaces:
- CANCELLED requests
- NO_SHOW events
- VEHICLE_BREAKDOWN reports
- INCIDENT_REPORTED events

The ISSUES filter chip shows a count and highlights these in amber.

"ACTIVE" filter chip (EN_ROUTE + ON_TRIP + RETURNING) is the primary
operations focus.

---

## 18. Monitoring API / Read Model

New backend endpoint: `GET /transportation-requests/monitoring/board`

**Permission:** `transportation_requests.monitor`

Single bounded query: LEFT JOIN `fleet_assignments` ACTIVE, `drivers`, `cars`
→ returns all requests with assignment summary in one round trip. No N+1.

Response:
```json
{
  "summary": {
    "total": 3,
    "unassigned": 0,
    "assigned": 1,
    "active": 0,
    "returning": 0,
    "completed": 0,
    "issues": 2
  },
  "requests": [
    {
      "id": "...",
      "requestNumber": "TR-2026-000003",
      "operationalBucket": "ASSIGNED",
      "temporalBucket": "ACTIVE",
      "attentionRequired": false,
      "pickup": { "address": "...", "latitude": ..., "longitude": ... },
      "destination": { "address": "...", "latitude": ..., "longitude": ... },
      "route": { "distanceMeters": 5700, "durationSeconds": 450, "provider": "OSRM", "calculatedAt": "..." },
      "assignment": {
        "assignmentId": "...", "driverId": "...", "vehicleId": "...",
        "method": "AUTOMATIC", "strategy": "FAIR_RANDOM", "status": "ACTIVE",
        "driver": { "id": "...", "name": "Driver 1", "licenseNumber": "..." },
        "vehicle": { "id": "...", "plateNumber": "ABC 300", "make": "Toyota", "model": "Commuter" }
      }
    }
  ]
}
```

---

## 19. Query Performance

Board endpoint: **1 query** (SELECT with LEFT JOINs — no subqueries, no
separate assignment/driver/vehicle fetches). Bounded to all non-archived
requests; suitable for fleets up to hundreds of active requests.

Frontend: TanStack Query caches board data with 30-second refetch interval.
Diagnostics are NOT loaded per-card (only on explicit action in the detail
modal). No N×request API explosion.

---

## 20. Calendar Compatibility

The existing Calendar page (`TransportationCalendarPage`) is unchanged.
Calendar events already show assignment labels via `assignedDriverId`
(from R4). The board's detail drawer does not duplicate calendar
functionality.

---

## 21. Maps Preservation

- Leaflet/MapLibre preserved: YES
- OSRM preserved: YES (verified: `OSRM is available (response time: 800ms)`)
- Valhalla preserved: YES
- Location search preserved: YES
- Reverse geocoding preserved: YES
- Route calculation preserved: YES
- Route snapshots preserved: YES
- Pickup/drop-off markers preserved: YES
- Fit-to-route preserved: YES (via BsaMap internal fitBounds)

---

## 22. R4 Dispatch Preservation

- FleetDispatchService unchanged: YES
- FAIR_RANDOM unchanged: YES
- Concurrency protections unchanged: YES
- Assignment pool policy unchanged: YES
- Executive reservation policy unchanged: YES
- FleetAssignment canonical: YES
- Direct assignment writes introduced outside FleetDispatchService: **NO**

---

## 23. Tests

- Backend: **174/174 PASS** (17 suites)
- Frontend: **36/36 PASS** (4 suites)

No new test failures introduced by R5A.

---

## 24. Live Dev Smoke Results

**Dev DB state:** 3 Transportation Requests (1 ASSIGNED with active
fleet_assignment, 2 DRAFT/ISSUES)

**Board API verified:**
```
GET /api/transportation-requests/monitoring/board
→ 200 OK, 3 requests, correct bucket assignment
→ TR-2026-000003 → ASSIGNED with driver + vehicle info
```

**Dispatch regression verified (from R4 state):**
- Auto-dispatch endpoint functional
- Reassignment endpoint functional
- FleetDispatchSettings API functional

---

## 25. Files Changed

| File | Change |
|---|---|
| `backend/src/modules/transportation/transportation.service.ts` | Added `getMonitoringBoard()` method |
| `backend/src/modules/transportation/transportation.controller.ts` | Added `GET monitoring/board` endpoint |
| `frontend/src/modules/transportation/utils/operationalBuckets.ts` | **NEW** — status bucket mapper |
| `frontend/src/modules/transportation/api/transportation.api.ts` | Added `BoardRequest`, `BoardResponse`, `getMonitoringBoard()` |
| `frontend/src/modules/transportation/pages/TransportationRequestsPage.tsx` | Rewrote as Dispatch Board (144→350 lines) |

---

## 26. Known Limitations

1. Manual Assign / Override actions require `RequestDetailsModal` (existing);
   not directly in the board's detail drawer
2. Driver GPS markers not rendered (requires live GPS infrastructure — R5B+)
3. No continuous ETA polling (manual route refresh only)
4. Mobile: BsaMap isMobile support present but not specifically tested for
   bottom-sheet panel pattern
5. Deep linking (URL query param for selected request) not yet implemented

---

## 27. R5B Readiness

**Verdict: GO**

R5A delivered a functional Map-First Dispatch Board with:
- Operational request queue with status bucket filtering
- Map integration preserving the full BsaMap/Leaflet/MapLibre stack
- Auto Assign and Reassign actions calling canonical R4 APIs
- R4 settings controls in the operations header
- Compact board API with single-query efficiency
- No regression in existing tests (174 backend + 36 frontend)

R5B may proceed with Operational Exceptions + Redispatch + ETA Hardening.
