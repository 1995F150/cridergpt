@echo off
setlocal enabledelayedexpansion
title CriderGPT Full System Installer
color 0A

echo ============================================================
echo   CriderGPT - Full System Installer
echo   Jessie Crider / 1995F150
echo ============================================================
echo.
echo This will install EVERYTHING needed to run CriderGPT locally:
echo   - Node.js check  (web app + Electron desktop)
echo   - Python check   (voice engine, MCP, scanners)
echo   - Docker check   (self-hosted backend stack)
echo   - Git clone of the CriderGPT repo
echo   - npm install + production build
echo   - Capacitor Android sync (optional)
echo   - Electron desktop packaging (optional)
echo   - Docker voice/backup/watchtower stack (optional)
echo   - Local MCP / PC automation agent (optional)
echo.
pause

REM ---------- 0. Working folder ----------
set "ROOT=%USERPROFILE%\CriderGPT"
echo.
echo [0/9] Install root: %ROOT%
if not exist "%ROOT%" mkdir "%ROOT%"
cd /d "%ROOT%"

REM ---------- 1. Prereq checks ----------
echo.
echo [1/9] Checking prerequisites...
where git >nul 2>nul || (echo   [MISSING] Git  - https://git-scm.com/download/win && set MISS=1)
where node >nul 2>nul || (echo   [MISSING] Node - https://nodejs.org/  ^(LTS^) && set MISS=1)
where npm  >nul 2>nul || (echo   [MISSING] npm  - comes with Node && set MISS=1)
where python >nul 2>nul || (echo   [WARN]    Python not found  - needed for voice engine / MCP)
where docker >nul 2>nul || (echo   [WARN]    Docker not found  - needed for self-hosted backend)
if defined MISS (
  echo.
  echo Install the [MISSING] items above, then re-run this script.
  pause
  exit /b 1
)
echo   OK.

REM ---------- 2. Clone repo ----------
echo.
echo [2/9] Cloning CriderGPT source...
if exist "%ROOT%\cridergpt\.git" (
  echo   Repo already present - pulling latest.
  cd cridergpt
  git pull origin main
) else (
  git clone https://github.com/1995F150/cridergpt.git
  cd cridergpt
)

REM ---------- 3. npm install ----------
echo.
echo [3/9] Installing npm dependencies (this can take a few minutes)...
call npm install
if errorlevel 1 ( echo npm install FAILED. & pause & exit /b 1 )

REM ---------- 4. Build web app ----------
echo.
echo [4/9] Building production web bundle...
call npm run build
if errorlevel 1 ( echo Build FAILED. & pause & exit /b 1 )

REM ---------- 5. Capacitor / Android (optional) ----------
echo.
choice /C YN /M "[5/9] Sync Android (Capacitor) project now"
if errorlevel 2 goto SKIP_ANDROID
  call npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/app @codetrix-studio/capacitor-google-auth
  if not exist android (call npx cap add android)
  call npx cap sync android
:SKIP_ANDROID

REM ---------- 6. Electron desktop (optional) ----------
echo.
choice /C YN /M "[6/9] Package CriderGPT as a Windows desktop app (Electron)"
if errorlevel 2 goto SKIP_ELECTRON
  call npm install --save-dev electron @electron/packager
  call npx @electron/packager . "CriderGPT" --platform=win32 --arch=x64 --out=electron-release --overwrite --ignore="^/src" --ignore="^/public" --ignore="^/electron-release"
  echo   Desktop build  -^>  %CD%\electron-release\CriderGPT-win32-x64\CriderGPT.exe
:SKIP_ELECTRON

REM ---------- 7. Docker stack (optional) ----------
echo.
choice /C YN /M "[7/9] Start self-hosted Docker stack (voice + backup + watchtower)"
if errorlevel 2 goto SKIP_DOCKER
  docker info >nul 2>nul
  if errorlevel 1 (
    echo   Docker Desktop is not running. Start it, then re-run this section.
  ) else (
    pushd public\voice-engine
    docker compose up --build -d
    popd
    echo   Voice engine:  http://localhost:5000/health
    echo   Backup server: http://localhost:5050/health
  )
:SKIP_DOCKER

REM ---------- 8. Local PC MCP agent (optional) ----------
echo.
choice /C YN /M "[8/9] Install local PC automation agent (Python MCP)"
if errorlevel 2 goto SKIP_MCP
  where python >nul 2>nul
  if errorlevel 1 (
    echo   Python missing - skipping.
  ) else (
    python -m pip install --upgrade pip
    python -m pip install flask flask-cors requests httpx
    echo   Launch with:  python public\voice-engine\cridergpt-pc-mcp.py
  )
:SKIP_MCP

REM ---------- 9. Done ----------
echo.
echo [9/9] DONE.
echo ============================================================
echo   CriderGPT installed at: %CD%
echo.
echo   Dev server:     npm run dev          (http://localhost:5173)
echo   Prod preview:   npm run preview
echo   Android open:   npx cap open android
echo   Desktop app:    electron-release\CriderGPT-win32-x64\CriderGPT.exe
echo   Docker stack:   cd public\voice-engine ^&^& docker compose ps
echo   Live site:      https://cridergpt.com
echo ============================================================
echo.
pause
endlocal
