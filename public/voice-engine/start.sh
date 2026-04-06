#!/bin/bash
echo "============================================"
echo "  CriderGPT Docker Stack - Launcher"
echo "  AMD Ryzen 3 3200G + RX 580 (CPU mode)"
echo "============================================"
echo ""

if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Docker is not running. Start Docker first."
    exit 1
fi

echo "[OK] Docker is running."
echo ""
echo "PC: Ryzen 3 3200G / RX 580 8GB / 16GB RAM"
echo "Mode: CPU inference (AMD GPU not supported by PyTorch Docker)"
echo ""
echo "Starting: Voice Engine (5000) + Backup Server (5050) + Watchtower"
echo ""

docker compose up --build -d

echo ""
echo "============================================"
echo "  All Services Running!"
echo "============================================"
echo ""
echo "  Voice Engine:  http://localhost:5000/health"
echo "  Backup Server: http://localhost:5050/health"
echo "  Manual Backup: curl -X POST http://localhost:5050/backup/now"
echo ""
echo "  Logs:  docker logs -f cridergpt-voice-engine"
echo "  Stop:  docker compose down"
