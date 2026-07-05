@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title PhytoSentry AI - One Click Launcher

cls
echo =====================================================
echo        PhytoSentry AI - One Click Windows Launcher
echo =====================================================
echo.
echo This will start BOTH:
echo   1. AI Backend  - http://localhost:8000
echo   2. Website     - http://localhost:5173
echo.
echo IMPORTANT: First run can take 5-20 minutes because TensorFlow installs once.
echo Do not scan until this launcher says BACKEND IS READY.
echo.

if not exist "backend\main.py" (
  echo ERROR: backend\main.py not found.
  echo Please extract the full ZIP first, then run this BAT again.
  pause
  exit /b 1
)

if not exist "frontend\dist\index.html" (
  echo ERROR: frontend\dist\index.html not found.
  echo This ZIP should include the prebuilt frontend.
  pause
  exit /b 1
)

echo Starting backend in a separate window...
start "PhytoSentry AI Backend - Keep Open" cmd /k ""%~dp0START_BACKEND.bat""

echo.
echo Waiting until backend is actually ready on port 8000...
echo This may take a long time on first run.
echo.

set /a tries=0
:WAIT_BACKEND
set /a tries+=1
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto BACKEND_READY

if %tries% GEQ 180 goto BACKEND_TIMEOUT

echo Backend not ready yet... waiting 5 sec. Attempt %tries%/180
timeout /t 5 /nobreak >nul
goto WAIT_BACKEND

:BACKEND_READY
echo.
echo =====================================================
echo BACKEND IS READY: http://localhost:8000/api/health
echo =====================================================
echo.

echo Starting frontend in a separate window...
start "PhytoSentry Frontend - Keep Open" cmd /k ""%~dp0START_FRONTEND.bat""

echo Waiting for frontend static server...
timeout /t 3 /nobreak >nul

start "" "http://localhost:5173/"

echo.
echo =====================================================
echo Website opened: http://localhost:5173/
echo Backend API:     http://localhost:8000/docs
echo =====================================================
echo.
echo Keep the Backend and Frontend terminal windows open.
echo Now you can scan leaf images.
echo.
pause
exit /b 0

:BACKEND_TIMEOUT
echo.
echo =====================================================
echo ERROR: Backend did not become ready.
echo =====================================================
echo.
echo Check the separate Backend window for the real error.
echo Common fixes:
echo   1. Install Python 3.10 / 3.11 / 3.12
echo   2. Run as extracted folder, not inside WinRAR preview
echo   3. Allow Windows Firewall if asked
echo   4. Keep internet on for first TensorFlow install
echo.
echo Also try opening: http://localhost:8000/docs
echo.
pause
exit /b 1
