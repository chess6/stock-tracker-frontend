#!/usr/bin/env bash
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.frontend.pid"
LOG_FILE="$SCRIPT_DIR/frontend.out"

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" >/dev/null 2>&1; then
    echo "Frontend is already running on PID $EXISTING_PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$SCRIPT_DIR"
nohup npm start >"$LOG_FILE" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >"$PID_FILE"
sleep 2

if kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
  echo "Frontend started on PID $FRONTEND_PID"
  echo "Log: $LOG_FILE"
else
  echo "Frontend failed to start. Check $LOG_FILE"
  rm -f "$PID_FILE"
  exit 1
fi
