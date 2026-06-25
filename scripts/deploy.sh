#!/usr/bin/env bash
set -euo pipefail

APP_IMAGE="${1:?APP_IMAGE required}"
WORKER_IMAGE="${2:?WORKER_IMAGE required}"
DEPLOY_SHA="${3:?DEPLOY_SHA required}"

COMPOSE_FILE="$(cd "$(dirname "$0")/.." && pwd)/docker-compose.yml"
DEPLOY_LOG="/var/log/ef-deploy.log"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$DEPLOY_LOG"; }

log "Starting deploy sha=$DEPLOY_SHA"
log "app=$APP_IMAGE worker=$WORKER_IMAGE"

# Save current image tags for rollback
PREV_APP=$(docker inspect --format='{{index .RepoTags 0}}' jcaesar-app 2>/dev/null || echo "")
PREV_WORKER=$(docker inspect --format='{{index .RepoTags 0}}' jcaesar-worker 2>/dev/null || echo "")
if [[ -n "$PREV_APP" ]]; then
  echo "$PREV_APP" > /tmp/ef-prev-app-image
  log "Saved previous app image: $PREV_APP"
fi
if [[ -n "$PREV_WORKER" ]]; then
  echo "$PREV_WORKER" > /tmp/ef-prev-worker-image
  log "Saved previous worker image: $PREV_WORKER"
fi

# Pull new images
log "Pulling images..."
docker pull "$APP_IMAGE"
docker pull "$WORKER_IMAGE"

# Update docker-compose to use explicit image tags
export APP_IMAGE WORKER_IMAGE

# Run DB migrations before traffic switch
log "Running migrations..."
docker compose -f "$COMPOSE_FILE" run --rm \
  -e DATABASE_URL \
  migration || { log "Migration failed — aborting deploy"; exit 1; }

# Zero-downtime app restart: scale up new, wait healthy, remove old
log "Restarting app service..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps --pull never app

# Wait for app health (up to 60s)
for i in $(seq 1 12); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' jcaesar-app 2>/dev/null || echo "none")
  if [[ "$STATUS" == "healthy" ]]; then
    log "App is healthy after ${i}x5s"
    break
  fi
  if [[ $i -eq 12 ]]; then
    log "App failed health check after 60s — rolling back"
    bash "$(dirname "$0")/rollback.sh"
    exit 1
  fi
  log "Waiting for health check ($i/12)..."
  sleep 5
done

# Restart worker (brief downtime acceptable — queue handles backlog)
log "Restarting worker service..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps --pull never worker

log "Deploy sha=$DEPLOY_SHA completed successfully"
