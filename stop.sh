#!/usr/bin/env bash
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.frontend.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Frontend is not running"
  exit 0
fi

FRONTEND_PID="$(cat "$PID_FILE")"
if kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
  kill "$FRONTEND_PID"
  for _ in {1..10}; do
    if ! kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  if kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill -9 "$FRONTEND_PID"
  fi
  echo "Frontend stopped"
else
  echo "Frontend PID file was stale"
fi

rm -f "$PID_FILE"
