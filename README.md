# BSA System

A full-stack foundation project bootstrapped from a battle-tested NestJS + React architecture.

## Tech Stack

**Backend:** NestJS 11, TypeORM 0.3, PostgreSQL, Redis, JWT Auth, Swagger
**Frontend:** React 19, Vite 8, React Router 7, TanStack Query, Zustand, TailwindCSS 4

## Foundation Features

- **Authentication** — JWT with login rate limiting, token blocklist, force-password-change, avatar upload
- **User Management** — CRUD, role assignment, lock/unlock, status toggle, reset password
- **Permission System** — Role-based permissions with custom roles and user overrides
- **Audit Logs** — Track all sensitive actions with actor, action, and metadata
- **Profile & Settings** — Edit profile, change password, theme preference (light/dark/system)
- **Responsive Layout** — Collapsible sidebar, permission-gated navigation, session management

## Getting Started

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- PostgreSQL 16 (or use the included Docker setup)

### Quick Start with Docker

```bash
# Copy env template (placeholders — set real values)
cp .env.example .env

# Edit .env — set strong passwords and a JWT_SECRET

# Build and start
docker compose -f docker-compose.dev.yml up -d --build

# Open the app
open http://localhost:5174
```

### Local Development (without Docker)

```bash
# Backend
cd backend
cp .env.example .env.local
npm ci
npm run start:dev

# Frontend (new terminal)
cd frontend
npm ci
npm run dev
```

## Database Migrations (R0A safety foundation)

Schema changes are migration-controlled. The single canonical TypeORM
configuration lives in `backend/src/database/data-source.ts` and is shared by
the NestJS runtime and the migration CLI.

```bash
cd backend
npm run migration:show      # pending/executed migrations
npm run migration:run       # apply pending migrations
npm run migration:revert    # revert the last migration
npm run migration:generate  # diff entities vs DB -> new migration file
npm run migration:create    # scaffold an empty migration
```

Safety rules:

- **Production never runs `synchronize`.** `TYPEORM_SYNCHRONIZE` is only honored
  outside production (temporary dev bootstrap until a full DDL baseline is
  generated). `NODE_ENV=production` forces it off.
- The repository ships an **empty baseline migration**
  (`src/database/migrations/*-R0ABaseline.ts`) that performs no DDL. Existing
  databases should run `npm run migration:run` once to record the baseline, then
  use `migration:generate` for forward-only drift changes (review every
  generated migration before running it).
- Fresh databases: bootstrap the schema with `TYPEORM_SYNCHRONIZE=true` (dev),
  then `npm run migration:run`; or generate the initial DDL migration directly.

> R1 note: the temporary dev `synchronize` escape hatch is scheduled for removal
> once a real baseline DDL migration exists.

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── main.ts              # Bootstrap: CORS, Helmet, Swagger
│   │   ├── app.module.ts        # Root module
│   │   ├── auth/                # JWT auth, login rate limit, blocklist
│   │   ├── users/               # User CRUD, status, unlock, reset pw
│   │   ├── audit/               # Audit log entity, service, controller
│   │   ├── permissions/         # Roles, permissions, RBAC guard
│   │   ├── common/              # Shared infra (redis, enums, guards)
│   │   └── database/            # Data source, entities registry, seed
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # Root render with Router & Theme
│   │   ├── app/                 # Router, providers, auth bootstrap
│   │   ├── api/                 # Axios instance, auth/users API
│   │   ├── components/
│   │   │   ├── auth/            # PermissionGate
│   │   │   ├── layout/          # AppShell, Sidebar, Topbar
│   │   │   ├── theme/           # ThemeProvider, ThemeToggle
│   │   │   └── ui/              # Reusable UI kit
│   │   ├── features/            # Auth store (Zustand), sidebar state
│   │   ├── hooks/               # useTheme, useConfirm, unsaved guard
│   │   ├── lib/                 # Permissions, session, token refresh
│   │   ├── modules/             # Feature modules
│   │   │   ├── audit/           # Audit logs page
│   │   │   ├── profile/         # Profile & settings page
│   │   │   └── users/           # User management page
│   │   ├── pages/               # Login, dashboard, not-found
│   │   ├── shared/              # Shared components & constants
│   │   └── styles/              # Tailwind, themes, tokens, tables
│   └── Dockerfile
├── docker-compose.yml           # Base compose
├── docker-compose.dev.yml       # Dev compose (PG + Redis + BE + FE)
└── .env.dev                     # Env template for Docker dev
```
