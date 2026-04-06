@echo off
echo ============================================
echo   CriderGPT Docker Stack - Launcher
echo   AMD Ryzen 3 3200G + RX 580 (CPU mode)
echo ============================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not running!
    echo Please open Docker Desktop and wait for it to start, then run this again.
    pause
    exit /b 1
)

echo [OK] Docker is running.
echo.
echo Your PC specs: Ryzen 3 3200G / RX 580 8GB / 16GB RAM
echo Mode: CPU inference (AMD GPU not supported by PyTorch Docker)
echo.
echo Starting services:
echo   1. Voice + Music Engine  (port 5000)
echo   2. Backup Server         (port 5050)
echo   3. Watchtower            (auto-updates)
echo.
echo Building and starting all services...
echo First run downloads AI models (~4-6 GB). Be patient.
echo.

docker compose up --build -d

echo.
echo ============================================
echo   All Services Running!
echo ============================================
echo.
echo   Voice Engine:   http://localhost:5000/health
echo   Backup Server:  http://localhost:5050/health
echo   Backup List:    http://localhost:5050/backups
echo   Manual Backup:  curl -X POST http://localhost:5050/backup/now
echo.
echo Commands:
echo   Logs (voice):   docker logs -f cridergpt-voice-engine
echo   Logs (backup):  docker logs -f cridergpt-backup-server
echo   Stop all:       docker compose down
echo   Restart:        docker compose restart
echo.
pause
