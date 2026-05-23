#!/bin/bash
set -e

# Antigravity Automated Droplet Deployer v4 (Split-Transfer Bulletproof Edition)
echo "=== 🚀 Antigravity Automated Droplet Deployer v4 (Split-Transfer) ==="

LOCAL_APP_DIR="/Users/haktanmustafatatar/Downloads/ef/app"
ARCHIVE_NAME="jcaesar_patch_v4.tar.gz"
DROPLET_IP="164.92.167.62"

cd "$LOCAL_APP_DIR"

# Clean up any old chunks first
rm -f chunk_*

echo "📦 [1/6] Creating lightweight tarball..."
tar --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.vercel' --exclude='.env' --exclude='backups' --exclude='*.tar.gz' --exclude='*.zip' --exclude='*.log' -czf "$ARCHIVE_NAME" .

echo "✂️ [2/6] Splitting archive into 200KB chunks to bypass network stalling..."
split -b 200k "$ARCHIVE_NAME" chunk_
rm "$ARCHIVE_NAME"

echo "📤 [3/6] Transferring chunks and remote deploy script to Droplet..."
echo "🔒 (Please enter your droplet password if prompted - ONLY ONCE)"
# Upload both the split chunks AND the deploy_remote.sh script
scp -P 22 chunk_* deploy_remote.sh root@$DROPLET_IP:/app/

# Clean up local chunks
rm -f chunk_*

echo "🔄 [4/6] Connecting to remote server to execute deployment..."
echo "🔒 (Please enter your droplet password if prompted)"
# Execute the remote deployment script cleanly (no interactive shell warnings)
ssh root@$DROPLET_IP "bash /app/deploy_remote.sh"
