#!/bin/sh
set -e

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SSBS Frontend Entrypoint
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 1. CHECK FOR SOURCE CODE
if [ ! -f "package.json" ]; then
    echo " "
    echo "🛑 SSBS Frontend: 'package.json' not found in /app"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   Container started in IDLE MODE to allow scaffolding."
    echo " "
    echo "   TO INITIALIZE THE REACT FRONTEND:"
    echo "   Run: make scaffold-frontend"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Keep container alive for 'exec' commands
    sleep infinity
fi

# 2. INSTALL DEPENDENCIES
# Keyed on a hash of package-lock.json, not just "does node_modules exist" —
# a stale or partial install (e.g. a node_modules volume reused from an
# unrelated project) would otherwise pass the old check silently and only
# blow up later at runtime (this is exactly what happened with `recharts`).
echo "📦 Checking dependencies..."
LOCK_HASH_FILE="node_modules/.fleetmark-lockfile-hash"
CURRENT_HASH="$(md5sum package-lock.json 2>/dev/null | awk '{print $1}')"
STORED_HASH="$(cat "$LOCK_HASH_FILE" 2>/dev/null || true)"

if [ ! -x "node_modules/.bin/vite" ] || [ -z "$CURRENT_HASH" ] || [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
    echo "   Installing modules (package-lock.json changed, or install missing/incomplete)..."
    npm ci
    echo "$CURRENT_HASH" > "$LOCK_HASH_FILE"
else
    echo "   Node modules match package-lock.json — skipping install."
fi

# 3. START SERVER
# Dev/eval (APP_DEBUG=true, the default): Vite dev server with HMR.
# Production (APP_DEBUG=false): build the real bundle and serve the static
# dist/ via `vite preview` — no HMR, no dev-server websocket exposed. (The
# WAF/nginx can also serve dist/ directly; this keeps the container
# self-contained without changing the compose topology.)
APP_DEBUG_LC=$(printf '%s' "${APP_DEBUG:-${DEBUG:-true}}" | tr '[:upper:]' '[:lower:]')
case "$APP_DEBUG_LC" in
    true|1|yes|t)
        echo "🚀 Starting Vite Dev Server..."
        exec npm run dev -- --host
        ;;
    *)
        echo "🧱 Building production bundle..."
        npm run build
        echo "🚀 Serving static build via vite preview..."
        exec npm run preview -- --host --port 5174
        ;;
esac
