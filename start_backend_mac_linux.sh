#!/usr/bin/env bash
cd "$(dirname "$0")/backend"
PYTHON_BIN="python3"
if command -v python3.12 >/dev/null 2>&1; then
  PYTHON_BIN="python3.12"
fi
if [ ! -d "venv" ]; then
  "$PYTHON_BIN" -m venv venv
fi
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
