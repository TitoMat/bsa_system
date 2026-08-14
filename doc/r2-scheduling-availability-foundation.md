# BSA Fleet Refactor — R2 Scheduling & Availability Foundation

Phase: R2 · Goal: read-only availability evaluation + duty/block temporal data.
Sibling reports: `doc/r0a-safety-foundation.md` (R0A), `doc/r1-driver-vehicle-domain-normalization.md` (R1).

---

## 1. Goal

Give the BSA fleet the temporal foundation R3's dispatch engine will consume, without
building any assignment logic. R2 introduces (a) driver duty schedules, (b) vehicle
availability blocks, (c) a canonical service-window model on top of existing request
fields, and (d) **read-only** driver/vehicle availability evaluation with a typed result
model. All changes are additive and audited. No auto-assignment, no `fleet_assignments`,
no scheduling engine, no Maps changes.

## 2. R2 Scope — Does / Does NOT

### Does

- `DriverDutySchedule` entity + full audited CRUD (create/update/delete are explicit user
  actions, never automatic).
- `VehicleAvailabilityBlock` entity + full audited CRUD.
- Shift time model: `HH:mm` 24h strings on a `schedule_date`, overnight shifts resolved
  into concrete UTC instants; documented and tested explicitly.
- Canonical service-window derivation from existing request fields via a helper —
  no redundant DB fields beyond the one additive column below.
- Reusable interval overlap primitive + shift-resolution utility (shared by services).
- Read-only availability evaluation for drivers and vehicles with the typed result model.
- Additive migration (`R2SchedulingAvailability`) — no drops, no row deletes.
- Frontend: Duty Schedule page and Vehicle Availability page on the existing BSA design
  system; dashboard quick links.
- Calendar and Maps regression: unchanged behavior (see §14).

### Does NOT

- **No** auto-assignment of drivers or vehicles (R3).
- **No** random/fair assignment, no boss-present mode, no dispatch workflow.
- **No** `fleet_assignments` table and no assignment-conflict checks.
- **No** travel-time scoring, no ETA computation, no Maps/OSRM changes.
- **No** automatic schedule/block generation (no recurring schedules in R2; a 24h
  full-day "00:00 → 00:00" shift is intentionally not representable — record two ON_DUTY
  records instead).
- **No** mutation of `driver.status`/`vehicle.vehicleStatus` from schedule/block
  records: resource state stays resource state; `DriverDutySchedule` and
  `VehicleAvailabilityBlock` are temporal state.
- **No** Metro Manila holiday/coding-day-window exemptions (simple configured coding-day
  rule only).

## 3. Inspection — Existing Scheduling Fields (Step 1)

Verification was done against the actual entities after R1 (no names assumed).

### `driver` (catalog)

| field | type | used by R2 |
|---|---|---|
| `id` | uuid | schedule FK |
| `license_number` | varchar | license validity check (`license_expiry` also present) |
| `status`/`duty_status` | varchar | status check `ACTIVE` |
| `auto_assign_enabled` | boolean | eligibility flag (read-only) |
| `assignment_pool` | varchar | **not** used in R2 (R3: dispatch pools) |

### `car` (catalog)

| field | type | used by R2 |
|---|---|---|
| `id` | uuid | block FK |
| `vehicle_status` | varchar | status check (OPERATIONAL) |
| `auto_assign_enabled` | boolean | eligibility flag (read-only) |
| `seating_capacity` | int | capacity check vs `passengers` |
| `registration_expiry`, `insurance_expiry` | date | expiry warnings |
| `coding_day` | varchar | coding-day restriction reason |

### `transportation_request`

| field | type | present | note |
|---|---|---|---|
| `request_type` | varchar | yes | SINGLE_TRIP / ROUND_TRIP |
| `trip_type` | varchar | yes | outbound/return detail |
| `scheduled_pickup_at` | timestamptz | yes | outbound pickup instant |
| `expected_return_at` | timestamptz | nullable | round-trip return pickup |
| `expected_end_at` | timestamptz | **NEW in R2** | canonical service-window end |
| `passenger_count` | int | yes | R2 normalizes to `>= 1` |

### Field-gap findings (documented before any schema change)

1. **No service-window end.** ROUND_TRIP has `expected_return_at` (return pickup) but no
   expected completion; SINGLE_TRIP has neither. Decision: add **one** nullable additive
   column `expected_end_at`; window end = expected completion (not travel-time
   derivation — explicitly permitted by the phase; Maps never auto-calculates).
2. **`passenger_count` stored as string in legacy rows.** R1 rewrote the entity to `int`,
   but legacy string values could still be present. Decision: normalize additively —
   the entity default stays `1`, the DTO now enforces integer `>= 1`; no rewrite.
3. **`expected_end_at` read path only.** The create/update DTOs were left untouched
   (request mutation is out of R2); `expectedEndAt` is populated by the window helper
   at evaluation time, mirroring the `current_latitude`/`current_longitude` precedent
   from R0A/R1 (present, not externally writable).

## 4. Schema Changes — Additive Only

Migration `R2SchedulingAvailability` (id `3`, timestamp `1786610000000`) is fully
additive, written for both the legacy dev (`synchronize: true`) and production
(migration-run) modes:

- `CREATE TABLE IF NOT EXISTS driver_duty_schedules` (no drops).
- `CREATE TABLE IF NOT EXISTS vehicle_availability_blocks` (no drops).
- `ALTER TABLE transportation_requests ADD COLUMN IF NOT EXISTS expected_end_at`.
- `passenger_count` unchanged (guard `DO $$ ... IF EXISTS` ensures no legacy-type
  rewrite on production; dev `synchronize` already applied the R1 `int` type).
- FKs to `drivers(id)` / `cars(id)` / `users(id)` — no cascade delete from users.
- Indexes: `(driver_id, schedule_date)` and `(vehicle_id, start_at, end_at)`.
- Unique constraint `(driver_id, schedule_date)` on duty schedules.
- Check constraint `end_at > start_at` on blocks.

Verified on the dev DB (`\d driver_duty_schedules`, `\d vehicle_availability_blocks`,
`information_schema.columns` for `expected_end_at`) — all three migration rows present,
no pre-existing table dropped.

## 5. `DriverDutySchedule`

Columns: `id, driver_id, schedule_date, shift_start, shift_end, status, notes,
created_by_user_id, created_at, updated_at`.

- `shift_start`/`shift_end` are `HH:mm` 24h strings; `shift_end <= shift_start` means an
  overnight shift (documented, validated by the shift resolver, §7).
- Statuses: `ON_DUTY | REST_DAY | LEAVE | UNAVAILABLE` (canonical in
  `scheduling-domain.ts`; matches the driver duty-status vocabulary from R1 so future
  assignment can join on it).
- Validation (service + DTO): driver must exist; date is `YYYY-MM-DD` and parseable;
  shift times match `HH:mm`; `shift_start !== shift_end`; one schedule per
  driver per date (unique constraint surfaced as a clear 400 message).
- All writes audited: `CREATE_DRIVER_DUTY_SCHEDULE`, `UPDATE_DRIVER_DUTY_SCHEDULE`,
  `DELETE_DRIVER_DUTY_SCHEDULE` with actor id/email and target id.

## 6. `VehicleAvailabilityBlock`

Columns: `id, vehicle_id, start_at, end_at, reason, notes, created_by_user_id,
created_at, updated_at`.

- `start_at`/`end_at` are `timestamptz`; `end_at > start_at` enforced in DB and DTO.
- Reasons: `MAINTENANCE | REPAIR | LENT_OUT | EXECUTIVE_RESERVED | MANUAL_BLOCK | OTHER`.
- Coding-day restrictions are **not** stored as blocks — they are derived from
  `car.coding_day` at evaluation time.
- Historical blocks are never auto-deleted; delete is explicit + audited
  (`CREATE_VEHICLE_AVAILABILITY_BLOCK` / `UPDATE_…` / `DELETE_…`).
- Creating a block does **not** mutate `vehicle_status` (temporal ≠ resource state).

## 7. Shift Time Model & Canonical Service Windows

`domain/shift-time.ts` implements, with no date library (R0A dependency policy):

- `resolveShiftInterval(scheduleDate, shiftStart, shiftEnd)`: resolves a local
  (Asia/Manila, +08:00) `YYYY-MM-DD` + `HH:mm` pair into concrete `Date` instants.
  Overnight (`shiftEnd <= shiftStart`) rolls to the following local day. Uses an
  explicit offset constant (`+480` minutes) rather than `Intl`, which is nondeterministic
  on Node — this is documented in the module.
- `shiftContains(interval, requestedStart, requestedEnd)`: full containment with
  half-open semantics; boundary-touch is considered contained.
- `computeServiceWindow(request)`: derives the canonical window — SINGLE_TRIP uses
  `scheduledPickupAt → expectedEndAt ?? scheduledPickupAt`; ROUND_TRIP uses
  `scheduledPickupAt → expectedEndAt ?? expectedReturnAt ?? scheduledPickupAt`.
  No travel time is invented; a missing end degrades to a zero-length window
  (availability eval then correctly reports no coverage).
- `isScheduleDateValid` etc. guard entity/service input.

Tests (`shift-time.spec.ts`) explicitly cover: normal, overnight, boundary-touch
containment, both window derivation paths, and invalid input rejection.

## 8. Canonical Overlap / Conflict Primitives

`domain/interval.ts` exports `intervalsOverlap(aStart, aEnd, bStart, bEnd)` implementing
the strict rule **`existingStart < requestedEnd && existingEnd > requestedStart`**, used
consistently by schedule validation, block validation, and availability evaluation.
`interval.spec.ts` verifies: full containment, partial left/right overlap, exact
equal, adjacent before/after (no overlap), no overlap, and overnight intervals.

## 9. Availability Evaluation Services (read-only)

`services/fleet-availability.service.ts`:

- `checkDriver(driverId, startAt, endAt, passengers?)`: driver exists → active →
  `autoAssignEnabled` → valid license → one or more ON_DUTY shifts covering the whole
  window → not REST_DAY/LEAVE/UNAVAILABLE. No assignment-conflict checks (no
  `fleet_assignments` in R2; documented as a diagnostic gap — a future
  `transportation_request`-based diagnostic is explicitly deferred so we do not
  redesign assignment storage here).
- `checkVehicle(vehicleId, startAt, endAt, passengers?)`: vehicle exists →
  `OPERATIONAL` → `autoAssignEnabled` → `passengers <= seatingCapacity` → no
  overlapping block → expiry warnings → coding-day restriction derived from
  `car.coding_day` matched to the window's local weekday.

Both are pure evaluation: no writes, no locks, no side effects.

## 10. Result Model (Step 12)

```ts
{ available: boolean; reasons: string[]; warnings: string[]; evaluatedStartAt: string; evaluatedEndAt: string }
```

- `reasons` (blockers): `DRIVER_NOT_FOUND`, `DRIVER_INACTIVE`,
  `AUTO_ASSIGN_DISABLED`, `DRIVER_LICENSE_INVALID`, `NO_DUTY_SCHEDULE`,
  `OUTSIDE_SHIFT`, `SCHEDULE_STATUS_BLOCKS`; `VEHICLE_NOT_FOUND`, `VEHICLE_NOT_OPERATIONAL`,
  `VEHICLE_AUTO_ASSIGN_DISABLED`, `CAPACITY_EXCEEDED`, `BLOCKED_INTERVAL`,
  `CODING_RESTRICTION`.
- `warnings` (soft): `LICENSE_EXPIRED_SOON`/`LICENSE_EXPIRED`,
  `REGISTRATION_EXPIRING`/`REGISTRATION_EXPIRED`, `INSURANCE_EXPIRING`/`INSURANCE_EXPIRED`
  (expiry falls inside the evaluated window), `NO_PASSENGER_COUNT_PROVIDED`.

## 11. Endpoints

Read-only evaluation (no side effects):

- `GET /api/fleet-availability/drivers/:id?startAt&endAt&passengers` — `transportation_requests.assign`
- `GET /api/fleet-availability/cars/:id?startAt&endAt&passengers` — `transportation_requests.assign`

Audited CRUD (explicit user actions only):

- `GET/POST /api/driver-duty-schedules`, `GET/PATCH/DELETE /api/driver-duty-schedules/:id`
  — `driver.view` / `driver.edit`; list supports `driverId`, `from`, `to`, `status`,
  pagination.
- `GET/POST /api/vehicle-availability-blocks`, `GET/PATCH/DELETE /api/vehicle-availability-blocks/:id`
  — `car.view` / `car.edit`; list supports `vehicleId`, `from`, `to`, `reason`,
  pagination.

All guarded by `PermissionsGuard`, query/body validated by class-validator, ranges
normalized; DELETE requires explicit intent (record must exist, 404 otherwise).

## 12. Concurrency & Data Integrity

- One-schedule-per-driver-per-date enforced at the **DB unique constraint** level, not
  just read-then-write (overlap is also rejected at the application layer with a clear
  message; the unique constraint is the backstop).
- Block `end_at > start_at` enforced at the **DB check constraint** level.
- Write paths are single-record with immediate `save`; no multi-statement transactions
  needed in R2 (the two new entities are created/updated independently).
- Availability evaluation is read-only and lock-free; overlapping-block detection is a
  simple range query + `intervalsOverlap` in memory.
- Deferred to R4 (documented): assignment-time concurrency (no `fleet_assignments` to
  lock), schedule conflicts across concurrent create in flight (DB constraint covers),
  recurring-schedule expansion races.

## 13. Frontend

- `src/modules/scheduling/` — new module:
  - `pages/DutySchedulePage.tsx`: table columns DATE / DAY / DRIVER / SHIFT START /
    SHIFT END / HOURS / DUTY STATUS / NOTES / ACTIONS; filters (date from/to, driver,
    status); create/edit modal + delete with confirm; **overnight shifts render
    `20:00 → 04:00 (+1d)`** with a hover explanation; hours computed cross-midnight.
    Gated `driver.view`, writes gated `driver.edit`.
  - `pages/VehicleAvailabilityPage.tsx`: table VEHICLE / BLOCK START / BLOCK END /
    REASON / NOTES / ACTIONS; filters (vehicle, reason, datetime from/to); create/edit
    modal + delete; reason badges. Gated `car.view`, writes gated `car.edit`.
  - `api/scheduling.api.ts`, `types/scheduling.types.ts`, `utils/shiftTime.ts` (local
    mirror of the backend shift contract for display).
- Routes: `/fleet/duty-schedules`, `/fleet/vehicle-availability` registered in
  `src/app/router.tsx` under `PermissionGate`.
- Sidebar: **Fleet Management → Duty Schedule / Vehicle Availability** plus dashboard
  quick links (permission-gated like all existing links).
- Uses the existing BSA design system only (`shared/components`: Button, Input, Select,
  Textarea, DateInput, Badge, Alert, LoadingState, EmptyState, Pagination,
  ActionIconButton, AppModal, table-shell/table-scroll). No Lark clone, no new CSS
  framework, no new date library (display math re-implemented, no `dayjs` needed).
- No new permission keys were invented — existing `driver.*` / `car.*` /
  `transportation_requests.assign` cover everything.

## 14. Calendar & Maps Compatibility

- **Calendar** (`/transportation-requests/calendar`): untouched; it reads
  `scheduledPickupAt`/`expectedReturnAt` exactly as before. Duty schedules are not yet
  rendered in the calendar (future-compatible — nothing in R2 changes calendar input
  shape or data).
- **Maps** (Leaflet/MapLibre + OSRM, `BsaMapPage`, `maps/` module): no file changed.
  R2 adds no new map calls, no coordinate writes, no routing changes. The lodge-request
  flow keeps its map search/pickup/dropoff/coordinates untouched (R2 explicitly does
  not add end-time inputs to the form).

## 15. Tests

- `scheduling` backend suites (6 files, 71 tests) — full pass:
  - `shift-time.spec.ts`, `interval.spec.ts` (model + primitives, §7–8).
  - `driver-duty-schedule.service.spec.ts`, `vehicle-availability-block.service.spec.ts`
    (CRUD validation, conflict/duplicate, not-found, audit, overnight).
  - `fleet-availability.service.spec.ts` — driver matrix (missing/inactive/auto-assign/
    license/shift coverage/status) and vehicle matrix (missing/status/auto-assign/
    capacity/block/coding-day/expiry warnings), including overnight + PH-offset cases.
- Full backend suite: **104 tests / 14 suites pass**; frontend vitest: **27 tests / 3
  files pass**.

## 16. Verification

- Backend `nest build` clean; backend lint: `src/modules/scheduling` **0 violations**
  (repo-wide baseline of pre-existing violations in untouched files is unchanged).
- Frontend `tsc -b && vite build` clean (one real type fix during dev), lint: new files
  carry only the same `exhaustive-deps` warning pattern as existing pages.
- Migration applied + verified on the dev DB (tables, constraints, indexes, column).
- Live smoke test on the running dev stack (real driver id): create overnight
  schedule → 200; duplicate same-date schedule → 400 with clear message; invalid
  `HH:mm` → 400 field errors; availability check inside overnight shift →
  `available: true`; outside shift → `NO_DUTY_SCHEDULE`; vehicle/block checks on
  missing ids → correct typed responses. Smoke row cleaned up afterward.

## 17. Database Safety

- Tables dropped: **0**
- Columns dropped: **0**
- Rows deleted: **0**
- `synchronize` used: **NO** (migration path; dev `synchronize` only creates the
  new entities/column idempotently — guarded by `IF NOT EXISTS` / `IF EXISTS` checks)
- Production applies `R2SchedulingAvailability` via `migration:run`, additive only.

## 18. Out of Scope (deferred to R4)

- `fleet_assignments` and all assignment logic (R3 scope — availability eval from R2 is
  its read-only precondition).
- Recurring / full-day (24h) schedules; schedule auto-generation; calendar rendering of
  duty schedules; block auto-creation from maintenance workflows.
- Travel-time scoring, ETA, Maps integration into availability.
- Metro Manila holiday-aware coding-day windows; coding-day "number" scheme
  (R4 decision point — rule stays a simple weekday match in R2).
- Request-form end-time capture (backend window derivation exists; UI capture can
  follow in a later iteration if the client asks).

## 19. R3 Readiness

**Recommendation: GO WITH CONDITIONS.**

Readiness rationale:

- R3's assignment engine will need exactly what R2 built: canonical service windows,
  an overlap primitive, duty/block temporal data, and read-only availability
  evaluation with typed reasons — all present, tested (104 backend + 27 frontend),
  migrated additively, and smoke-verified live.
- No R2 feature blocks assignment; nothing R3 needs is missing at the schema level.

Conditions before R3 starts:

1. **Confirm R3's "assignment diagnostic" requirement.** R2 deliberately did not add a
   request-based driver-conflict diagnostic (would require touching assignment storage,
   which the phase forbids). R3 must either accept `transportation_request`-derived
   diagnostics as a separate additive read or explicitly own that design.
2. **Scope R3's assignment rules against the R2 result model.** The `reasons`/`warnings`
   codes are stable and intended to be consumed by R3 scoring; any new code should be
   added to `fleet-availability.service` rather than forked.
3. **Do not ship `synchronize` to production.** Confirm the R3 migration strategy
   continues `migration:run` (dev-only `synchronize` remains an accepted risk today).
4. **Baseline lint debt is pre-existing** (217 errors in untouched modules, e.g.
   `car.controller.ts`, `LoginPage.tsx`). Not caused by R2; fix or formally ignore
   before R4, but not blocking R3.

With those conditions met, R3 can start. Do NOT begin R3 until the client confirms the
above.
