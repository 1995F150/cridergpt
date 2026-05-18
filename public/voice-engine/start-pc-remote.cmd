@echo off
setlocal
title CriderGPT PC Remote Agent
color 0A

REM ---- token ----
if "%CRIDERGPT_AGENT_TOKEN%"=="" (
  echo No CRIDERGPT_AGENT_TOKEN set.  Generating one...
  for /f %%i in ('powershell -nologo -command "[guid]::NewGuid().ToString('N')"') do set CRIDERGPT_AGENT_TOKEN=%%i
  echo.
  echo === SAVE THIS TOKEN ===
  echo %CRIDERGPT_AGENT_TOKEN%
  echo =======================
  echo Paste it into Supabase secret: HOME_SERVER_AGENT_TOKEN
  echo.
)

REM ---- deps ----
where python >nul 2>nul || ( echo Install Python first. & pause & exit /b 1 )
python -m pip install --quiet --upgrade pip
python -m pip install --quiet flask flask-cors pyautogui pillow

REM ---- cloudflared (optional auto-download) ----
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared not found.  Download:  https://github.com/cloudflare/cloudflared/releases/latest
  echo Then re-run this script.  Skipping tunnel for now - agent will only be reachable on localhost.
  set NO_TUNNEL=1
)

REM ---- start agent ----
start "CriderGPT Agent" cmd /k python "%~dp0cridergpt-pc-remote.py"

REM ---- start tunnel ----
if not defined NO_TUNNEL (
  timeout /t 2 >nul
  echo Starting Cloudflare quick tunnel...
  echo Copy the https://...trycloudflare.com URL it prints and paste into Supabase secret HOME_SERVER_AGENT_URL.
  start "CriderGPT Tunnel" cmd /k cloudflared tunnel --url http://localhost:8787
)

echo.
echo CriderGPT remote PC access is RUNNING.
echo   - Agent:  http://localhost:8787/health
echo   - Token:  %CRIDERGPT_AGENT_TOKEN%
echo Close the two opened windows to stop.
pause
endlocal
