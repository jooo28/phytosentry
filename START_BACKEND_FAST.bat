@echo off
setlocal EnableExtensions
cd /d "%~dp0backend"
title PhytoSentry AI Backend - FAST
set TF_CPP_MIN_LOG_LEVEL=2

cls
echo =====================================================
echo          PhytoSentry AI Backend - FAST START
echo =====================================================
echo.

if not exist "venv\Scripts\python.exe" (
  echo ERROR: backend virtual environment not found.
  echo Run INSTALL_ONCE.bat first.
  pause
  exit /b 1
)

if not exist "venv\.deps_installed" (
  echo ERROR: dependencies are not marked installed.
  echo Run INSTALL_ONCE.bat first.
  pause
  exit /b 1
)

if not exist "model\phytosentry_model_finetuned_best.keras" (
  echo ERROR: AI model file missing.
  pause
  exit /b 1
)

echo Starting backend without reinstalling packages...
echo API docs: http://localhost:8000/docs
echo Keep this window open.
echo.
call "venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000

echo.
echo Backend stopped.
pause
