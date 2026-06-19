#!/usr/bin/env bash
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.build-serve.pid"
LOG_FILE="$SCRIPT_DIR/build-serve.out"
PORT="${PORT:-${BUILD_PORT:-${SERVE_PORT:-3001}}}"
PREVIEW_HOST="${PREVIEW_HOST:-0.0.0.0}"
BUILD_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --build-only | --no-serve)
      BUILD_ONLY=1
      ;;
  esac
done

listener_pid() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1
    return
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$PORT" 2>/dev/null | awk -F'pid=' 'NR > 1 && /pid=/ { split($2, a, ","); print a[1]; exit }'
  fi
}

app_url() {
  echo "http://127.0.0.1:${PORT}"
}

stop_preview_listener() {
  local pid=""
  pid="$(listener_pid || true)"
  if [[ -n "${pid:-}" ]]; then
    echo "Stopping existing preview on port $PORT (PID $pid)..."
    kill "$pid" 2>/dev/null || true
    for _ in {1..10}; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$PID_FILE"
}

cd "$SCRIPT_DIR"

# Stale babel/eslint cache can report phantom JSX parse errors after file edits.
if [[ -d node_modules/.cache ]]; then
  echo "Clearing webpack cache..."
  rm -rf node_modules/.cache
fi

echo "Running production build (npm run build)..."
npm run build

echo ""
echo "Build output: $SCRIPT_DIR/build"

if [[ "$BUILD_ONLY" -eq 1 ]]; then
  echo ""
  echo "Preview the build:"
  echo "  PREVIEW_HOST=0.0.0.0 node scripts/preview-server.js"
  echo ""
  echo "Open: $(app_url)"
  echo "API: proxied to http://127.0.0.1:5000 — start backend with ../stock_tracker_backend/start.sh"
  exit 0
fi

stop_preview_listener

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" >/dev/null 2>&1; then
    echo ""
    echo "Production preview is already running (PID $EXISTING_PID)"
    echo "Open: $(app_url)"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

RUNNING_PID="$(listener_pid || true)"
if [[ -n "${RUNNING_PID:-}" ]]; then
  stop_preview_listener
fi

nohup env PORT="$PORT" PREVIEW_HOST="$PREVIEW_HOST" node scripts/preview-server.js >"$LOG_FILE" 2>&1 &
SERVE_PID=$!
echo "$SERVE_PID" >"$PID_FILE"
sleep 2

if kill -0 "$SERVE_PID" >/dev/null 2>&1; then
  echo ""
  echo "Production preview started (PID $SERVE_PID)"
  echo "Open: $(app_url)"
  echo "Log: $LOG_FILE"
  echo "Stop: kill $SERVE_PID  (or free port $PORT and remove $PID_FILE)"
  echo "API: proxied to http://127.0.0.1:5000 — start backend with ../stock_tracker_backend/start.sh"
  exit 0
fi

RUNNING_PID="$(listener_pid || true)"
if [[ -n "${RUNNING_PID:-}" ]]; then
  echo "$RUNNING_PID" >"$PID_FILE"
  echo ""
  echo "Production preview is running on port $PORT (PID $RUNNING_PID)"
  echo "Open: $(app_url)"
  exit 0
fi

if grep -qiE 'EADDRINUSE|already in use' "$LOG_FILE" 2>/dev/null; then
  echo "Production preview failed: port $PORT is already in use."
elif grep -qiE 'error|failed' "$LOG_FILE" 2>/dev/null; then
  echo "Production preview failed. Check $LOG_FILE"
  tail -20 "$LOG_FILE" 2>/dev/null || true
else
  echo "Production preview failed. Check $LOG_FILE"
fi
rm -f "$PID_FILE"
exit 1
