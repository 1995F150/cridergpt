# CriderGPT Voice & Music Engine — Docker Deployment Guide

## What This Runs

Your self-hosted AI engine with:
- **Voice Cloning (XTTS-v2)** — TTS in Jessie's voice from a 6-second sample
- **Music Generation (MusicGen)** — AI-generated songs, beats, instrumentals
- **Stem Separation (Demucs)** — split songs into vocals/drums/bass/other for covers
- **Hum-to-Song** — turn humming into polished tracks

---

## Requirements

| Requirement | Details |
|-------------|---------|
| **OS** | Windows 10/11, Linux, or macOS |
| **Docker Desktop** | [Download here](https://www.docker.com/products/docker-desktop/) |
| **NVIDIA GPU** | 8GB+ VRAM (your GPU works fine for personal/small use) |
| **NVIDIA Drivers** | Latest from [nvidia.com](https://www.nvidia.com/drivers) |
| **NVIDIA Container Toolkit** | [Install guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) |
| **Disk Space** | ~15 GB for Docker image + AI models |

---

## Quick Start

### Windows
```cmd
cd public/voice-engine
start.bat
```

### Linux/Mac
```bash
cd public/voice-engine
chmod +x start.sh
./start.sh
```

### Manual (any OS)
```bash
cd public/voice-engine
docker compose up --build -d
```

---

## First Run

On first launch, Docker will:
1. Build the container (~5 min)
2. Download AI models on first request (~4-6 GB total):
   - XTTS-v2 (~1.8 GB)
   - MusicGen-small (~1.5 GB)
   - Demucs (~800 MB)

Models are cached in Docker volumes — they only download once.

---

## Connecting to CriderGPT

1. Go to your **Supabase Dashboard → Edge Function Secrets**
2. Set `VOICE_ENGINE_URL` to:
   - Local: `http://localhost:5000`
   - Remote server: `http://YOUR_SERVER_IP:5000`

That's it. The app will route all voice/music requests through this URL.

---

## Verify It's Working

```bash
# Health check
curl http://localhost:5000/health

# Should return:
# {"status": "healthy", "models": {...}, "gpu_available": true}
```

---

## Commands

| Action | Command |
|--------|---------|
| Start | `docker compose up -d` |
| Stop | `docker compose down` |
| View logs | `docker logs -f cridergpt-voice-engine` |
| Restart | `docker compose restart` |
| Rebuild | `docker compose up --build -d` |
| Check GPU | `docker exec cridergpt-voice-engine nvidia-smi` |

---

## Scaling Notes (100+ Users)

Your 8GB GPU handles 1-3 concurrent requests well. For heavier load:

| Option | Cost | Setup |
|--------|------|-------|
| **Queue requests** | Free | Already built in — requests queue when GPU is busy |
| **RunPod Serverless** | ~$0.0002/sec | Pay-per-use, auto-scales, no idle cost |
| **Vast.ai** | ~$0.20/hr | Rent a 24GB GPU, run same Docker image |
| **Lambda Labs** | ~$0.50/hr | Enterprise-grade A100 GPUs |

To switch to cloud: just change `VOICE_ENGINE_URL` in Supabase secrets to point at the cloud server instead of localhost.

---

## Troubleshooting

**"NVIDIA GPU not detected"**
- Install/update NVIDIA drivers
- Install NVIDIA Container Toolkit
- Restart Docker Desktop
- Windows: Enable WSL2 GPU support in Docker Desktop settings

**"Out of memory"**
- MusicGen-small uses ~4GB VRAM, XTTS uses ~2GB
- Close other GPU apps (games, etc.) before generating
- Models load on first use and stay in memory

**"Connection refused" from the app**
- Make sure Docker container is running: `docker ps`
- Check the port isn't blocked by firewall
- Verify `VOICE_ENGINE_URL` matches your setup
