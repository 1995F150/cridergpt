@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ENVFILE=%USERPROFILE%\.cridergpt\pc.env"
if not exist "%ENVFILE%" (
  echo No PC link found. Run setup-pc-link.cmd first.
  exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in ("%ENVFILE%") do set "%%A=%%B"

set "ETYPE=%~1"
set "MSG=%~2"
if "%ETYPE%"=="" set "ETYPE=log"
if "%MSG%"=="" set "MSG=ping"

curl -sS -X POST "%CRIDERGPT_INGEST_URL%" ^
  -H "x-pc-token: %CRIDERGPT_PC_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"event_type\":\"%ETYPE%\",\"source_label\":\"%CRIDERGPT_PC_LABEL%\",\"payload\":{\"message\":\"%MSG%\"}}"
echo.
