#!/bin/bash
set -e

echo "=== 🔄 Droplet Remote Execution Started ==="

echo "📥 [1/5] Assembling chunk files..."
cd /app
cat chunk_* > jcaesar_patch_v4.tar.gz
rm -f chunk_*

echo "📥 [2/5] Backing up existing version..."
mkdir -p backups
tar -czf backups/backup_pre_v4_$(date +%s).tar.gz -C /app/app . 2>/dev/null || true

echo "📥 [3/5] Extracting patch cleanly..."
tar -xzf jcaesar_patch_v4.tar.gz -C /app/app
rm -f jcaesar_patch_v4.tar.gz

cd /app/app

echo "🏗️ [4/5] Rebuilding Docker images..."
docker-compose build --no-cache app migration

echo "🗄️ [5/5] Synchronizing Prisma Database Schema..."
docker-compose run --rm migration

echo "🚀 [Launch] Starting Docker containers..."
docker-compose up -d --force-recreate app

# Clean up remote helper script
rm -f /app/deploy_remote.sh

echo "=== 🎉 JCaesar Patch Successfully Deployed & Running! ==="
