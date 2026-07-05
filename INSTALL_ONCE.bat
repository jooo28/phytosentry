@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title PhytoSentry - Install Once

cls
echo =====================================================
echo              PhytoSentry INSTALL ONCE
echo =====================================================
echo.
echo This installs backend AI dependencies one time only.
echo After this finishes, use START_FAST.bat for daily runs.
echo.

if not exist "backend\main.py" (
  echo ERROR: backend\main.py not found.
  echo Please extract the full ZIP first.
  pause
  exit /b 1
)

if not exist "backend\model\phytosentry_model_finetuned_best.keras" (
  echo ERROR: AI model is missing.
  echo Expected: backend\model\phytosentry_model_finetuned_best.keras
  pause
  exit /b 1
)

set "PYTHON_CMD="
py -3.11 --version >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py -3.11"
if "%PYTHON_CMD%"=="" (
  py -3.12 --version >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=py -3.12"
)
if "%PYTHON_CMD%"=="" (
  py -3.10 --version >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=py -3.10"
)
if "%PYTHON_CMD%"=="" (
  py -3 --version >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=py -3"
)
if "%PYTHON_CMD%"=="" (
  python --version >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=python"
)

if "%PYTHON_CMD%"=="" (
  echo ERROR: Python was not found.
  echo Install Python 3.10, 3.11, or 3.12, then run this again.
  echo Download: https://www.python.org/downloads/
  pause
  exit /b 1
)

echo Using Python: %PYTHON_CMD%
%PYTHON_CMD% --version
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\python.exe" (
  echo Creating backend virtual environment...
  %PYTHON_CMD% -m venv venv
  if errorlevel 1 (
    echo ERROR: Could not create backend virtual environment.
    pause
    exit /b 1
  )
) else (
  echo Backend virtual environment already exists.
)

echo.
echo Upgrading pip...
call "venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 (
  echo ERROR: pip upgrade failed.
  pause
  exit /b 1
)

echo.
echo Installing backend packages. First time can take 5-20 minutes...
call "venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: dependency install failed.
  echo Tip: Python 3.10/3.11 is safest for TensorFlow.
  pause
  exit /b 1
)

echo installed > "venv\.deps_installed"

echo.
echo Testing backend imports and AI model load. This may take 30-90 sec...
call "venv\Scripts\python.exe" -c "import tensorflow as tf; import fastapi; import uvicorn; import numpy as np; print('OK: TensorFlow', tf.__version__)"
if errorlevel 1 (
  echo ERROR: TensorFlow/backend import test failed.
  pause
  exit /b 1
)

echo.
echo =====================================================
echo INSTALL COMPLETE.
echo Next time just double-click: START_FAST.bat
echo =====================================================
echo.
pause
