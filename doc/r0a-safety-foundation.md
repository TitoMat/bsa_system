# BSA Fleet Refactor — R0A Safety Foundation

> Date: 2026-08-11
> Phase: R0A — safety/foundation only. No new fleet features implemented.

---

## 1. Repository State

- **Git:** NOT a git repository. There is no `.git` directory in
  `/Users/matorlino/Projects/bsa_system` (or any parent). This corrects the
  earlier audit's assumption that secrets were "committed".
- **Branch:** n/a (no repo).
- **Working tree:** dirty by definition (no VCS). All changes are listed in
  §11.
- **Architecture discovered:**
  - Backend: NestJS 11 + TypeORM 0.3 + PostgreSQL + Redis; modules under
    `backend/src/` (auth, users, audit, permissions, catalog/cars,
    catalog/drivers, maps, transportation).
  - Frontend: React 19 + Vite 8 + React Router 7 + TanStack Query + Zustand +
    Tailwind; Maps module uses **Leaflet + MapLibre GL** (no OpenLayers
    anywhere in the project).
  - Canonical TypeORM config lives in `backend/src/database/data-source.ts`
    (also drives `main.ts` dev-migration bootstrap); `app.module.ts` had a
    second inline config.

## 2. Audit Findings Verified

| # | Finding | Status |
|---|---------|--------|
| 1 | `synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true'` in `app.module.ts` | **CONFIRMED** — removed, replaced with canonical shared config |
| 2 | No migration files despite startup referencing migrations | **CONFIRMED** — no `migrations/` dir existed; foundation added |
| 3 | Duplicate `RolePermission` entity (two files, same table) | **CONFIRMED** — orphan deleted, canonical kept |
| 4 | `Object.assign(request, dto)` in `transportation.service.ts` | **CONFIRMED** — replaced with explicit whitelist assignment |
| 5 | Secrets in `.env.dev` / `.env.local` | **PARTIALLY CONFIRMED** — real secret values exist on disk with mode `0700`, but **not actually committed** (no git repo). `.gitignore` was explicitly un-ignoring them; fixed |
| 6 | Internal API key env mismatch `MOSV2_INTERNAL_API_KEY` vs `BSA_INTERNAL_API_KEY` | **CONFIRMED** — `docker-compose.yml` passed `MOSV2_...`, backend reads `BSA_...`; normalized to `BSA_INTERNAL_API_KEY` |
| 7 | Frontend/backend permission array semantics differ | **CONFIRMED, DOCUMENTED, NOT CHANGED** — see §6.1 |

## 3. Changes Made

| File | Change | Reason |
|------|--------|--------|
| `backend/src/database/data-source.ts` | Added `resolveSynchronize()` policy (production always `false`), `migrations` glob `migrations/*.{ts,js}`; canonical config now includes migrations + sync policy | Single source of truth for runtime, CLI, and generation |
| `backend/src/app.module.ts` | Replaced inline TypeORM factory with `dataSourceOptions` import | Eliminate two incompatible TypeORM configs; remove raw `process.env.TYPEORM_SYNCHRONIZE` escape |
| `backend/src/database/migrations/1786492800000-R0ABaseline.ts` | New empty baseline migration (no DDL) | Safe adoption marker for existing DBs; no drops/deletes |
| `backend/package.json` | Added `migration:show / run / revert / generate / create` scripts | Standard migration workflow via `typeorm-ts-node-commonjs` |
| `backend/src/permissions/role-permission.entity.ts` | Deleted orphan duplicate | Prevent duplicate entity registration; canonical file `entities/role-permission.entity.ts` is the only one imported |
| `backend/src/modules/transportation/transportation.service.ts` | Replaced `Object.assign` with `applyMutableFields()` whitelist | Protected fields (`id`, `requestNumber`, `status`, `requestedByUserId`, timestamps, relations) can never be written via update DTO |
| `backend/src/modules/transportation/transportation.service.spec.ts` | New: 4 tests proving protected-field immutability, partial update, date conversion, constraint validation | Regression safety for the update path |
| `docker-compose.yml` | `MOSV2_INTERNAL_API_KEY` → `BSA_INTERNAL_API_KEY` (env + usage comment) | Fix broken internal-key guard in production compose |
| `.gitignore` | `.env*` fully ignored; only `!.env.example` whitelisted | Stop potential future secret tracking |
| `backend/.env.example` | New placeholder template (backend vars incl. `BSA_INTERNAL_API_KEY`) | Safe onboarding template; no real values |
| `.npmrc` | Removed developer-specific `prefix=/home/gray/.npm-global` (replaced with comment) | Blocked **all** npm/npx commands on this host (pre-existing, blocked required work) |
| `README.md` | Added Database Migrations section + updated env-template instructions | Document safe adoption path |

## 4. Migration Foundation

- **Canonical DataSource:** `backend/src/database/data-source.ts` — used by
  NestJS runtime (`app.module.ts`), `main.ts` dev bootstrap, and all migration
  CLI commands.
- **Migrations directory:** `backend/src/database/migrations/` (compiled to
  `dist/database/migrations/`; glob `*.{ts,js}` resolves correctly in both
  modes — verified in compiled output).
- **synchronize behavior:** `resolveSynchronize()` returns `false` whenever
  `NODE_ENV=production`, **even if** `TYPEORM_SYNCHRONIZE=true` leaks in.
  Outside production it is honored only as a temporary dev bootstrap until a
  real DDL baseline exists (documented for removal in R1).
- **Commands** (run in `backend/`):
  - `npm run migration:show`
  - `npm run migration:run`
  - `npm run migration:revert`
  - `npm run migration:generate` (diff entities vs DB → new file)
  - `npm run migration:create`
- **Safe adoption strategy for an existing database (verified live):**
  1. Run `npm run migration:run` once — the empty baseline performs **no DDL**
     and simply records itself in the `migrations` table. Verified on the live
     dev DB: baseline row `id=1` recorded, all 14 entity tables untouched.
  2. Afterwards, `npm run migration:generate` produces only forward
     (additive) drift against the live schema. Every generated migration must
     be operator-reviewed before running.
  3. Fresh DBs: bootstrap with dev `TYPEORM_SYNCHRONIZE=true` then
     `migration:run`, or generate the initial DDL migration directly.
- **Validated on live dev DB (port 5436):** `migration:show` → baseline
  recorded (`[X] 1 R0ABaseline1786492800000` = executed marker); `migration:run`
  → "No migrations are pending"; migrations table created; zero tables
  dropped; zero rows deleted.

## 5. Transportation Safety

`update()` in `backend/src/modules/transportation/transportation.service.ts`
now routes all DTO input through `applyMutableFields()` — an explicit
whitelist of the 25 mutable fields (request details, addresses, coordinates,
times, route metadata).

Protected fields are structurally excluded and can never be written through the
update DTO: `id`, `requestNumber`, `status`, `requestedByUserId`,
`submittedAt`, `approvedAt`, `cancelledAt`, `completedAt`, `cancellationReason`,
`completionRemarks`, `createdAt`, `updatedAt`, and all relations
(`stops`, `passengers`, `assignments`, `statusHistories`, `tripEvents`).

Additional hardening: omitted fields (`undefined`) no longer overwrite existing
values; date strings are explicitly converted to `Date`. Four new unit tests
prove: (1) protected/system fields cannot be overwritten even if injected into
the DTO, (2) only provided mutable fields are applied, (3) date conversion,
(4) existing constraint validation still runs.

## 6. Environment / Secrets

### 6.1 Permission semantics (audit finding 7) — DOCUMENTED, NOT CHANGED

- Frontend `hasPermission()` (`frontend/src/lib/permissions.ts:8-12`) uses
  `.some()` (OR) for arrays.
- Backend `PermissionsGuard` (`backend/src/permissions/permissions.guard.ts:55-61`)
  uses `.every()` (AND) for `@Permissions(...)` plus `.some()` for
  `@PermissionsAny(...)`.
- Intended behavior could not be proven from existing code/tests (no test
  covers array semantics). Per phase rules this is left as a **follow-up
  decision for R1** — do not ship conflicting UI/guard semantics silently.

### 6.2 Variable naming

- Canonical name: **`BSA_INTERNAL_API_KEY`** (backend guard
  `internal-api-key.guard.ts` + `main.ts` production validation).
- `docker-compose.yml` now passes `BSA_INTERNAL_API_KEY`. No temporary alias
  was added (single canonical name forward). Deployments that previously set
  `MOSV2_INTERNAL_API_KEY` must be updated (see §10).
- No real secret values were printed, logged, or included in this report.

### 6.3 Tracking

- **Fixed:** `.gitignore` now ignores all `.env*` except `.env.example`.
- `backend/.env.example` placeholder template created.
- Note: the repository has no git history, so no commits contain the secrets;
  however the files were previously un-ignored by `.gitignore`, so rotation is
  still prudent (see §10).

## 7. Maps Preservation

No Maps files were touched (backend or frontend). Frontend Maps uses
**Leaflet + MapLibre GL**; OpenLayers was never part of this codebase.

| Contract | Status |
|----------|--------|
| OpenLayers preserved | **N/A** — never present (Leaflet + MapLibre used); nothing removed/replaced |
| Location search preserved | **YES** — `/api/maps/search` + `useLocationSearch` untouched |
| Reverse geocoding preserved | **YES** — `/api/maps/reverse` + `reverseGeocode` untouched |
| Route calculation preserved | **YES** — `/api/maps/route` + OSRM/Valhalla fallback untouched |
| POI search preserved | **YES** — `/api/maps/poi` untouched |
| Existing map routes preserved | **YES** — `/maps` route + `PermissionGate("maps.view")` intact |
| Existing frontend Maps flow preserved | **YES** — no frontend files modified |

## 8. Validation Results

| Check | Command | Result |
|-------|---------|--------|
| Backend build | `npm run build` (backend) | **PASS** |
| Backend tests | `npm test` (backend) | **PASS** — 6 suites, 23 tests (19 baseline + 4 new) |
| Frontend build | `npm run build` (frontend) | **PASS** (pre-existing chunk-size warning) |
| Frontend tests | `npm test` (frontend) | **PASS** — 3 files, 27 tests (incl. Maps `RouteSummary`) |
| Frontend lint | `npm run lint` (frontend) | **FAIL — pre-existing** 25 errors / 9 warnings (identical to baseline) |
| Migration validation | `npm run migration:show` / `migration:run` vs live dev DB | **PASS** — baseline recorded, nothing pending |
| Sync policy | node check on compiled `resolveSynchronize` | **PASS** — production forced `false`; dev opt-in only |
| Maps regression | backend maps specs + frontend RouteSummary test | **PASS** — all green; API surface grep unchanged |
| Destructive migration | inspected baseline + DB table count | **NONE** — no DDL, 14 tables + migrations table only |

## 9. Existing Failures Not Caused by This Phase

1. **Frontend lint:** 25 errors / 9 warnings (pre-existing; includes
   `no-explicit-any`, `set-state-in-effect`, missing hook deps). Baseline
   count identical after changes.
2. **Frontend bundle:** 1.8 MB single chunk warning from Vite (pre-existing).
3. **Backend env loading quirk:** `data-source.ts` loads env files relative to
   `process.cwd()` — running npm scripts from `backend/` does not pick up the
   root `.env.local` (dev DB reachable only via Docker compose or explicit
   env). Pre-existing; not changed this phase.
4. **Stale local env:** root `.env.local` points to `localhost:5432` while the
   running dev Postgres is on `5436` (Docker mapping). Pre-existing.
5. **Backend lint** was not run in the baseline and is not part of this
   phase's scope (script includes `--fix`).

## 10. Manual Actions Required

- [ ] **Rotate secrets** (operator): `DATABASE_PASSWORD`, `POSTGRES_PASSWORD`,
      `JWT_SECRET`, `SUPERADMIN_PASSWORD` from `.env.dev` / `.env.local` may
      have been exposed via the previously un-ignored files. Values are not
      listed here by design. Generate new values and update all environments.
- [ ] **Update production env**: any deployment currently setting
      `MOSV2_INTERNAL_API_KEY` must switch to `BSA_INTERNAL_API_KEY` (the
      compose file now requires it).
- [ ] **Production DB adoption**: back up the production database, then run
      `npm run migration:run` (records the empty baseline). Do not run
      `migration:generate` output without review.
- [ ] (Optional) `npm run migration:revert` was intentionally NOT executed —
      the baseline is the adoption marker.

## 11. Files Changed

```
.npmrc
.gitignore
README.md
docker-compose.yml
backend/.env.example                                    (new)
backend/package.json
backend/src/app.module.ts
backend/src/database/data-source.ts
backend/src/database/migrations/1786492800000-R0ABaseline.ts   (new)
backend/src/permissions/role-permission.entity.ts        (deleted)
backend/src/modules/transportation/transportation.service.ts
backend/src/modules/transportation/transportation.service.spec.ts  (new)
doc/r0a-safety-foundation.md                            (this report)
```

## 12. GO / NO-GO for R1

**GO — conditional.**

- [x] Schema changes are migration-controlled (canonical DataSource + CLI + baseline).
- [x] No destructive migration occurred (verified against live dev DB; DDL-free baseline).
- [x] Backend builds and all 23 tests pass.
- [x] Existing Transportation still works (update path behavior preserved, protected-field tests green).
- [x] Existing Maps remains functional (no Maps files touched; Maps tests green).

Conditions to clear before starting R1:
1. Operator completes §10 (secret rotation + prod DB backup/adoption).
2. Frontend lint debt (25 errors) should be triaged in R1 as a follow-up.
3. Permission array semantics decision (OR vs AND) documented in R1 design.

R1 will NOT begin automatically.
