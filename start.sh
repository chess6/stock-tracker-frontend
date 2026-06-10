#!/usr/bin/env bash
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.frontend.pid"
LOG_FILE="$SCRIPT_DIR/frontend.out"
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

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" >/dev/null 2>&1; then
    echo "Frontend is already running on PID $EXISTING_PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

RUNNING_PID="$(listener_pid || true)"
if [[ -n "${RUNNING_PID:-}" ]]; then
  echo "$RUNNING_PID" >"$PID_FILE"
  echo "Frontend is already running on port $PORT (PID $RUNNING_PID)"
  exit 0
fi

cd "$SCRIPT_DIR"
nohup npm start >"$LOG_FILE" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >"$PID_FILE"
sleep 3

if kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
  echo "Frontend started on PID $FRONTEND_PID"
  echo "Log: $LOG_FILE"
  exit 0
fi

RUNNING_PID="$(listener_pid || true)"
if [[ -n "${RUNNING_PID:-}" ]]; then
  echo "$RUNNING_PID" >"$PID_FILE"
  echo "Frontend is running on port $PORT (PID $RUNNING_PID)"
  exit 0
fi

if grep -q "already running on port" "$LOG_FILE" 2>/dev/null; then
  echo "Frontend failed: port $PORT is already in use."
  echo "Run ./stop.sh first, or stop the process using that port."
elif grep -qiE 'error|failed|cannot' "$LOG_FILE" 2>/dev/null; then
  echo "Frontend failed to start. Check $LOG_FILE"
  tail -20 "$LOG_FILE" 2>/dev/null || true
else
  echo "Frontend failed to start. Check $LOG_FILE"
fi
rm -f "$PID_FILE"
exit 1
