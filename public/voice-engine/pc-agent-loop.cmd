@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ENVFILE=%USERPROFILE%\.cridergpt\pc.env"
if not exist "%ENVFILE%" (
  echo No PC link found. Run setup-pc-link.cmd first.
  exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in ("%ENVFILE%") do set "%%A=%%B"

title CriderGPT PC Agent (one-way)
echo Polling backend every 10s. Ctrl+C to stop.

:loop
curl -sS -X GET "%CRIDERGPT_INGEST_URL%" -H "x-pc-token: %CRIDERGPT_PC_TOKEN%" > "%TEMP%\pc-poll.json" 2>nul
type "%TEMP%\pc-poll.json"
echo.
timeout /t 10 /nobreak >nul
goto loop
