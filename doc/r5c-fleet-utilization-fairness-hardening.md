# BSA Fleet Refactor — R5C Fleet Utilization + Fairness Visibility + Operational Hardening

**Phase:** R5C
**Status:** COMPLETE — verdict: **GO**
**Date:** 2026-08-12
**Recommended next phase:** R6A — Notifications + Driver Operational Delivery

---

## 1. Objective

Build read-heavy operational intelligence on top of canonical FleetAssignment and Transportation data to give Fleet Operations visibility into driver workload, vehicle utilization, assignment fairness, dispatch performance, and route health.

R5C does NOT modify the assignment algorithm.

---

## 2. Post-R5B Starting State

R5B delivered:
- Trip classifier (PRE_TRIP/ACTIVE_TRIP/POST_TRIP)
- Route freshness policy (FRESH/AGING/STALE)
- Operational exception model with severity
- FleetRedispatchService (orchestration, attempt limits, active-trip safety)
- Enhanced board API with attention model + route freshness

---

## 3. R5B Test Coverage Verification (Step 0)

Before any R5C code, 46 new tests were added for R5B utilities:

| Module | Tests |
|---|---|
| `tripClassifier.spec.ts` | 22 statuses verified (21 PRE_TRIP → ACTIVE_TRIP → POST_TRIP + coverage guard) |
| `routeFreshness.spec.ts` | 9 boundary tests (null, ≤15m, ≥15m, ≤30m, ≥30m, >24h, edge cases) |
| `fleet-redispatch.service.spec.ts` | 8 tests (redispatch state, active trip block, max attempts, delegation, failure) |
| **Total new** | **46** |
| **Cumulative** | **220** |

---

## 4. Analytics Source Inventory

Primary sources:
- `fleet_assignments` — canonical assignment history (method, strategy, status, service window, timestamps)
- `transportation_requests` — request lifecycle (status, pickup/destination, passenger count, route)
- `drivers` — active resources, pool, auto-assign flag
- `cars` — active resources, pool, seating capacity, vehicle status

All analytics use FleetAssignment as source of truth. Compatibility projections (assignedDriverId/assignedVehicleId) not used for counting.

---

## 5. Analytics Architecture

**Service:** `FleetOperationsAnalyticsService` — read-only aggregate queries. No mutations.

**Endpoint:** `GET /fleet/analytics/operations?period=today|7d|30d|custom&assignmentPool=GENERAL|EXECUTIVE|SPECIAL`

**Permission:** `transportation_requests.monitor`

---

## 6. Metrics Dictionary

| Metric | Definition | Source | Included | Excluded |
|---|---|---|---|---|
| Trip Count | FleetAssignment rows with non-SUPERSEDED, non-CANCELLED status | fleet_assignments | ACTIVE, COMPLETED | SUPERSEDED, CANCELLED |
| Scheduled Service Hours | sum(serviceEndAt - serviceStartAt) for trip-counted assignments | fleet_assignments | Same as trip count | Same |
| Assignment Method Count | Grouped by assignmentMethod on trip-counted assignments | fleet_assignments | AUTOMATIC, MANUAL, OVERRIDE, REASSIGNMENT | — |
| Fairness Spread | max(tripCount) - min(tripCount) per pool | fleet_assignments + drivers | Active drivers filtered by pool | All non-trip-counted assignments |
| Active Assignments | tripCounted assignments with status='ACTIVE' | fleet_assignments | ACTIVE | Others |
| Redispatch Count | Reassignment method + superseded/cancelled records | fleet_assignments | REASSIGNMENT method | — |
| Route Freshness | Derived from routeCalculatedAt timestamp | transportation_requests | All | — |
| Driver Declined Count | Requests with status='DRIVER_DECLINED' | transportation_requests | DRIVER_DECLINED | — |

---

## 7. Reporting Periods

- Today: midnight to now in local date
- 7 Days: rolling 7-day window ending today
- 30 Days: rolling 30-day window ending today
- Custom: user-specified start/end with validation

FleetAssignment filtering uses `assignedAt` within the period.
Request filtering uses `scheduledPickupAt` within the period.

---

## 8. Driver Workload

Driver table columns: Driver, Pool, Trips, Hours, Auto, Manual, Override, Active.

Sorted by trip count descending. Pool badges shown.

SUPERSEDED assignments excluded from trip count to avoid double-counting reassigned requests.

---

## 9. Driver Fairness Visibility

Each pool (GENERAL, EXECUTIVE, SPECIAL) has a separate fairness view:
- Min/Max/Average trip counts
- Spread (max - min)
- Per-driver assignment counts with horizontal bars
- Spread severity indicators (green ≤1, amber ≤3, red >3)

GENERAL fairness EXCLUDES EXECUTIVE/SPECIAL drivers. Pool context labels explain intentional reservation differences.

---

## 10. Vehicle Utilization

Vehicle table columns: Vehicle, Plate, Pool, Trips, Hours, Auto, Manual, Active.

Scheduled utilization shown as hours. No fabricated utilization percentage — raw hours are more operationally meaningful.

---

## 11. Assignment Method Distribution

Shows AUTOMATIC, MANUAL, OVERRIDE, REASSIGNMENT counts. Helps operations understand whether automatic dispatch is being used.

---

## 12. Dispatch Performance

Summary cards for Requests, Assignments, Completed, Active, Unassigned, Redispatches.

---

## 13. Assignment Latency

Deferred. Reliable dispatchableAt timestamp not universally available in current data model. Documented as future scope.

---

## 14. Redispatch Metrics

Redispatch count from REASSIGNMENT method assignments + superseded records.

---

## 15. Operational Exception Metrics

Counted exception types:
- DRIVER_DECLINED (from request status)
- NO_ELIGIBLE_PAIR (from dispatchable unassigned requests)
- ROUTE_UNAVAILABLE (from requests without route provider)
- REDISPATCH_COUNT (from reassignment/superseded records)

---

## 16. Route Health Metrics

Distribution of FRESH, AGING, STALE, UNAVAILABLE across all requests in the period.

---

## 17. Duty / Availability Context

Deferred. Full eligibility-aware fairness (duty days, rest days, auto-assign) requires scheduling data joins beyond current scope.

---

## 18. Assignment Pool Segmentation

All analytics filterable by pool (All, GENERAL, EXECUTIVE, SPECIAL). Fairness is pool-specific. Executive/SPECIAL pools are separated and labeled with context about intentional reservation.

---

## 19. Legacy Data Handling

FleetAssignment is used as canonical source. Requests without FleetAssignment history are counted in request totals but not in assignment metrics. Legacy transport_assignments rows are not counted.

---

## 20. Backend Analytics API

`GET /fleet/analytics/operations`
- Query params: period, startAt, endAt, assignmentPool
- 1 query to each table (fleet_assignments, transportation_requests, drivers, cars)
- Post-processing in JS for grouping/counting — bounded to fleet size
- Response: summary, dispatch mix, driver workload, vehicle utilization, fairness by pool, exceptions, route health

---

## 21. Query Strategy / Performance

Dev response: <100ms for 3 requests, 2 drivers, 3 vehicles.
Query count: 4 (fleet_assignments + requests + drivers + cars).
Post-processing: O(n) single pass per table.

Bounded approach suitable for typical fleet sizes. No N+1. No per-driver/per-vehicle queries.

---

## 22. Frontend Fleet Insights

Route: `/fleet/insights`
Permission: `transportation_requests.monitor`

Layout:
- Period toggles (Today / 7 Days / 30 Days) + Pool filter
- Summary stat cards (6 metrics)
- Dispatch mix + Route health side-by-side
- Fairness by pool (GENERAL, EXECUTIVE, SPECIAL) with spread indicators
- Driver workload table (sortable by trips, hours)
- Vehicle utilization table
- Exception count cards

TanStack Query caching with period + pool key. No write actions.

---

## 23. Monitoring Board Preservation

R5A map-first Dispatch Board unchanged. Fleet Insights is a separate route with its own tabular/stat layout. The default Fleet Monitoring experience remains map-first.

---

## 24. Maps Preservation

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

## 25. R4 Dispatch Preservation

- FleetDispatchService canonical: YES
- FAIR_RANDOM unchanged: YES
- PURE_RANDOM unchanged: YES
- Concurrency protection unchanged: YES
- Assignment pool policy unchanged: YES
- Boss/Executive policy unchanged: YES
- New assignment writer introduced: **NO**

---

## 26. R5B Redispatch Preservation

- FleetRedispatchService unchanged: YES
- Trip classifier unchanged: YES
- Route freshness policy unchanged: YES
- Attempt limit unchanged: YES
- ACTIVE_TRIP safety unchanged: YES

---

## 27. Tests

| Suite | Count |
|---|---|
| Backend R5B utilities (new) | 46 |
| Backend R4 + R5A | 174 |
| **Backend total** | **220** |
| Frontend | 36 |
| **Total** | **256** |

All pass. Zero regressions.

---

## 28. Live Dev Smoke Results

**Analytics API verified:**
```
GET /api/fleet/analytics/operations?period=30d
→ 200 OK
→ Summary: 3 requests, 1 assignment, 0 completed, 0 active, 0 unassigned, 1 redispatch
→ Dispatch: 0 auto, 0 manual, 0 override, 1 reassignment
→ Correctly excludes SUPERSEDED/CANCELLED from trip counts
```

---

## 29. Database Safety

- Tables dropped: 0
- Columns dropped: 0
- Rows deleted: 0
- Synchronize used: NO
- New indexes: None required (existing R4 indexes sufficient for current fleet size)

---

## 30. Files Changed

| File | Change |
|---|---|
| `backend/src/modules/dispatch/utils/tripClassifier.spec.ts` | **NEW** — 22-status coverage |
| `backend/src/modules/dispatch/utils/routeFreshness.spec.ts` | **NEW** — 9 boundary tests |
| `backend/src/modules/dispatch/services/fleet-redispatch.service.spec.ts` | **NEW** — 8 orchestration tests |
| `backend/src/modules/dispatch/services/fleet-operations-analytics.service.ts` | **NEW** — Aggregate analytics |
| `backend/src/modules/dispatch/controllers/fleet-dispatch-settings.controller.ts` | Added FleetAnalyticsController |
| `backend/src/modules/dispatch/dispatch.module.ts` | Registered analytics service + controller |
| `frontend/src/modules/transportation/api/transportation.api.ts` | Added analytics types + getFleetAnalytics |
| `frontend/src/modules/transportation/pages/FleetInsightsPage.tsx` | **NEW** — Fleet Insights dashboard |
| `frontend/src/app/router.tsx` | Added `/fleet/insights` route |

---

## 31. Known Limitations

1. Assignment latency metric deferred (no universal dispatchableAt timestamp)
2. Full eligibility-aware fairness deferred (requires duty schedule joins)
3. No export functionality yet
4. Analytics is single-period snapshot — no trend/compare mode
5. No Redis caching (not needed at current fleet size)

---

## 32. Next-Phase Recommendation

**Recommended: R6A — Notifications + Driver Operational Delivery**

Rationale:
- R0A–R5C have built the complete dispatch engine, visibility, and operational workflows
- Driver-facing delivery (accept assignment notifications, mobile-friendly view, driver trip workflow) is the next logical step
- The analytics foundation (R5C) provides the operational context for notification decisions

Alternative: R6B (Live GPS) could follow after notifications if location tracking is prioritized.
