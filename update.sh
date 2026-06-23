#!/usr/bin/env bash
# Mintaz updater — pulls latest source, rebuilds, restarts. Puts the dashboard
# in maintenance mode during the update and clears it on exit (even on error).
set -euo pipefail
cd "$(dirname "$0")"

BRANCH="${UPDATE_BRANCH:-main}"
REPO_URL="${UPDATE_REPO_URL:-https://github.com/foxstudio-201/mintaz.git}"
FLAG="backend/data/maintenance.flag"

mkdir -p backend/data
cleanup() { rm -f "$FLAG" 2>/dev/null || true; }
trap cleanup EXIT

printf '{"reason":"update","since":%s000}' "$(date +%s)" > "$FLAG"
echo "▶ Maintenance mode ON"

echo "▶ Fetching $REPO_URL ($BRANCH)"
git fetch "$REPO_URL" "$BRANCH"
git reset --hard FETCH_HEAD

echo "▶ Installing backend dependencies"
npm --prefix backend install --no-audit --no-fund
echo "▶ Installing frontend dependencies"
npm --prefix frontend install --no-audit --no-fund
echo "▶ Building frontend"
npm --prefix frontend run build

rm -f "$FLAG"
echo "✓ Maintenance mode OFF"

SVC=""
for s in mintaz-api voxelx-api; do
  if systemctl cat "$s" >/dev/null 2>&1; then SVC="$s"; break; fi
done
if [ -n "$SVC" ]; then
  echo "▶ Restarting $SVC"
  sudo systemctl restart "$SVC"
  echo "✅ Updated and restarted $SVC"
else
  echo "✅ Updated. Restart your Mintaz service to load the new version."
fi
