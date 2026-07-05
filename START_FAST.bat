@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title PhytoSentry - FAST START

cls
echo =====================================================
echo              PhytoSentry FAST START
echo =====================================================
echo.
echo This does NOT reinstall TensorFlow/packages.
echo Use this after INSTALL_ONCE.bat has completed successfully.
echo.

if not exist "backend\venv\Scripts\python.exe" (
  echo ERROR: backend setup not found.
  echo Please run INSTALL_ONCE.bat first.
  pause
  exit /b 1
)
if not exist "backend\venv\.deps_installed" (
  echo ERROR: dependencies not installed.
  echo Please run INSTALL_ONCE.bat first.
  pause
  exit /b 1
)

start "PhytoSentry AI Backend - FAST - Keep Open" cmd /k ""%~dp0START_BACKEND_FAST.bat""

echo Waiting for backend AI model to load...
set /a tries=0
:WAIT_BACKEND
set /a tries+=1
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto BACKEND_READY
if %tries% GEQ 120 goto BACKEND_TIMEOUT
echo Backend loading... wait 3 sec. Attempt %tries%/120
timeout /t 3 /nobreak >nul
goto WAIT_BACKEND

:BACKEND_READY
echo.
echo BACKEND READY.
echo Starting frontend...
start "PhytoSentry Frontend - FAST - Keep Open" cmd /k ""%~dp0START_FRONTEND_FAST.bat""
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173/"

echo.
echo =====================================================
echo Website: http://localhost:5173/
echo Backend: http://localhost:8000/docs
echo =====================================================
echo Keep both terminal windows open.
echo.
pause
exit /b 0

:BACKEND_TIMEOUT
echo.
echo ERROR: Backend did not become ready.
echo Check the Backend FAST window for error details.
echo If this is the first time, run INSTALL_ONCE.bat.
echo.
pause
exit /b 1
