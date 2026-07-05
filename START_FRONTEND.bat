@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title PhytoSentry Frontend

cls
echo =====================================================
echo              PhytoSentry Frontend
echo =====================================================
echo.

if not exist "frontend\dist\index.html" (
  echo ERROR: frontend\dist\index.html not found.
  echo Please extract the full ZIP first.
  pause
  exit /b 1
)

set "SERVER_PY="
if exist "backend\venv\Scripts\python.exe" set "SERVER_PY=%~dp0backend\venv\Scripts\python.exe"
if "%SERVER_PY%"=="" (
  py -3 --version >nul 2>nul
  if not errorlevel 1 set "SERVER_PY=py -3"
)
if "%SERVER_PY%"=="" (
  python --version >nul 2>nul
  if not errorlevel 1 set "SERVER_PY=python"
)

if "%SERVER_PY%"=="" (
  echo ERROR: Python was not found for frontend static server.
  echo Install Python, then run START_WEBSITE_WINDOWS.bat again.
  pause
  exit /b 1
)

cd /d "%~dp0frontend\dist"

echo Starting frontend at:
echo http://localhost:5173/
echo.
echo Keep this window open.
echo.
%SERVER_PY% -m http.server 5173 --bind 127.0.0.1

echo.
echo Frontend stopped.
pause
