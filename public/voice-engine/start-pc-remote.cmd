@echo off
setlocal enabledelayedexpansion
title CriderGPT - Auto Link PC
color 0A

echo ============================================================
echo   CriderGPT - One-Click PC Link
echo   No secrets to copy. No Supabase dashboard. Just go.
echo ============================================================
echo.

REM ---- token ----
if "%CRIDERGPT_AGENT_TOKEN%"=="" (
  for /f %%i in ('powershell -nologo -command "[guid]::NewGuid().ToString('N')"') do set CRIDERGPT_AGENT_TOKEN=%%i
)
set TOKEN=%CRIDERGPT_AGENT_TOKEN%

REM ---- deps ----
where python >nul 2>nul || ( echo Install Python first: https://python.org & pause & exit /b 1 )
python -m pip install --quiet --upgrade pip
python -m pip install --quiet flask flask-cors pyautogui pillow

REM ---- cloudflared check ----
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo Downloading cloudflared...
  powershell -nologo -command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%USERPROFILE%\cloudflared.exe'"
  set "PATH=%USERPROFILE%;%PATH%"
)

REM ---- download python agent if missing ----
set "AGENT=%USERPROFILE%\cridergpt-pc-remote.py"
if not exist "%AGENT%" (
  curl -L https://cridergpt.com/voice-engine/cridergpt-pc-remote.py -o "%AGENT%"
)

REM ---- start agent ----
start "CriderGPT Agent" cmd /k "set CRIDERGPT_AGENT_TOKEN=%TOKEN% && python ""%AGENT%"""
timeout /t 3 >nul

REM ---- start tunnel + capture URL ----
echo Starting Cloudflare tunnel and capturing public URL...
set "TUNNEL_LOG=%TEMP%\cridergpt-tunnel.log"
del "%TUNNEL_LOG%" 2>nul
start "CriderGPT Tunnel" cmd /k "cloudflared tunnel --url http://localhost:8787 --logfile ""%TUNNEL_LOG%"""

echo Waiting for public URL...
set "PUBURL="
for /l %%i in (1,1,30) do (
  timeout /t 1 >nul
  for /f "tokens=*" %%U in ('findstr /R /C:"https://[a-z0-9-]*\.trycloudflare\.com" "%TUNNEL_LOG%" 2^>nul') do (
    for /f "tokens=2 delims= " %%T in ("%%U") do set "PUBURL=%%T"
  )
  if defined PUBURL goto :got_url
)
:got_url

if not defined PUBURL (
  echo Could not detect tunnel URL automatically. Check the Tunnel window for the https://...trycloudflare.com URL.
  pause
  exit /b 1
)

REM strip trailing | or extra junk
for /f "tokens=1" %%X in ("%PUBURL%") do set "PUBURL=%%X"

echo.
echo ============================================================
echo   Tunnel URL: %PUBURL%
echo   Token:      %TOKEN%
echo ============================================================
echo.
echo Opening browser to auto-save this to your CriderGPT account...
echo (You must be signed in.)
echo.

set "LINK=https://cridergpt.com/link-pc?url=%PUBURL%^&token=%TOKEN%^&label=%COMPUTERNAME%"
start "" "%LINK%"

echo.
echo Done. Keep the Agent and Tunnel windows open. Close them to stop remote access.
echo.
pause
endlocal
