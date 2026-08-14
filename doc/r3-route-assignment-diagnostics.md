# R3 — Route Enrichment + Assignment Diagnostics Foundation

**Phase:** R3 of the BSA Fleet refactor
**Status:** COMPLETE — verdict: **GO** (R4 may proceed)
**Date:** 2026-08-12

---

## 1. Goal

Two additive, read-only capabilities on top of the R2 foundation:

1. **Route Enrichment** — persist a historical route snapshot (distance / duration /
   provider / calculated-at / geometry) on each Transportation Request, computed by
   the existing Maps stack (OSRM primary, Valhalla fallback).
2. **Assignment Diagnostics** — a READ-ONLY, ranked snapshot of "who COULD do this
   trip" (eligible/excluded drivers + vehicles with transparent scores and reasons),
   sourced transitionally from `transport_assignments` because `fleet_assignments`
   do not exist until R4.

R3 assigns nothing. R3 mutates nothing beyond the route snapshot fields it owns.
All ordering is deterministic — no `Math.random`, no non-reproducible ties.

---

## 2. Scope — Does / Does NOT

| Does (R3) | Does NOT (deferred to R4) |
|---|---|
| Persist route snapshots on requests (explicit user action) | Create `fleet_assignments` |
| Return ranked driver/vehicle diagnostics with scores | Pick winners or write assignments |
| Detect conflicts via existing `transport_assignments` | Change availability rules (R2 codes reused verbatim) |
| Add `expectedEndAt` to the frontend form (Step 6 closure) | Change maps providers / route engine |
| Add batch availability evaluation (same rules, 1 query per resource type) | Re-score live data on every request render (diagnostics are a snapshot) |
| One new canonical exclusion code: `EXISTING_REQUEST_CONFLICT` | Any change to `reasons`/`warnings` semantics of R2 codes |

---

## 3. Client Decisions Resolved (R2 §19 conditions)

| R2 condition | Resolution |
|---|---|
| Transitional diagnostic source | Existing `transport_assignments` table; NO `assignedDriverId`/`assignedVehicleId` columns, NO `fleet_assignments` table in R3 |
| R3 rules vs R2 result model | R2 reason/warning codes reused verbatim; exactly ONE new code added (`EXISTING_REQUEST_CONFLICT`) |
| Migration strategy | `migration:run` continues; `synchronize` stays disabled in config; R3 migration is additive + idempotent (`IF NOT EXISTS`) |
| Baseline lint debt | Touched R3 files: **0** lint errors. Baseline (~217 errors in untouched modules) left untouched, tracked separately for R4 |

---

## 4. Maps Preservation (Step 3)

The R3 integration verified the live routing stack and left it intact:

- **Backend `MapsService`** (axios): OSRM primary (`OSRM_BASE_URL`, default
  `router.project-osrm.org`), Valhalla fallback (enabled only when
  `VALHALLA_BASE_URL` is set), Nominatim search/reverse-geocode. `calculateRoute`
  returns `{ route: { distanceMeters, durationSeconds, distanceLabel,
  durationLabel, geometry } }`.
- **Frontend**: Leaflet/MapLibre renderers (`BsaMap`, `RouteSnapshotMap`),
  `useRouteCalculation` live preview, `LocationSearch`.

R3 **enrichment only**:
- `MapsService.calculateRoute` / `formatOSRMRoute` / `formatValhallaRoute` now
  return an explicitly typed `MapsRouteResult` with a `provider` field
  (`'OSRM' | 'Valhalla'`).
- `MapsModule` exports `MapsService` so transportation can inject it.

No provider changes, no URL changes, no contract breaks. Live smoke confirmed the
route engine is reachable from the dev container (OSRM responded).

---

## 5. Inspection Findings (Step 1)

- `TransportationRequest` already carried `estimated_distance_meters`,
  `estimated_duration_seconds`, `route_geometry` (jsonb), `expected_end_at`.
- `expectedEndAt` was already writable in the create/update DTOs and validated in
  `validateTripConstraints` (return > pickup; end > pickup; end > return;
  pickup ≠ destination; ROUND_TRIP requires `expectedReturnAt`).
- **Gaps closed by R3:** `route_provider`, `route_calculated_at` (new columns);
  frontend had no `expectedEndAt` field on the Lodge form and no `expectedEndAt` /
  `routeProvider` / `routeCalculatedAt` in its types (both added).
- `TransportAssignment` carries `request_id / driver_id / vehicle_id / status`
  (`OFFERED | ACCEPTED | DECLINED | REASSIGNED | CANCELLED`) — the transitional
  conflict source.

---

## 6. Schema Changes — Additive Only

Migration `1786501000000-R3RouteEnrichment.ts` (applied to dev via `migration:run`):

| Object | Type |
|---|---|
| `transportation_requests.route_provider` | `varchar(20)` nullable |
| `transportation_requests.route_calculated_at` | `timestamptz` nullable |
| `idx_transport_assignments_driver_status` | `(driver_id, status)` |
| `idx_transport_assignments_vehicle_status` | `(vehicle_id, status)` |
| `idx_transportation_requests_pickup_at` | `(scheduled_pickup_at)` |

Every statement is `IF NOT EXISTS` — idempotent across environments. No drops,
no deletes, no column changes.

---

## 7. Route Enrichment (`TransportationRouteService`)

`POST /transportation-requests/:id/route/calculate` (permission
`transportation_requests.edit_own`):

1. `404` if the request does not exist.
2. `400` if all four coordinates are zero (nothing routable).
3. Calls `MapsService.calculateRoute({ ... }, travelMode: 'car')`.
4. Persists a **snapshot** (`estimatedDistanceMeters`, `estimatedDurationSeconds`,
   `routeGeometry`, `routeProvider`, `routeCalculatedAt`) — deliberately separate
   from the live preview the frontend shows while drafting.
5. Audits `TRANSPORTATION_ROUTE_CALCULATED`.
6. Returns `{ distanceMeters, durationSeconds, provider, calculatedAt, geometry }`.

Design: a separate service (not merged into `TransportationService`) so a Maps
outage fails route calculation without failing the request lifecycle. If Maps is
unavailable, the call propagates the error and nothing is saved/audited.

---

## 8. Route Summary in Diagnostics

Diagnostics **never** call Maps. They render the persisted snapshot:

- `route.status = 'AVAILABLE'` when `estimatedDistanceMeters` or
  `estimatedDurationSeconds` is non-null; `'UNAVAILABLE'` otherwise.
- Diagnostics still fully evaluate candidates when the route is unavailable —
  the route is informational, the service window is the gate.
- Recalculating is an explicit action from the diagnostics panel
  ("Calculate Route"), never an automatic side effect.

---

## 9. Canonical Service Window (R2 preserved)

`deriveServiceWindow(request)` — unchanged from R2:

- `serviceStartAt = scheduledPickupAt`.
- `serviceEndAt = expectedEndAt`, falling back to `expectedReturnAt` (return
  pickup) when `expectedEndAt` is missing.
- Incomplete (no end at all) → `serviceWindowComplete: false` and diagnostics
  return **empty candidate lists** with no evaluation. No end is ever invented,
  and `estimatedDurationSeconds` is never used to derive one.

---

## 10. Hard Gates (R2 availability, reused verbatim)

Drivers: `DRIVER_INACTIVE`, `AUTO_ASSIGN_DISABLED`, `NO_DUTY_SCHEDULE`,
`OUTSIDE_SHIFT`, `REST_DAY`, `ON_LEAVE`, `DRIVER_UNAVAILABLE`, `LICENSE_EXPIRED`.

Vehicles: `VEHICLE_INACTIVE`, `AUTO_ASSIGN_DISABLED`, `CAPACITY_INSUFFICIENT`,
`VEHICLE_BLOCKED`, `UNDER_MAINTENANCE`, `REGISTRATION_EXPIRED`,
`INSURANCE_EXPIRED`, `CODING_RESTRICTION`.

Warnings (`LICENSE_EXPIRED`, `REGISTRATION_EXPIRED`, `INSURANCE_EXPIRED` when the
expiry falls inside the window) are surfaced but never exclude.

---

## 11. Conflict Diagnostics (transitional source)

One join query over `transport_assignments`:

- `a.status IN (OFFERED, ACCEPTED)` — the resource is held.
- `r.status NOT IN (COMPLETED, CANCELLED, REJECTED, NO_SHOW)` — the other request
  still occupies resources.
- `r.id != currentRequestId`.
- In-memory: `deriveServiceWindow` + `intervalsOverlap` on the other request's
  window. Adjacent-but-not-overlapping requests are **not** conflicts.
- Terminal request rows are re-filtered in memory as defense-in-depth (the SQL
  already excludes them).

A conflict adds `EXISTING_REQUEST_CONFLICT` to `exclusionReasons` (the single new
code) with `conflict = { requestId, requestNumber, startAt, endAt }`.

---

## 12. Workload Metric (transitional, diagnostic only)

Rolling 30-day lookback; counts assignment rows joined to non-terminal requests,
excluding `CANCELLED` assignments. Two `GROUP BY` queries (drivers, vehicles).
Used for the soft scoring below — **not** stored, **not** a policy.

---

## 13. Scoring (transparent + deterministic)

| Component | Formula | Range |
|---|---|---|
| Driver workload | `round(75 * (1 − min(count, 8) / 8))` | 0–75 |
| Driver schedule fit | `min(25, round(bufferHours * 2.5))` | 0–25 |
| Vehicle capacity fit | excess ≤ 1 → `60`; else `max(20, 60 − excess*6)` | 20–60 |
| Vehicle workload | `round(40 * (1 − min(count, 10) / 10))` | 0–40 |

- Buffer hours = per covering ON_DUTY shift, `min(before, windowHours)` +
  `min(after, windowHours)` (a huge shift cannot dominate).
- **Data-readiness was deliberately dropped** — no reliable non-arbitrary factor
  existed; weights were redistributed (75/25 drivers, 60/40 vehicles) rather than
  padding with noise.
- Tie-break: `score DESC → name ASC → id ASC`. Excluded lists: `name ASC → id ASC`.
- Excluded resources always get `score: null` + `scoreComponents: null` +
  `exclusionReasons`.

---

## 14. Query Strategy (no N+1)

1. request (`findOne`) · 2. drivers `isActive` (`find`) · 3. cars `isActive`
(`find`) · 4. schedules batch · 5. blocks batch · 6. covering shifts · 7. one
assignments-join for conflicts · 8. driver workload `GROUP BY` · 9. vehicle
workload `GROUP BY`.

**9 bounded queries regardless of fleet size.**

`FleetAvailabilityService` gained batch paths while preserving its public API:
`checkDrivers(drivers, startAt, endAt)` and `checkVehicles(cars, startAt, endAt,
passengerCount?)` share the exact same pure evaluation (`evaluateDriver` /
`evaluateVehicle`) as the single paths — single- and batch-path parity is
unit-tested.

---

## 15. Endpoints

| Endpoint | Method | Permission | Behavior |
|---|---|---|---|
| `/transportation-requests/:id/route/calculate` | POST | `transportation_requests.edit_own` | Computes + persists route snapshot |
| `/transportation-requests/:id/assignment-diagnostics` | GET | `transportation_requests.view_own` | Ranked read-only diagnostics |

---

## 16. Concurrency & Data Integrity

- Route snapshot writes are a single row update (`save`) on the request; an
  optimistic lock is not required because concurrent recalculations are
  last-write-wins on independent columns.
- Diagnostics reads nothing it does not snapshot at one instant; no locks taken.
- All availability evaluation remains read-only and repeatable.

---

## 17. Frontend

- **Types**: `expectedEndAt`, `routeProvider`, `routeCalculatedAt` added to
  `TransportationRequest`; full R3 diagnostics model typed in
  `transportation.types.ts`.
- **API**: `calculateTransportationRoute(id)`, `getAssignmentDiagnostics(id)`.
- **Lodge**: new required **Expected End** datetime (validated: end > pickup; for
  round trips end > return), sent as `expectedEndAt`. Legacy `TIME_MULTIPLIER`
  (3×) display behavior intentionally untouched.
- **RequestDetailsModal**: shows Expected End; fetches diagnostics when opened;
  new `AssignmentDiagnosticsPanel` renders the service window, route snapshot
  (with **Calculate Route** when missing), and ranked Best Fit / Excluded
  driver + vehicle lists with score bubbles, component breakdowns
  (workload / shift fit / capacity fit) and human-readable exclusion chips
  (e.g. "Overlaps TR-2026-0009").

---

## 18. Maps Compatibility

- `BsaMap` / `RouteSnapshotMap` renderers untouched; route polylines fit-bounds
  unchanged.
- Route snapshot geometry is the persisted `LineString`; the draft preview still
  uses live route data — the two are explicitly different and labeled so.
- Map tiles/style URLs (`openfreemap` style, OSM/CARTO tiles) untouched.

---

## 19. Tests

Backend (131 total, all passing):

- `transportation-route.service.spec.ts` — happy path + audit, provider
  passthrough (Valhalla) and default (OSRM), null geometry, 404, 400 zero
  coordinates, provider failure propagates without save/audit.
- `fleet-assignment-diagnostics.service.spec.ts` — complete result, schedule-fit
  buffer scoring, workload ranking, tie-breaks, capacity-fit ranking, conflict
  exclusion + metadata, adjacent non-overlap ignored, terminal requests ignored,
  combined availability+conflict reasons, UNAVAILABLE route survives,
  incomplete window → empty candidates (no queries), `hasLiveLocation` semantics,
  excluded sort order.
- `fleet-availability.service.spec.ts` — existing R2 spec updated for the batch
  internals (fixtures carry `driverId`; block mock returns `GROUP BY` rows) plus
  new `checkDrivers` / `checkVehicles` batch-parity cases (same rules, one
  query, empty lists, range validation).

Frontend (36 total, all passing): `AssignmentDiagnosticsPanel.test.tsx` — loading,
error, empty, ranked lists + components, exclusion labels + conflict reference,
route summary, Calculate Route wiring + busy state, incomplete-window warning.

Lint: **0 errors** in every R3-touched file (backend + frontend). Builds pass on
both sides.

---

## 20. Verification (live smoke, dev stack)

Request `TR-2026-000003` (Uptown BGC → PAGCOR Audit, ONE_WAY, 5 pax,
09:00→12:00 PH):

- Route snapshot: `5.7 km / 7.5 min via OSRM` — persisted
  (`routeProvider=OSRM`, `routeCalculatedAt` set, geometry saved).
- Diagnostics: window complete, route `AVAILABLE`, both real drivers evaluated
  and correctly excluded with `NO_DUTY_SCHEDULE` (dev DB has no duty schedules
  for the window) — the evaluation is data-driven, not hard-coded.
- **Read-only confirmed:** `transport_assignments` count for the request = 0.

---

## 21. Database Safety

| Check | Count |
|---|---|
| Tables dropped | **0** |
| Columns dropped | **0** |
| Rows deleted | **0** |
| Non-idempotent statements | **NO** (all `IF NOT EXISTS`) |

---

## 22. Known Limitations

1. **Transitional conflict source:** conflicts come from `transport_assignments`
   (OFFERED/ACCEPTED). `fleet_assignments` — with different semantics — does not
   exist until R4.
2. **Workload is a proxy:** assignment rows, not trip hours; vehicle workload
   counts blocks per assignment row.
3. **Coding-day rule is simple** (R2): no holiday calendar or window exemptions.
4. **Baseline lint debt** (~217 errors in untouched modules) persists; tracked
   for R4, not introduced by R3.
5. **`TIME_MULTIPLIER` (3×)** on the Lodge duration display is legacy behavior;
   preserved for R3, flagged for a product decision in R4.
6. **Dev `cars` table is empty** — vehicle diagnostics could not be live-smoked
   end-to-end; covered by unit tests.

---

## 23. Out of Scope (deferred to R4)

- `fleet_assignments` table + real assignment engine.
- Winner selection / auto-assign / re-assign flows.
- Real-time conflict detection on live data (R3 is a snapshot).
- Holiday calendar, traffic-aware windows, driver location-based ranking.
- Data-readiness scoring component (dropped by design — see §13).

---

## 24. R4 Readiness — Verdict: **GO**

R4 may proceed. Recommendations for R4 planning:

1. Replace the transitional conflict source with `fleet_assignments` when it
   lands — the diagnostics shapes (`conflict`, `currentAssignment`) are ready to
   be re-pointed.
2. Decide the `TIME_MULTIPLIER` product question and remove it if the product
   confirms raw Maps duration.
3. Revisit vehicle workload semantics once real assignment volume exists.
4. Schedule the baseline lint debt cleanup (or formally ignore it).

The R2 "GO WITH CONDITIONS" conditions are resolved; R3 ships clean tests,
clean lint on touched files, an applied additive migration, and a live-verified
read-only diagnostics surface.
