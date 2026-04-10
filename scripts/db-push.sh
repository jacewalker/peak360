#!/usr/bin/env bash
# Push Drizzle schema to production PostgreSQL (additive, no data loss)
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set."
  echo "Set it with: export DATABASE_URL=\"postgresql://user:pass@host:port/db?sslmode=require\""
  exit 1
fi

echo "Pushing schema to: ${DATABASE_URL%%@*}@***"
npx drizzle-kit push
echo "Done."
