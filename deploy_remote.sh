#!/bin/bash
set -e

echo "=== 🔄 Droplet Remote Execution Started ==="

cd /app/app

echo "🔑 [Helper] Checking required env vars..."
touch .env
# Credentials are managed in the server .env — do not hardcode secrets here
# Ensure ADMIN_CLERK_IDS is set (required for admin panel access)
if ! grep -q "^ADMIN_CLERK_IDS=" .env; then
  echo "⚠️  WARNING: ADMIN_CLERK_IDS not set in .env — admin panel access may be restricted"
fi

echo "🏗️ [4/5] Rebuilding Docker images..."
docker-compose build app migration worker

echo "🗄️ [5/5] Synchronizing Prisma Database Schema..."
docker-compose run --rm migration

echo "🚀 [Launch] Starting Docker containers..."
docker-compose up -d --force-recreate app worker

echo "⏳ Waiting for containers to stabilize..."
sleep 3

echo "✨ Creating/Updating Database Indices (pgvector HNSW & FTS GIN)..."
docker-compose exec -T app npx tsx prisma/create-indices.ts || true

echo "⚙️ Running database backfill script to populate Meta channel phone IDs..."
docker-compose exec -T app npx tsx scripts/backfill-phone-ids.ts || true

echo "⚙️ Running database backfill script to sanitize conversation channels..."
docker-compose exec -T app npx tsx scripts/backfill-conversation-channels.ts || true

# Clean up remote helper script
rm -f /app/deploy_remote.sh

echo "=== 🎉 JCaesar Patch Successfully Deployed & Running! ==="
