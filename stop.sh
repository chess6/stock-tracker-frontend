#!/usr/bin/env bash
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.frontend.pid"
PORT="${PORT:-${FRONTEND_PORT:-3000}}"

listener_pid() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1
    return
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$PORT" 2>/dev/null | awk -F'pid=' 'NR > 1 && /pid=/ { split($2, a, ","); print a[1]; exit }'
  fi
}

stop_pid() {
  local pid="$1"
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return 1
  fi
  kill "$pid"
  for _ in {1..10}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  kill -9 "$pid" 2>/dev/null || true
  return 0
}

stopped=0

if [[ -f "$PID_FILE" ]]; then
  FRONTEND_PID="$(cat "$PID_FILE")"
  if stop_pid "$FRONTEND_PID"; then
    echo "Frontend stopped (PID $FRONTEND_PID)"
    stopped=1
  else
    echo "Frontend PID file was stale"
  fi
  rm -f "$PID_FILE"
fi

LISTENER_PID="$(listener_pid || true)"
if [[ -n "${LISTENER_PID:-}" ]]; then
  if stop_pid "$LISTENER_PID"; then
    echo "Frontend stopped (port $PORT listener PID $LISTENER_PID)"
    stopped=1
  fi
fi

if [[ "$stopped" -eq 0 ]]; then
  echo "Frontend is not running"
fi
