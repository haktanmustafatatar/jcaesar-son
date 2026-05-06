#!/bin/bash

# Start the background worker process for JCaesar
echo "[JCaesar] Starting workers..."

# Navigate to the app directory if needed
# cd /Users/haktanmustafatatar/Downloads/ef/app

# Run the worker using tsx
npx tsx workers/index.ts
