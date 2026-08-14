#!/usr/bin/env bash

set -Eeuo pipefail

BSA_APP_DIR="${BSA_APP_DIR:-/home/gray-bsa/apps/bsa_system}"
BSA_COMPOSE_FILE="${BSA_COMPOSE_FILE:-docker-compose.yml docker-compose.production.yml}"
BSA_BACKEND_CONTAINER="${BSA_BACKEND_CONTAINER:-bsa-backend}"
BSA_FRONTEND_CONTAINER="${BSA_FRONTEND_CONTAINER:-bsa-frontend}"
BSA_REDIS_CONTAINER="${BSA_REDIS_CONTAINER:-bsa-redis}"
BSA_BACKEND_PORT="${BSA_BACKEND_PORT:-8181}"
BSA_FRONTEND_PORT="${BSA_FRONTEND_PORT:-8080}"
BSA_GIT_BRANCH="${BSA_GIT_BRANCH:-main}"
BSA_PROD_ENV_FILE="${BSA_PROD_ENV_FILE:-}"

if [[ -n "$BSA_PROD_ENV_FILE" && -r "$BSA_PROD_ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$BSA_PROD_ENV_FILE"
fi

if [[ -t 1 ]]; then
  BSA_COLOR_BLUE=$'\033[0;34m'
  BSA_COLOR_GREEN=$'\033[0;32m'
  BSA_COLOR_YELLOW=$'\033[0;33m'
  BSA_COLOR_RED=$'\033[0;31m'
  BSA_COLOR_RESET=$'\033[0m'
else
  BSA_COLOR_BLUE=""
  BSA_COLOR_GREEN=""
  BSA_COLOR_YELLOW=""
  BSA_COLOR_RED=""
  BSA_COLOR_RESET=""
fi

info() {
  printf '%s[INFO]%s %s\n' "$BSA_COLOR_BLUE" "$BSA_COLOR_RESET" "$*"
}

ok() {
  printf '%s[OK]%s %s\n' "$BSA_COLOR_GREEN" "$BSA_COLOR_RESET" "$*"
}

warn() {
  printf '%s[WARN]%s %s\n' "$BSA_COLOR_YELLOW" "$BSA_COLOR_RESET" "$*" >&2
}

fail() {
  printf '%s[FAIL]%s %s\n' "$BSA_COLOR_RED" "$BSA_COLOR_RESET" "$*" >&2
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "Required command not found: $command_name"
    return 1
  fi
}

safe_exit() {
  local code="${1:-0}"
  local message="${2:-}"

  if [[ -n "$message" ]]; then
    if [[ "$code" -eq 0 ]]; then
      ok "$message"
    else
      fail "$message"
    fi
  fi

  exit "$code"
}

repo_script_dir() {
  cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd
}

# Docker requires sudo on the BSA node (admin user gray-bsa, passwordless
# sudo). Wrap so the script works whether or not it is invoked as root.
docker_cli() {
  if [[ "$(id -u)" -eq 0 ]]; then
    docker "$@"
  elif docker info >/dev/null 2>&1; then
    docker "$@"
  else
    sudo -n docker "$@"
  fi
}

docker_compose() {
  local compose_args=()

  # Supports one or more compose files in BSA_COMPOSE_FILE.
  # Example:
  # BSA_COMPOSE_FILE="docker-compose.yml docker-compose.production.yml"
  for compose_file in $BSA_COMPOSE_FILE; do
    compose_args+=("-f" "$compose_file")
  done

  docker_cli compose "${compose_args[@]}" "$@"
}