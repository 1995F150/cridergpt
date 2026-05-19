@echo off
setlocal EnableExtensions EnableDelayedExpansion
title CriderGPT PC Link Setup

set "ENVDIR=%USERPROFILE%\.cridergpt"
set "ENVFILE=%ENVDIR%\pc.env"
set "SUPA_URL=https://udpldrrpebdyuiqdtqnq.supabase.co"
set "ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc"

if not exist "%ENVDIR%" mkdir "%ENVDIR%"

if exist "%ENVFILE%" (
  echo Existing token found at %ENVFILE%
  echo If you want a fresh one, delete that file and re-run.
  goto :test
)

echo.
echo === CriderGPT PC Link =================================
echo  This will mint a one-way push token tied to YOUR account.
echo  Open this URL in your browser, sign in, copy the JWT it shows,
echo  and paste it back here:
echo.
echo    https://cridergpt.com/link-pc-token
echo.
set /p JWT=Paste your access token: 

if "%JWT%"=="" (
  echo No token entered. Aborting.
  pause & exit /b 1
)

set "LABEL=%COMPUTERNAME%"
echo Minting token for label: %LABEL% ...

curl -sS -X POST "%SUPA_URL%/functions/v1/mint-pc-token" ^
  -H "Authorization: Bearer %JWT%" ^
  -H "apikey: %ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"label\":\"%LABEL%\"}" > "%TEMP%\pc-mint.json"

for /f "usebackq tokens=2 delims=:," %%A in (`findstr /c:"\"token\"" "%TEMP%\pc-mint.json"`) do (
  set "RAW=%%A"
  set "RAW=!RAW:"=!"
  set "RAW=!RAW: =!"
  set "PC_TOKEN=!RAW!"
)

if "%PC_TOKEN%"=="" (
  echo.
  echo Failed to mint token. Response:
  type "%TEMP%\pc-mint.json"
  pause & exit /b 1
)

(
  echo CRIDERGPT_INGEST_URL=%SUPA_URL%/functions/v1/pc-ingest
  echo CRIDERGPT_PC_TOKEN=%PC_TOKEN%
  echo CRIDERGPT_PC_LABEL=%LABEL%
) > "%ENVFILE%"

attrib +h "%ENVFILE%" >nul 2>&1
echo.
echo Saved to %ENVFILE%
del "%TEMP%\pc-mint.json" >nul 2>&1

:test
for /f "usebackq tokens=1,* delims==" %%A in ("%ENVFILE%") do set "%%A=%%B"

echo.
echo Sending hello event to backend...
curl -sS -X POST "%CRIDERGPT_INGEST_URL%" ^
  -H "x-pc-token: %CRIDERGPT_PC_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"event_type\":\"hello\",\"source_label\":\"%CRIDERGPT_PC_LABEL%\",\"payload\":{\"os\":\"windows\"}}"

echo.
echo.
echo Done. Use push-event.cmd "type" "message" anytime to send data up.
pause
