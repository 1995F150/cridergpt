@echo off
echo ============================================
echo   CriderGPT Voice Engine - Docker Launcher
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

REM Check for NVIDIA GPU support
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo [WARNING] NVIDIA GPU not detected in Docker.
    echo Make sure you have:
    echo   1. NVIDIA drivers installed
    echo   2. NVIDIA Container Toolkit installed
    echo   3. Docker Desktop GPU support enabled
    echo.
    echo Falling back to CPU mode (will be slower)...
    set USE_CPU=1
) else (
    echo [OK] NVIDIA GPU detected.
    set USE_CPU=0
)

echo.
echo Building and starting the voice engine...
echo This will download AI models on first run (~4-6 GB).
echo.

if "%USE_CPU%"=="1" (
    docker compose up --build -d
    echo [NOTE] Running in CPU mode - generation will be slower.
) else (
    docker compose up --build -d
)

echo.
echo ============================================
echo   Voice Engine is starting on port 5000
echo   Health check: http://localhost:5000/health
echo ============================================
echo.
echo To view logs:    docker logs -f cridergpt-voice-engine
echo To stop:         docker compose down
echo To restart:      docker compose restart
echo.
pause
