@echo off
setlocal enabledelayedexpansion
title CriderGPT - Link PC (LAN mode)
color 0A

echo ============================================================
echo   CriderGPT - One-Click PC Link  (LAN / no tunnel)
echo   Phone + PC must be on the same Wi-Fi.
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

REM ---- detect LAN IP ----
for /f "tokens=*" %%I in ('powershell -nologo -command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual' } ^| Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' } ^| Select-Object -First 1).IPAddress"') do set "LANIP=%%I"

if "%LANIP%"=="" (
  echo Could not detect LAN IP. Run 'ipconfig' and pick the IPv4 of your Wi-Fi adapter.
  pause
  exit /b 1
)

REM ---- open firewall (idempotent) ----
netsh advfirewall firewall show rule name="CriderGPT Agent 8787" >nul 2>nul
if errorlevel 1 (
  echo Opening Windows Firewall port 8787 (requires admin if prompted)...
  netsh advfirewall firewall add rule name="CriderGPT Agent 8787" dir=in action=allow protocol=TCP localport=8787 >nul 2>nul
)

REM ---- download python agent if missing ----
set "AGENT=%USERPROFILE%\cridergpt-pc-remote.py"
if not exist "%AGENT%" (
  curl -L https://cridergpt.com/voice-engine/cridergpt-pc-remote.py -o "%AGENT%"
)

REM ---- start agent ----
start "CriderGPT Agent" cmd /k "set CRIDERGPT_AGENT_TOKEN=%TOKEN% && python ""%AGENT%"""
timeout /t 3 >nul

set "PUBURL=http://%LANIP%:8787"

echo.
echo ============================================================
echo   Agent URL: %PUBURL%
echo   Token:     %TOKEN%
echo ============================================================
echo.
echo Opening browser to auto-link your CriderGPT account...
echo (You must be signed in.)
echo.

set "LINK=https://cridergpt.com/link-pc?url=%PUBURL%^&token=%TOKEN%^&label=%COMPUTERNAME%"
start "" "%LINK%"

echo.
echo Done. Keep the Agent window open. Close it to stop remote access.
echo Note: this only works while your phone/browser is on the same Wi-Fi.
echo.
pause
endlocal
