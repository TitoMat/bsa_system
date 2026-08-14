# BSA System — Operations & Handoff

Fleet/transportation management system. NestJS backend + React frontend.

## Where things run

**App node** — `gray-bsa`, Tailscale `100.66.168.82`, Ubuntu 24.04

- SSH (Tailscale keyless): `ssh root@100.66.168.82`
- App code: `/opt/bsa_system` (git clone of this repo, branch `main`)
- Stack: Docker Compose — `docker-compose.yml` + `docker-compose.production.yml`
  - `mosv2-backend` → `127.0.0.1:8181` (NestJS, global prefix `/api`)
  - `mosv2-frontend` → `127.0.0.1:8080` (nginx serving the SPA)
  - `mosv2-redis` → internal only
  - All containers `restart: unless-stopped`
- Secrets: `/opt/bsa_system/.env` (gitignored — DB, JWT, superadmin)
- Host nginx: `/etc/nginx/sites-available/bsa` (enabled) — port 80: `/api/` → 8181, `/` → 8080

**Database** — `gray-db`, Tailscale `100.65.197.43`

- DB `bsa_system`, user `bsa_app` (scram-sha-256)
- `pg_hba.conf` has a host entry allowing the bsa node (`100.66.168.82`) → `bsa_system`
- Tailscale ACL already allows `gray-bsa → gray-db:5432`

**Repo** — https://github.com/TitoMat/bsa_system (public)

## Secrets (never commit)

- `backend/.env.production` (local, gitignored) — canonical secret values
- Node `/opt/bsa_system/.env` — what the running stack actually uses

## Common ops

```bash
# SSH into app node
ssh root@100.66.168.82

# Redeploy after pushing code changes
cd /opt/bsa_system && git fetch origin && git reset --hard origin/main
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build

# Logs / status
docker compose -f docker-compose.yml -f docker-compose.production.yml ps
docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f mosv2-backend

# nginx
nginx -t && systemctl reload nginx
```

## Handoff — finish the Cloudflare tunnel

Blocked on: opencode restart + Cloudflare OAuth.

1. Restart opencode (MCP config is not hot-reloaded).
2. The `cloudflare-api` MCP (`https://mcp.cloudflare.com/mcp`) is registered in
   `~/.config/opencode/opencode.jsonc`. First use triggers an OAuth browser
   login — approve with `Cloudflare Tunnel:Edit` + `DNS:Edit` on the `comsys.me`
   zone.
3. Create a tunnel and route the public hostname `bsa.comsys.me` (confirm the
   exact subdomain with the operator) to `http://localhost:80` on gray-bsa.
4. On the node, run cloudflared against that tunnel (already installed,
   v2026.8.1), e.g. `cloudflared service install <TUNNEL_TOKEN>`, then
   `systemctl enable --now cloudflared`.
5. Verify end-to-end:
   - `curl -s https://bsa.comsys.me/` → title "BSA System"
   - `curl -s -X POST https://bsa.comsys.me/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@bsa.local","password":"<SUPERADMIN_PASSWORD>"}'` → 201 + JWT
