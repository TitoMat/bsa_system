# BSA System — Operations & Handoff

Fleet/transportation management system. NestJS backend + React frontend.

## Where things run

**App node** — `gray-bsa`, Tailscale `100.66.168.82`, Ubuntu 24.04

- SSH (key-based, admin user): `ssh gray-bsa@100.66.168.82`
- Root SSH disabled (sshd `PermitRootLogin no` + root account locked + Tailscale
  SSH off). Admin tasks run via `sudo -n` (passwordless) as `gray-bsa`.
- App code: `~/apps/bsa_system` (git clone of this repo, branch `main`, owned by `gray-bsa`)
- Stack: Docker Compose — `docker-compose.yml` + `docker-compose.production.yml`
  - `bsa-backend` → `127.0.0.1:8181` (NestJS, global prefix `/api`)
  - `bsa-frontend` → `127.0.0.1:8080` (nginx serving the SPA)
  - `bsa-redis` → internal only
  - All containers `restart: unless-stopped`
- Secrets: `~/apps/bsa_system/.env` (gitignored — DB, JWT, superadmin)
- Host nginx: `/etc/nginx/sites-available/bsa` (enabled) — port 80: `/api/` → 8181, `/` → 8080

**Database** — `gray-db`, Tailscale `100.65.197.43`

- DB `bsa_system`, user `bsa_app` (scram-sha-256)
- `pg_hba.conf` has a host entry allowing the bsa node (`100.66.168.82`) → `bsa_system`
- Tailscale ACL already allows `gray-bsa → gray-db:5432`

**Repo** — https://github.com/TitoMat/bsa_system (public)

## Secrets (never commit)

- `backend/.env.production` (local, gitignored) — canonical secret values
- Node `~/apps/bsa_system/.env` — what the running stack actually uses

## Common ops

```bash
# SSH into app node
ssh gray-bsa@100.66.168.82

# Redeploy after pushing code changes (single script: update → rebuild → up → migrations → healthcheck)
cd ~/apps/bsa_system && bash scripts/prod/run-prod.sh

# Logs / status
sudo -n docker compose -f docker-compose.yml -f docker-compose.production.yml ps
sudo -n docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f bsa-backend

# Migrations only (no rebuild): docker exec bsa-backend node scripts/run-migrations.js

# nginx
sudo -n nginx -t && sudo -n systemctl reload nginx
```

## Cloudflare tunnel — DONE (2026-08-14)

Public hostname: `https://bsa.comsys.me` → `http://localhost:80` on gray-bsa.

- Tunnel: `bsa`, ID `87eeec6a-01b1-4e3a-ada1-9223700435cc`, remote config
  (ingress managed via Cloudflare API/dashboard).
- DNS: `bsa.comsys.me` CNAME → `87eeec6a-01b1-4e3a-ada1-9223700435cc.cfargotunnel.com` (proxied).
- Node: `cloudflared.service` (systemd, enabled) running token-based install,
  v2026.8.1.
- Verified: `GET /` → 200 title "BSA System"; `POST /api/auth/login` → 201 + JWT.

Reinstall after node rebuild: re-create the tunnel token from the dashboard
(Tunnels → bsa → Configure → Reinstall), then on the node:
`cloudflared service install <TUNNEL_TOKEN> && systemctl enable --now cloudflared`.
