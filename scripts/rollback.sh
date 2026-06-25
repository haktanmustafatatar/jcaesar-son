#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="$(cd "$(dirname "$0")/.." && pwd)/docker-compose.yml"
DEPLOY_LOG="/var/log/ef-deploy.log"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$DEPLOY_LOG"; }

PREV_APP=$(cat /tmp/ef-prev-app-image 2>/dev/null || echo "")
PREV_WORKER=$(cat /tmp/ef-prev-worker-image 2>/dev/null || echo "")

if [[ -z "$PREV_APP" && -z "$PREV_WORKER" ]]; then
  log "No previous images found — cannot rollback"
  exit 1
fi

log "Rolling back to app=$PREV_APP worker=$PREV_WORKER"

if [[ -n "$PREV_APP" ]]; then
  export APP_IMAGE="$PREV_APP"
  docker pull "$PREV_APP" 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" up -d --no-deps --pull never app
  log "App rolled back to $PREV_APP"
fi

if [[ -n "$PREV_WORKER" ]]; then
  export WORKER_IMAGE="$PREV_WORKER"
  docker pull "$PREV_WORKER" 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" up -d --no-deps --pull never worker
  log "Worker rolled back to $PREV_WORKER"
fi

# Clean up saved state
rm -f /tmp/ef-prev-app-image /tmp/ef-prev-worker-image

log "Rollback complete"
