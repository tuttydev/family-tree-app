#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
PYTHON="${PYTHON:-python3}"
if [ ! -x "backend/.venv/bin/python" ]; then
  echo "Creating application environment..."
  "$PYTHON" -m venv backend/.venv
fi
backend/.venv/bin/python -m pip install --disable-pip-version-check -r backend/requirements.txt
backend/.venv/bin/python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 2
if command -v xdg-open >/dev/null 2>&1; then xdg-open http://127.0.0.1:8000 >/dev/null 2>&1 || true; elif command -v open >/dev/null 2>&1; then open http://127.0.0.1:8000 || true; fi
wait "$SERVER_PID"
