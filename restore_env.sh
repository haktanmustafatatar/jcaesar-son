#!/bin/bash
# restore_env.sh - Recover the original production .env from backups (Robust Version)

BACKUP_DIR="/app/backups"
echo "=== 🔍 Restoring Production .env from Backups ==="

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory not found at $BACKUP_DIR!"
    exit 1
fi

echo "📊 Available Backups:"
ls -lt $BACKUP_DIR/backup_pre_v4_*.tar.gz 2>/dev/null

# Find the oldest backup which is guaranteed to contain the original, pristine production .env
OLDEST_BACKUP=$(ls -tr $BACKUP_DIR/backup_pre_v4_*.tar.gz 2>/dev/null | head -n 1)

if [ -z "$OLDEST_BACKUP" ]; then
    echo "❌ No pre-v4 backups found!"
    exit 1
fi

echo ""
echo "Found oldest backup: $OLDEST_BACKUP"
echo "Extracting pristine production .env..."

# Create a clean temporary directory
TEMP_RESTORE_DIR="/tmp/restore_env_tmp"
rm -rf "$TEMP_RESTORE_DIR"
mkdir -p "$TEMP_RESTORE_DIR"

# Extract the entire archive to temp directory to guarantee we find the .env file regardless of path prefix
tar -xzf "$OLDEST_BACKUP" -C "$TEMP_RESTORE_DIR" 2>/dev/null

# Find the .env file recursively in the extracted files
RESTORED_ENV_PATH=$(find "$TEMP_RESTORE_DIR" -name ".env" | head -n 1)

if [ -n "$RESTORED_ENV_PATH" ] && [ -f "$RESTORED_ENV_PATH" ]; then
    cp "$RESTORED_ENV_PATH" /app/app/.env
    echo "✅ Successfully restored /app/app/.env from backup!"
    
    # Show the APP URL of the restored env to verify
    echo "🔗 Restored APP URL: $(grep 'NEXT_PUBLIC_APP_URL' /app/app/.env)"
else
    echo "❌ Could not find .env in backup archive!"
    rm -rf "$TEMP_RESTORE_DIR"
    exit 1
fi

# Clean up
rm -rf "$TEMP_RESTORE_DIR"

echo "🔄 Restarting jcaesar-app to apply production variables..."
cd /app/app && docker-compose restart app

echo "=== 🎉 Restore Complete! ==="
