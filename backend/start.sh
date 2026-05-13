#!/bin/sh
set -e

echo "[start.sh] Running database migrations..."
npx prisma migrate deploy

echo "[start.sh] Starting server..."
exec node dist/index.js
