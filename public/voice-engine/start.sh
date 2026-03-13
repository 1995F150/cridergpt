#!/bin/bash
echo "============================================"
echo "  CriderGPT Voice Engine - Docker Launcher"
echo "============================================"
echo ""

# Check Docker
if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Docker is not running. Start Docker first."
    exit 1
fi
echo "[OK] Docker is running."

# Check NVIDIA GPU
if docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi >/dev/null 2>&1; then
    echo "[OK] NVIDIA GPU detected."
else
    echo "[WARNING] No GPU detected - falling back to CPU (slower)."
fi

echo ""
echo "Building and starting voice engine..."
echo "First run downloads ~4-6 GB of AI models."
echo ""

docker compose up --build -d

echo ""
echo "============================================"
echo "  Voice Engine running on port 5000"
echo "  Health check: http://localhost:5000/health"
echo "============================================"
echo ""
echo "Logs:    docker logs -f cridergpt-voice-engine"
echo "Stop:    docker compose down"
echo "Restart: docker compose restart"
