# BSA Fleet Refactor — R1 Driver/Vehicle Domain Normalization

> Date: 2026-08-12
> Phase: R1 — fleet scheduler preparation. Adds the domain flags the trip
> scheduler will later read; no scheduler logic implemented yet (R2+).

---

## 1. Goal

Give the fleet scheduler the per-driver / per-vehicle attributes it needs to
answer "who is eligible for this request" without guessing:

- **assignment_pool** — GENERAL / EXECUTIVE / SPECIAL (how the unit is
  classified; GENERAL is always the safe default).
- **auto_assign_enabled** — opt-in flag; default true, but each unit can be
  excluded from auto-assignment individually.
- **allow_general_use_when_executive_away** — EXECUTIVE-pool opt-out: when
  false, an executive-dedicated unit is NEVER lent to general requests, even
  if the executive is away.
- **coding_day** (cars) — MMDA-style weekday restriction; scheduler must skip
  a car on its coding day.
- **license_expiry** (drivers) — enables expiry-aware validation (expired →
  not eligible) instead of hardcoded `'N/A'`.
- **vehicle_status / seating_capacity / registration_expiry / insurance_expiry**
  (cars) — already existed in the entity but were never exposed (create
  hardcoded `5` and `OPERATIONAL`; update could not change them). Now fully
  writable.

GPS fields (`current_latitude` / `current_longitude`) remain **system-owned**:
present in the entity, never writable through DTOs.

## 2. Canonical Domain Layer (new)

`backend/src/modules/catalog/fleet-domain.ts`

- `FleetAssignmentPool` / `CodingDay` types + `DRIVER_DUTY_STATUSES` /
  `VEHICLE_STATUSES` literals.
- Canonical defaults, imported everywhere (entities, DTOs, services):
  `DEFAULT_ASSIGNMENT_POOL = 'GENERAL'`, `DEFAULT_CODING_DAY = 'NONE'`,
  `DEFAULT_AUTO_ASSIGN_ENABLED = true`,
  `DEFAULT_ALLOW_GENERAL_USE_WHEN_EXECUTIVE_AWAY = false`.

## 3. Entity Changes (schema-compatible)

| Entity | Added column | Type | Default |
|--------|-------------|------|---------|
| drivers | `assignment_pool` | varchar(20) | `'GENERAL'` |
| drivers | `auto_assign_enabled` | boolean | `true` |
| drivers | `allow_general_use_when_executive_away` | boolean | `false` |
| cars | `coding_day` | varchar(10) | `'NONE'` |
| cars | `assignment_pool` | varchar(20) | `'GENERAL'` |
| cars | `auto_assign_enabled` | boolean | `true` |
| cars | `allow_general_use_when_executive_away` | boolean | `false` |

All NOT NULL with backfill-safe defaults — existing rows become GENERAL /
auto-assignable, never something exotic. No column drops, no renames, no row
deletes.

## 4. DTO Rewrites

**`CreateDriverDto` / `UpdateDriverDto`** — dropped made-up fields
(`nationalId`, `birthDate`, `preferredShift`) the entities don't have; added
real fields: `dutyStatus` (update), `licenseExpiry`, `assignmentPool`,
`autoAssignEnabled`, `allowGeneralUseWhenExecutiveAway`. GPS fields are
absent from both DTOs (system-owned, accessor-only).

**`CreateCarDto` / `UpdateCarDto`** — added the R1 fields plus the
pre-existing-but-unexposed entity columns (`seatingCapacity`,
`vehicleStatus`, `registrationExpiry`, `insuranceExpiry`). `photoUrl` stays
out of both DTOs — it is managed exclusively through the multipart photo
field.

## 5. Service Rewrites (safe-update pattern, R0A style)

- `DriverService.create` — explicit field mapping + canonical defaults
  (`dutyStatus` always forced to `OFF_DUTY` on create).
- `DriverService.update` — `Object.assign(driver, payload)` removed; a
  **whitelist** of 10 mutable fields is applied in a loop; anything else in
  the payload is silently ignored.
- `CarService.create` — explicit mapping; replaces the old
  `car.seatingCapacity = 5; car.vehicleStatus = 'OPERATIONAL';` hardcodes;
  new fields default to canonical values.
- `CarService.update` — `Object.assign(car, payload)` removed; whitelist of
  15 mutable fields; `photoUrl`/`id`/timestamps can never be written via
  JSON.
- Both services keep full audit logging (CREATE_/UPDATE_DRIVER / CAR).

## 6. Migration (real, additive)

`backend/src/database/migrations/1786543200000-R1FleetAssignmentFields.ts`

- Pure `ADD COLUMN IF NOT EXISTS` — safe on dev DBs where the dev-only
  synchronize bootstrap already created the columns (verified idempotent).
- Down migration drops only the R1-added columns.
- Applied to the dev database (auto-ran by the dev backend bootstrap on
  hot-reload; confirmed present in `information_schema` with the canonical
  defaults).

## 7. Frontend

- Types (`driver.types.ts`, `car.types.ts`): full `BackendDriver` /
  `BackendCar` mirrors + `DriverItem` / `CarItem` UI shapes + payload types +
  `mapBackend*` functions; shared constants (`FLEET_ASSIGNMENT_POOLS`,
  `DRIVER_DUTY_STATUSES`, `VEHICLE_STATUSES`, `CODING_DAYS`).
- `CreateDriverModal` / `EditDriverModal`: license expiry, duty status
  (edit), assignment pool, auto-assign toggle, executive-away toggle
  (shown only for EXECUTIVE pool).
- `CreateCarModal` (create + edit): seating capacity, vehicle status,
  registration/insurance expiry, coding day, assignment pool, auto-assign
  toggle, executive-away toggle.
- `DriverPage`: new columns — Duty Status, License Expiry, Pool; actions
  gained an auto-assign on/off toggle.
- `CarTable`: new columns — Vehicle Status, Coding Day, Pool. `CarCard`:
  pool badge (+ vehicle-status / coding-day badges when non-default).
- All three modals migrated from the reset-in-`useEffect` pattern to the
  React-documented render-phase adjustment pattern (fixes the
  `react-hooks/set-state-in-effect` lint errors).

## 8. Tests

`driver.service.spec.ts` (new) — 5 tests:
- create applies canonical defaults; honors explicit values.
- update applies whitelist; **never writes** GPS/id/createdAt; throws
  `NotFoundException` for missing driver.

`car.service.spec.ts` (new) — 5 tests:
- create uses payload values (seatingCapacity 7, MAINTENANCE, WEDNESDAY,
  SPECIAL, expiries) instead of hardcoded 5/OPERATIONAL;
- update whitelist; **never writes** photoUrl/id/createdAt; throws
  `NotFoundException` for missing car.

Full backend suite: **8 suites / 33 tests pass**. Frontend: **3 files /
27 tests pass**.

## 9. Verification

| Check | Result |
|-------|--------|
| Backend `nest build` | pass |
| Backend tests (`npm test`) | 33/33 pass |
| Migration on dev DB (`127.0.0.1:5436`) | applied; columns + defaults confirmed in `information_schema` |
| Frontend `tsc --noEmit` | pass |
| Frontend `vite build` | pass |
| Frontend tests (`npm test`) | 27/27 pass |
| Frontend lint (`eslint src/modules/catalog`) | 0 errors (2 pre-existing warnings) |
| Maps regression | engine tests pass; live external calls fail only because the sandbox blocks outbound (pre-existing) |

## 10. Out of Scope (next phases)

- R2: request-scoring + travel-time ingestion (why `current_latitude` /
  `current_longitude` exist but are unwritable today).
- R3: dispatch/assignment engine consuming `assignment_pool`,
  `auto_assign_enabled`, `allow_general_use_when_executive_away` (away
  logic + coding-day skip + expiry checks).
- `license_expiry` warning banner in the UI when near expiry (once expiry
  validation ships).