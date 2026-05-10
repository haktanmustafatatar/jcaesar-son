#!/bin/bash
set -e

# JCaesar Zero-Downtime Deployment Script
NODE_OPTIONS="--max-old-space-size=4096"
ENVIRONMENT=${1:-production}
IMAGE_TAG=${2:-latest}

echo "🚀 Starting deployment for $ENVIRONMENT environment with tag $IMAGE_TAG"

# Pull latest images
docker pull ghcr.io/haktanmustafatatar/jcaesar-app:$IMAGE_TAG

# Update docker-compose image tag if we are using an environment variable based compose file
export APP_IMAGE_TAG=$IMAGE_TAG

echo "📦 Running Prisma Migrations..."
docker-compose run --rm app npx prisma migrate deploy

echo "🔄 Restarting Worker (Safe to restart immediately)"
docker-compose up -d --no-deps worker

echo "🌐 Performing Zero-Downtime roll-out for Next.js App..."
# Scale to 2 instances temporarily
docker-compose up -d --scale app=2 --no-recreate app

# Wait for healthcheck of the new container
sleep 15
if ! curl -s --fail http://localhost:3000/api/health; then
  echo "❌ Healthcheck failed! Rolling back..."
  docker-compose stop app
  docker-compose rm -f app
  docker-compose up -d --scale app=1 app
  exit 1
fi

# Scale back to 1 instance (kills the oldest one)
docker-compose up -d --scale app=1 --no-deps app

echo "✅ Deployment Successful!"
