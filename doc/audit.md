# BSA System — Full System Audit

> **Date:** 2026-08-11  
> **Scope:** Backend, Frontend, Infrastructure, Cross-Cutting Concerns  
> **Total Findings:** 100+ issues across 4 severity levels

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [CRITICAL Issues](#critical-issues)
3. [HIGH Priority Issues](#high-priority-issues)
4. [MEDIUM Priority Issues](#medium-priority-issues)
5. [LOW Priority Issues](#low-priority-issues)
6. [Summary by Category](#summary-by-category)

---

## Executive Summary

The BSA system is a well-structured full-stack NestJS + React application with a comprehensive RBAC permission system and a sophisticated 22-state transportation workflow. The codebase demonstrates solid architectural decisions (modular NestJS, feature-based frontend, TanStack Query + Zustand, Docker multi-stage builds).

However, the audit identified **12 critical** issues spanning security vulnerabilities, data integrity risks, and environment misconfigurations. The most urgent concerns are:

1. **Secrets committed to version control** (database passwords, JWT secrets, superadmin credentials)
2. **Environment variable name mismatch** between Docker compose and application code, breaking the internal API key guard
3. **Missing migrations** with `synchronize` enabled, risking production data loss
4. **JWT tokens in localStorage** — vulnerable to XSS exfiltration
5. **Unprotected endpoints** (avatar, car photo) allowing unauthenticated enumeration

**Priority action:** Rotate all committed secrets, fix the env-var mismatch, implement proper TypeORM migrations, and secure the exposed endpoints.

---

## CRITICAL Issues

### C001 — Secrets committed to version control (Infrastructure)

| File | Line | Severity |
|------|------|----------|
| `.env.dev` | 9, 12, 18, 22 | CRITICAL |
| `.env.local` | 9, 11, 15-16 | CRITICAL |

`.gitignore:14-16` explicitly un-ignores `.env.dev` and `.env.local`, which contain live credentials:

- `DATABASE_PASSWORD=lRPlZnvDJoSsnPmWwLht`
- `POSTGRES_PASSWORD=lRPlZnvDJoSsnPmWwLht`
- `JWT_SECRET=b2086119219c6e2d32bc27e25c840feba9170566b48da85091da99e9da7f9e6f`
- `SUPERADMIN_PASSWORD=wHkzQn8OxLyF`

**Fix:** Immediately rotate all secrets. Remove `.env.dev` and `.env.local` from `.gitignore` exceptions. Use `.env.example` templates only. Add `.env*` to `.gitignore`.

---

### C002 — Env-var name mismatch breaks internal API key guard (Infrastructure)

| File | Line | Severity |
|------|------|----------|
| `docker-compose.yml` | 53 | CRITICAL |
| `backend/src/common/guards/internal-api-key.guard.ts` | 13 | CRITICAL |
| `backend/src/main.ts` | 131 | CRITICAL |

Docker passes `MOSV2_INTERNAL_API_KEY` but the application reads `BSA_INTERNAL_API_KEY`. The internal API key guard will **never** receive the configured key and will always throw `"Internal API key is not configured"` in production.

**Fix:** Align the env-var name across docker-compose.yml and the backend code. Choose one name (`BSA_INTERNAL_API_KEY` or `MOSV2_INTERNAL_API_KEY`) and use it consistently.

---

### C003 — TypeORM `synchronize` enabled, no migrations exist (Backend)

| File | Line | Severity |
|------|------|----------|
| `backend/src/app.module.ts` | 34 | CRITICAL |

`TypeOrmModule.forRoot({ synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true' })` — if this env var is accidentally `true` in production, TypeORM will auto-drop/recreate tables, causing catastrophic data loss. Zero migration files exist in the codebase, yet `main.ts:23-29` calls `dataSource.showMigrations()` and `dataSource.runMigrations()`.

**Fix:** Remove `synchronize` option entirely. Generate an initial migration from the current schema. Create a `src/database/migrations/` directory and commit migrations. Use `migrationsRun: true` in production.

---

### C004 — JWT_SECRET not validated on bootstrap in non-production (Backend)

| File | Line | Severity |
|------|------|----------|
| `backend/src/main.ts` | 126-139 | CRITICAL |

Production env vars are only validated when `NODE_ENV === 'production'`. If `NODE_ENV` is misconfigured or the app runs in staging with a typo, it starts without JWT_SECRET or DATABASE_PASSWORD.

**Fix:** Always validate `JWT_SECRET` and `DATABASE_PASSWORD` regardless of `NODE_ENV`. Only make production-specific checks conditional.

---

### C005 — `getAvatar` endpoint has no authentication (Backend)

| File | Line | Severity |
|------|------|----------|
| `backend/src/auth/auth.controller.ts` | 165-185 | CRITICAL |

`GET /api/auth/avatar/:userId` has no `@UseGuards(JwtAuthGuard)`. Any unauthenticated client can enumerate user avatars by guessing user IDs.

**Fix:** Add `@UseGuards(JwtAuthGuard)` to the endpoint or validate the requesting user has permission to view the avatar.

---

### C006 — `getPhoto` endpoint has no authentication (Backend)

| File | Line | Severity |
|------|------|----------|
| `backend/src/modules/catalog/cars/car.controller.ts` | 94-104 | CRITICAL |

`GET /api/cars/:id/photo` has no `@Permissions` decorator and no `JwtAuthGuard`, unlike every other endpoint in the controller. Any unauthenticated client can enumerate car photos.

**Fix:** Add `@UseGuards(JwtAuthGuard)` or `@Permissions(...)` to the endpoint.

---

### C007 — Duplicate `RolePermission` entity file causes TypeORM conflict (Cross-Cutting)

| File | Severity |
|------|----------|
| `backend/src/permissions/role-permission.entity.ts` | CRITICAL |

A duplicate `RolePermission` entity with the same table name `role_permissions` exists alongside `backend/src/permissions/entities/role-permission.entity.ts`. The orphan file is never imported but TypeORM's glob entity resolution may pick it up, causing a duplicate entity registration crash at startup.

**Fix:** Delete `backend/src/permissions/role-permission.entity.ts`.

---

### C008 — `useState` misused as `useEffect` — memory leak (Frontend)

| File | Line | Severity |
|------|------|----------|
| `frontend/src/components/layout/Topbar.tsx` | 42-64 | CRITICAL |

`useState(() => { ... })` is used where `useEffect(() => { ... })` should be. React's `useState` initializer runs once and its return value becomes state — it never runs cleanup. Event listeners registered here are **never removed**, causing memory leaks on each remount.

**Fix:** Replace `useState` with `useEffect` so the cleanup callback properly removes event listeners.

---

### C009 — JWT token stored in localStorage via Zustand persist (Frontend)

| File | Line | Severity |
|------|------|----------|
| `frontend/src/features/auth/useAuthStore.ts` | 110-122 | CRITICAL |

The auth store persists `{ user, token, isAuthenticated }` to localStorage in plaintext via Zustand `persist` middleware. Any XSS vulnerability (in the app or any dependency) can exfiltrate the JWT token.

**Fix:** Use httpOnly cookies set by the backend for token storage. Remove the token from Zustand persist state.

---

### C010 — `AuthBootstrap` has unsafe `return` in `finally` block (Frontend)

| File | Line | Severity |
|------|------|----------|
| `frontend/src/app/AuthBootstrap.tsx` | 41-44 | CRITICAL |

The `finally` block has `if (!mounted) return;` which skips `setReady(true)` AND the splash removal. If the component unmounts between the `try` and `finally`, `hasBootstrappedRef.current` is set to `true` but the splash screen is never removed.

**Fix:** Move `hasBootstrappedRef.current = true` inside the `!mounted` check, or use `setReady(true)` before checking `mounted`.

---

### C011 — Missing overlay compose files referenced in production config (Infrastructure)

| File | Line | Severity |
|------|------|----------|
| `docker-compose.yml` | 10-11, 17-18 | CRITICAL |

`docker-compose.yml` references overlay files `docker-compose.production.yml` and `docker-compose.tailscale.yml` that do not exist in the repository. Production deployment cannot work as documented.

**Fix:** Create the missing overlay files or remove the references.

---

### C012 — Frontend `hasPermission` OR semantics vs backend `PermissionsGuard` AND semantics (Cross-Cutting)

| File | Line | Severity |
|------|------|----------|
| `frontend/src/lib/permissions.ts` | 8-12 | CRITICAL |
| `backend/src/permissions/permissions.guard.ts` | 55-56 | CRITICAL |

The frontend `hasPermission()` for array input uses `.some()` (at least ONE permission grants access). The backend `PermissionsGuard` uses `.every()` (ALL permissions required). This mismatch causes users to see UI elements they cannot actually use, leading to frustrating 403 errors.

**Fix:** Align semantics. Choose either OR or AND and apply consistently on both sides. Document the chosen approach clearly.

---

## HIGH Priority Issues

### H001 — JWT not invalidated on password change (Backend)

| File | Line |
|------|------|
| `backend/src/auth/auth.service.ts` | 275-318 |
| `backend/src/users/users.service.ts` | 295-334 |

When a password is changed or reset, existing valid JWTs remain usable until they expire. An attacker who obtained a token before the password change retains access. The blocklist only handles explicit logout.

**Fix:** Blocklist the current token on password change, or use a per-user token version counter.

---

### H002 — Rate limit guards fail open on Redis outage in production (Backend)

| File | Line |
|------|------|
| `backend/src/auth/guards/login-rate-limit.guard.ts` | 16-21 |
| `backend/src/modules/maps/guards/maps-rate-limit.guard.ts` | 17-22 |

`isRateLimitFailClosed` defaults to `false` in non-production. If Redis is down in production with default settings, all rate limiting is silently skipped. No critical alert is emitted.

**Fix:** Default `RATE_LIMIT_FAIL_CLOSED` to `true` or emit a critical alert when Redis is unavailable.

---

### H003 — `Object.assign` for partial updates bypasses DTO validation (Backend)

| File | Line |
|------|------|
| `backend/src/modules/transportation/transportation.service.ts` | 255 |

`Object.assign(request, dto)` copies all DTO properties onto the entity, including `undefined` values that overwrite existing data, and potentially malicious extra properties that could overwrite `status`, `requestedByUserId`, etc.

**Fix:** Use selective property assignment or `whitelist` filtering like `UsersService.update()`.

---

### H004 — Auto-assignment doesn't check driver/vehicle schedule conflicts (Backend)

| File | Line |
|------|------|
| `backend/src/modules/transportation/transportation.service.ts` | 452-493 |

`autoAssignAvailable` picks a random available driver and vehicle but does not check temporal overlap with the request's scheduled time. Two requests could be assigned to the same driver during overlapping time windows.

**Fix:** Add time-window conflict checking before assignment.

---

### H005 — `submit()` auto-approves without permission check (Backend)

| File | Line |
|------|------|
| `backend/src/modules/transportation/transportation.service.ts` | 269-278 |

The `submit` method transitions directly to `APPROVED` via `'Request submitted and auto-approved'`. The controller uses `PERMISSIONS.TRANSPORTATION_REQUESTS_CREATE` for submit, not `APPROVE`. A user with create permission can effectively approve their own requests.

**Fix:** Either require approve permission for submit, or transition to `PENDING_APPROVAL` instead.

---

### H006 — PermissionsGuard does a full DB query on every request (Backend)

| File | Line |
|------|------|
| `backend/src/permissions/permissions.guard.ts` | 50-53 |

Every guarded request calls `getPermissionCheckContext` which queries `userRepo.findOne()`, `getPermissionsByRole()` (multiple DB queries), and `userPermissionOverrideRepo.find()`. This is a significant performance penalty per request.

**Fix:** Cache resolved permissions in Redis with TTL, invalidating on role/permission changes.

---

### H007 — Duplicate JWT module registration across 5 modules (Backend)

| Files |
|------|
| `backend/src/auth/auth.module.ts:29-45` |
| `backend/src/users/users.module.ts:25-39` |
| `backend/src/audit/audit.module.ts:18-32` |
| `backend/src/modules/catalog/drivers/driver.module.ts:22-29` |
| `backend/src/modules/catalog/cars/car.module.ts:24-31` |

Five modules each re-register `JwtModule.registerAsync()` with nearly identical config. This creates multiple JWT service instances and makes configuration inconsistent (e.g., AuthModule throws on missing JWT_SECRET, others silently fail).

**Fix:** Register `JwtModule` once with `isGlobal: true`, or export from AuthModule and import as `JwtModule` in dependents.

---

### H008 — `AuditLog` entity has no indexes on commonly filtered columns (Backend)

| File |
|------|
| `backend/src/audit/audit-log.entity.ts` |

`actorEmail`, `action`, `targetType`, and `createdAt` are queried with `ILIKE` and equality filters but have no database indexes. On large audit tables (>100K rows), these queries will degrade significantly.

**Fix:** Add indexes on `(action)`, `(actorEmail)`, `(targetType)`, `(createdAt)`, and a composite on `(action, createdAt)`.

---

### H009 — No React Error Boundary wrapping the app root (Frontend)

| File | Line |
|------|------|
| `frontend/src/main.tsx` | — |

A single uncaught rendering error can unmount the entire React tree, showing a blank white screen. `RouteErrorElement` only catches route-level errors via React Router.

**Fix:** Add an `<ErrorBoundary>` component wrapping `<App />` in `main.tsx`.

---

### H010 — 25 ESLint errors across the frontend codebase (Frontend)

Running `npm run lint` produces 25 errors + 9 warnings:

| Error Pattern | Files |
|---------------|-------|
| `set-state-in-effect` (React 19) | AppShell.tsx:119, ThemeProvider.tsx:57, AuditFilters.tsx:81, ResetPasswordModal.tsx:58, UserLockTimer.tsx:32 |
| `no-explicit-any` (5 instances) | LoginPage.tsx:58,68,69; ChangePasswordPage.tsx:116; AuditLogsPage.tsx:69 |
| Empty catch blocks (3) | ThemeProvider.tsx:24,50; Sidebar.tsx:10 |
| `react-refresh/only-export-components` | router.tsx:26,46; ThemeProvider.tsx:16 |
| Missing React Hook deps (4) | AuthBootstrap.tsx:61; AuditLogsPage.tsx:47; UsersPage.tsx:91; Sidebar.tsx:21 |

**Fix:** Address all ESLint errors. Add `--max-warnings 0` to CI lint step.

---

### H011 — No HTTPS/TLS termination anywhere (Infrastructure)

| File | Line |
|------|------|
| `frontend/nginx.conf` | 7 |
| `backend/Dockerfile` | 23 |

Nginx listens on port 80 only — no TLS configuration. Backend exposes plain HTTP on 8181. The `TRUST_PROXY: "true"` env var suggests an expectation of a TLS-terminating reverse proxy, but none exists in the compose files.

**Fix:** Add TLS termination (via nginx with Let's Encrypt, or a reverse proxy like Traefik/Caddy). At minimum, document the external requirement.

---

### H012 — No health checks on production services (Infrastructure)

Only the dev Postgres container has a healthcheck (`docker-compose.dev.yml:17-21`). The production Redis, backend, and frontend services have no healthchecks — Docker has no way to determine if a service is actually running vs. started but broken.

**Fix:** Add `healthcheck` directives to all production services in `docker-compose.yml`.

---

### H013 — `generateRequestNumber` has a race condition (Backend)

| File | Line |
|------|------|
| `backend/src/modules/transportation/transportation.service.ts` | 72-89 |

Sequential number generation has no transaction or advisory lock. Two concurrent requests could receive the same request number.

**Fix:** Use a database sequence or `SELECT ... FOR UPDATE` in a transaction.

---

### H014 — Token refresh doesn't blocklist the old token (Backend)

| File | Line |
|------|------|
| `backend/src/auth/auth.controller.ts` | 54-70 |

The `refresh` endpoint applies `JwtAuthGuard` which checks the blocklist, but the old token is not blocklisted after issuing a new one. This enables indefinite token chaining, reducing the security value of short token lifetimes.

**Fix:** Blocklist the old token after issuing a new one.

---

### H015 — `@PermissionsAny` + `@Permissions` combined logic untested (Cross-Cutting)

| File | Line |
|------|------|
| `backend/src/permissions/permissions.guard.ts` | 54-61 |

When both `requiredPermissions` and `anyPermissions` are set, the condition requires ALL of `requiredPermissions` AND at least one of `anyPermissions`. This logic has no test coverage and the logging format suggests they were intended to be independent.

**Fix:** Add test coverage for combined permission guards. Document the intended combined behavior.

---

### H016 — Permission naming inconsistency: `employeeManagement.print` vs snake_case convention (Cross-Cutting)

| File | Line |
|------|------|
| `backend/src/permissions/permission.constants.ts` | 86-87 |

`EMPLOYEE_MANAGEMENT_PRINT: 'employeeManagement.print'` and `EMPLOYEE_MANAGEMENT_EXPORT: 'employeeManagement.export'` use camelCase keys, while all 249 other permissions use `snake_case.module.action` convention. This breaks the naming pattern and will confuse audit log filtering.

**Fix:** Rename to `employee_management.print` and `employee_management.export`.

---

### H017 — Audit action naming is inconsistent across services (Cross-Cutting)

28 `auditService.log()` calls across 6 services use 3 different naming styles:

| Style | Used In |
|-------|---------|
| `UPPER_SNAKE_CASE` | Auth, Users, Transportation, Car/Driver |
| `dot.notation` | Permissions |
| Mixed | Audit service itself |

**Fix:** Standardize on one naming convention for audit actions. Recommend `module.action` (e.g., `auth.login_failed`, `user.created`).

---

### H018 — Inconsistent pagination response shape (Cross-Cutting)

| Module | Pagination fields |
|--------|------------------|
| Users, Audit | `{ items, page, limit, total, totalPages }` |
| Transportation | `{ items, total, page, pageSize, totalPages }` |

`limit` vs `pageSize` inconsistency across modules. Any shared pagination component would break.

**Fix:** Standardize on one response shape. Create a `PaginatedResponse<T>` interface.

---

## MEDIUM Priority Issues

### Backend

| ID | Description | File |
|----|-------------|------|
| M001 | Widespread `any` usage — `@typescript-eslint/no-explicit-any` is disabled in ESLint config; 50+ occurrences across 10+ files | Multiple files |
| M002 | `console.error` used instead of NestJS Logger in `audit.service.ts:35` | `backend/src/audit/audit.service.ts` |
| M003 | `AuthUserPayload` type defined but never used — dead code | `backend/src/common/types/auth-user.type.ts` |
| M004 | `RolesGuard` and `Roles` decorator exist but are never applied on any endpoint | `backend/src/auth/roles.guard.ts`, `backend/src/auth/roles.decorator.ts` |
| M005 | Pagination inconsistency — Transportation module uses `pageSize` with own logic instead of `normalizePagination()` | `backend/src/modules/transportation/transportation.service.ts:216-218` |
| M006 | Helmet CSP allows `'unsafe-inline'` and `'unsafe-eval'` — weakens XSS protection | `backend/src/main.ts:54-55` |
| M007 | Transport controller uses `VIEW_OWN` permission for driver actions (accept, decline, trip events) | `backend/src/modules/transportation/transportation.controller.ts:109-141` |
| M008 | No global file upload size limit configured in MulterModule | `backend/src/modules/catalog/cars/car.module.ts:23` |
| M009 | Missing Swagger response types — `@ApiResponse` rarely specifies response schemas | All controllers |
| M010 | `TypeOrmModule.forFeature([User])` in AppModule is redundant — duplicates UsersModule's registration | `backend/src/app.module.ts:38` |
| M011 | `isRateLimitFailClosed` function duplicated in two guards — copy-pasted code | Both rate-limit guards |
| M012 | `car.service.ts` uses `new Car()` instead of `this.carRepo.create()` — bypasses entity lifecycle hooks | `backend/src/modules/catalog/cars/car.service.ts:78` |
| M013 | `AuditService.log()` swallows non-critical errors silently with `console.error` | `backend/src/audit/audit.service.ts:34-37` |
| M014 | Unused Logger instances in DriverController, CarController, MapsController | Multiple controllers |
| M015 | `app.controller.ts` and `app.service.ts` serve `'Hello World!'` — NestJS scaffold placeholder | `backend/src/app.controller.ts` |
| M016 | No audit logging for profile updates, theme changes, or avatar uploads | `backend/src/auth/auth.service.ts` |
| M017 | `TransportationService` auto-assign uses `Math.random()` — no proximity, workload, or skill-matching logic | `backend/src/modules/transportation/transportation.service.ts:485-486` |
| M018 | `MonitoringSummary` `completedToday` counter has no date filter — counts globally, not today | `backend/src/modules/transportation/transportation.service.ts:554-556` |

### Frontend

| ID | Description | File |
|----|-------------|------|
| M019 | Inconsistent data-fetching patterns — DashboardPage uses TanStack Query, other pages use manual useState+useEffect+try/catch | Multiple pages |
| M020 | 24 `console.*` statements in production code — many unguarded | Multiple files |
| M021 | `cn.ts` utility exported but never imported — dead code | `frontend/src/lib/cn.ts` |
| M022 | Unused asset files: `react.svg`, `vite.svg`, possibly `hero.png` | `frontend/src/assets/` |
| M023 | Unchecked `as` type assertions in all API files bypassing TypeScript — 25+ instances | Multiple API files |
| M024 | Duplicate pagination implementation in TransportationRequestsPage instead of using shared `<Pagination>` component | `frontend/src/modules/transportation/pages/TransportationRequestsPage.tsx:130-138` |
| M025 | `useEffect` missing dependency chains create stale closures | AuthBootstrap, UsersPage, AuditLogsPage, Sidebar |
| M026 | Dark mode sidebar gradient identical to light mode | `frontend/src/styles/themes.css:137,218` |
| M027 | `PermissionGate` default fallback is `null` — no visual "access denied" indicator | `frontend/src/components/auth/PermissionGate.tsx:18` |

### Infrastructure

| ID | Description | File |
|----|-------------|------|
| M028 | `TYPEORM_SYNCHRONIZE` reads `process.env` directly, bypassing ConfigService | `backend/src/app.module.ts:34` |
| M029 | No containers run as non-root user — both Node.js and Nginx run as root | `backend/Dockerfile`, `frontend/Dockerfile` |
| M030 | Nginx missing security headers: HSTS, CSP, Permissions-Policy, Cross-Origin headers | `frontend/nginx.conf:28-30` |
| M031 | Backend CORS allows hardcoded non-HTTPS origins including `http://10.18.80.9:8080` | `backend/src/main.ts:73-76` |
| M032 | Nginx uses `$request_uri` instead of `$uri` in proxy_pass — potential path traversal risk | `frontend/nginx.conf:39,59,72,84` |
| M033 | No `.dockerignore` files — build context includes `node_modules/`, `.git/`, and potentially env files | `backend/`, `frontend/` |
| M034 | `.npmrc` contains hardcoded user-specific Linux path | `/Users/matorlino/Projects/bsa_system/.npmrc:1` |

### Cross-Cutting

| ID | Description | File |
|----|-------------|------|
| M035 | `AuthUserPayload` type defines `role` as object `{ id, name, label }` but JWT payload uses plain string | `backend/src/common/types/auth-user.type.ts` |
| M036 | `CurrentUser` type in frontend `auth.types.ts` expects role object but API returns string — misleading | `frontend/src/modules/auth/types/auth.types.ts:5-8` |
| M037 | `BackendCar` type missing 4 entity fields: `seatingCapacity`, `vehicleStatus`, `registrationExpiry`, `insuranceExpiry` | `frontend/src/modules/catalog/cars/types/car.types.ts` |
| M038 | `BackendDriver` type missing 4 entity fields: `dutyStatus`, `licenseExpiry`, `currentLatitude`, `currentLongitude` | `frontend/src/modules/catalog/drivers/types/driver.types.ts` |
| M039 | Audit log metadata inconsistency — permissions logs include before/after, users/cars/drivers don't | Multiple services |
| M040 | ADMIN role missing `PERMISSIONS_EDIT` and several delete permissions — may be intentional but undocumented | `backend/src/permissions/permission.constants.ts` |

---

## LOW Priority Issues

### Backend

| ID | Description | File |
|----|-------------|------|
| L001 | Inconsistent relative import paths — `./../auth/auth.controller` vs `../auth/` | Multiple files |
| L002 | `getPermissionsByRole` in `permission.utils.ts` is a sync subset vs DB-backed service method — confusing | `backend/src/permissions/permission.utils.ts:5-7` |
| L003 | `Role` enum used with `Object.values()` — `const enum` would tree-shake but loses runtime iteration | `backend/src/common/enums/role.enum.ts` |
| L004 | Magic numbers scattered: 2mb limits, 5 login attempts, 30min lockout, rate limit values | Multiple files |
| L005 | `Dockerfile:21` copies `public/` but no static files exist there | `backend/Dockerfile` |
| L006 | Entity files export `import type` types (`CarType`, `VehicleStatus`) — unconventional | Entity files |
| L007 | `HashPassword` lifecycle hook checks only `$2b$` and `$2a$` prefixes, misses `$2y$` | `backend/src/users/user.entity.ts:77-78` |
| L008 | `LoginDto.password` uses `@MinLength(6)` — lenient vs `@IsStrongPassword({ minLength: 10 })` elsewhere | `backend/src/auth/dto/login.dto.ts:18` |
| L009 | `RolesGuard` returns `false` (403) when `user?.role` is falsy — should throw `UnauthorizedException` (401) | `backend/src/auth/roles.guard.ts:23-24` |

### Frontend

| ID | Description | File |
|----|-------------|------|
| L010 | `App.tsx` passes `QueryClient` direct to `QueryClientProvider` via a class instance — prefers `new QueryClient({...})` inline | `frontend/src/app/App.tsx` |

### Infrastructure

| ID | Description | File |
|----|-------------|------|
| L011 | Docker images use `:latest` tags — not reproducible | `infrastructure/maps/docker-compose.maps.yml:54,73` |
| L012 | Hardcoded weak default password in maps compose: `POSTGRES_PASSWORD=change_me_in_production` | `infrastructure/maps/docker-compose.maps.yml:33` |
| L013 | Nominatim and tile-server both bind port 8080 — port conflict | `infrastructure/maps/docker-compose.maps.yml` |
| L014 | Swagger UI available in all non-production environments with `persistAuthorization: true` | `backend/src/main.ts:97-124` |
| L015 | Redis has no persistence or password in production compose | `docker-compose.yml:22-27` |
| L016 | Nginx resolver configured unnecessarily for static container name proxying | `frontend/nginx.conf:25` |
| L017 | `docker-compose.yml:37` bind mounts `backend/storage` — no backup strategy | `docker-compose.yml` |

### Cross-Cutting

| ID | Description | File |
|----|-------------|------|
| L018 | Seed service only seeds SUPERADMIN — no ADMIN, sample USER, cars, or drivers | `backend/src/database/seed.service.ts` |
| L019 | `Map` module uses `@UseFilters(MapsExceptionFilter)` but no other module uses exception filters | `backend/src/modules/maps/maps.controller.ts:29` |

---

## Summary by Category

| Category | CRITICAL | HIGH | MEDIUM | LOW | Total |
|----------|----------|------|--------|-----|-------|
| Backend | 3 | 7 | 8 | 7 | 25 |
| Frontend | 3 | 2 | 10 | 1 | 16 |
| Infrastructure | 2 | 3 | 7 | 8 | 20 |
| Cross-Cutting | 4 | 6 | 6 | 2 | 18 |
| **Total** | **12** | **18** | **31** | **18** | **79** |

### Top 10 Must-Fix Items (Prioritized)

1. **C001** — Rotate all committed secrets; fix `.gitignore`
2. **C002** — Fix env-var name mismatch (`MOSV2_INTERNAL_API_KEY` vs `BSA_INTERNAL_API_KEY`)
3. **C003** — Remove `synchronize`, implement TypeORM migrations
4. **C007** — Delete duplicate `RolePermission` entity file
5. **C005 / C006** — Add authentication to unprotected avatar and car photo endpoints
6. **C009** — Move JWT from localStorage to httpOnly cookies
7. **C008** — Fix `useState`→`useEffect` bug in Topbar
8. **C012** — Align frontend `hasPermission` OR semantics with backend AND semantics
9. **C011** — Create or remove missing Docker overlay compose files
10. **C010** — Fix `AuthBootstrap` unsafe `finally` bug
