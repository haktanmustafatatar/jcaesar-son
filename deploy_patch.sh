#!/bin/bash
set -e

echo "=== 🚀 JCaesar Deployer ==="

LOCAL_APP_DIR="/Users/haktanmustafatatar/Downloads/ef/app"
ARCHIVE_NAME="/tmp/jcaesar_patch_latest.tar.gz"
DROPLET_IP="164.92.167.62"
SSH_KEY="$HOME/.ssh/do_root_ed25519"
# Allow password auth if key auth fails
SSH_OPTS="-o ServerAliveInterval=60 -o ServerAliveCountMax=10 -o PreferredAuthentications=publickey,keyboard-interactive,password -o StrictHostKeyChecking=no"
if [ -f "$SSH_KEY" ]; then
  SSH_OPTS="-i $SSH_KEY $SSH_OPTS"
fi

cd "$LOCAL_APP_DIR"

echo "📦 [1/4] Creating tarball..."
tar --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.env' \
    --exclude='backups' --exclude='*.tar.gz' --exclude='*.zip' --exclude='*.log' \
    --exclude='chunk_*' --exclude='scratch' \
    -czf "$ARCHIVE_NAME" .
echo "   Size: $(du -sh $ARCHIVE_NAME | cut -f1)"

echo "📤 [2/4] Uploading to server..."
scp $SSH_OPTS "$ARCHIVE_NAME" deploy_remote.sh root@$DROPLET_IP:/app/

echo "🔄 [3/4] Running remote deploy..."
ssh $SSH_OPTS root@$DROPLET_IP "cd /app && tar -xzf jcaesar_patch_latest.tar.gz -C /app/app && bash /app/deploy_remote.sh"

echo "✅ [4/4] Deploy complete!"
