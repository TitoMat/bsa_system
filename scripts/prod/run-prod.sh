#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

FAILURES=0

record_fail() {
  fail "$*"
  FAILURES=$((FAILURES + 1))
}

wait_for_container_running() {
  local container_name="$1"
  local attempts="${2:-60}"
  local delay_seconds="${3:-2}"

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if [[ "$(docker_cli inspect -f '{{.State.Running}}' "$container_name" 2>/dev/null || true)" == "true" ]]; then
      ok "Container is running: $container_name"
      return 0
    fi

    sleep "$delay_seconds"
  done

  record_fail "Container did not become running: $container_name"
  return 1
}

http_status() {
  local url="$1"
  curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo "000"
}

info "BSA production deploy starting"
info "App directory: $BSA_APP_DIR"
info "Compose files: $BSA_COMPOSE_FILE"
info "Git branch: $BSA_GIT_BRANCH"

for command_name in git docker curl; do
  require_command "$command_name" || FAILURES=$((FAILURES + 1))
done

if [[ "$FAILURES" -gt 0 ]]; then
  safe_exit 1 "Deploy failed before repo update"
fi

if [[ ! -d "$BSA_APP_DIR/.git" ]]; then
  record_fail "Not a git repository: $BSA_APP_DIR"
  safe_exit 1 "Deploy aborted: app directory is not a git repo"
fi

cd "$BSA_APP_DIR"
info "Updating repository to origin/$BSA_GIT_BRANCH"
git fetch origin
git reset --hard "origin/$BSA_GIT_BRANCH"
ok "Repository updated"

info "Building and starting containers"
docker_compose up -d --build
ok "Containers started"

wait_for_container_running "$BSA_REDIS_CONTAINER" || true
wait_for_container_running "$BSA_BACKEND_CONTAINER" || true
wait_for_container_running "$BSA_FRONTEND_CONTAINER" || true

if [[ "$(docker_cli inspect -f '{{.State.Running}}' "$BSA_BACKEND_CONTAINER" 2>/dev/null || true)" == "true" ]]; then
  info "Running backend migrations"
  docker_cli exec "$BSA_BACKEND_CONTAINER" node scripts/run-migrations.js
  ok "Backend migrations completed"
else
  record_fail "Backend container not running; migrations skipped"
fi

info "Running production healthcheck"

for container_name in "$BSA_REDIS_CONTAINER" "$BSA_BACKEND_CONTAINER" "$BSA_FRONTEND_CONTAINER"; do
  if [[ "$(docker_cli inspect -f '{{.State.Running}}' "$container_name" 2>/dev/null || true)" == "true" ]]; then
    ok "Container is running: $container_name"
  else
    record_fail "Container is not running: $container_name"
  fi
done

FRONTEND_STATUS="$(http_status "http://127.0.0.1:$BSA_FRONTEND_PORT")"
if [[ "$FRONTEND_STATUS" == "200" ]]; then
  ok "Frontend responds: HTTP $FRONTEND_STATUS"
else
  record_fail "Frontend did not respond with HTTP 200 (got $FRONTEND_STATUS)"
fi

BACKEND_STATUS="$(http_status "http://127.0.0.1:$BSA_BACKEND_PORT/api")"
if [[ "$BACKEND_STATUS" == "200" ]]; then
  ok "Backend API responds: HTTP $BACKEND_STATUS"
else
  record_fail "Backend API did not respond with HTTP 200 (got $BACKEND_STATUS)"
fi

if [[ "$(docker_cli inspect -f '{{.State.Running}}' "$BSA_BACKEND_CONTAINER" 2>/dev/null || true)" == "true" ]]; then
  BACKEND_LOG_MATCHES="$(docker_cli logs --since 5m "$BSA_BACKEND_CONTAINER" 2>&1 | grep -Ein 'error|QueryFailed|ENOENT|ECONNREFUSED' || true)"
  if [[ -n "$BACKEND_LOG_MATCHES" ]]; then
    record_fail "Backend logs contain critical entries in the last 5 minutes"
    printf '%s\n' "$BACKEND_LOG_MATCHES" >&2
  else
    ok "Backend logs are clean for last 5 minutes"
  fi
fi

info "Deploy summary: $FAILURES failure(s)"
if [[ "$FAILURES" -gt 0 ]]; then
  safe_exit 1 "BSA production deploy finished with failures"
fi

safe_exit 0 "BSA production deploy completed"