# CriderGPT Docker Stack — Deployment Guide

## Your PC Build

| Component | Spec |
|-----------|------|
| **CPU** | AMD Ryzen 3 3200G (4C/4T) |
| **GPU** | XFX Radeon RX 580 8GB GDDR5 |
| **RAM** | 16GB |
| **Motherboard** | ASRock A560M-HDV |
| **Storage** | 1TB HDD (SATA) |
| **PSU** | 500W |
| **Network** | PCIe Wi-Fi + Bluetooth |

> **Note:** PyTorch does not support AMD GPUs via Docker on Windows, so the AI engine runs in **CPU mode**. It's slower than NVIDIA CUDA but still functional for personal use. Your Ryzen 3 handles 1 request at a time comfortably.

---

## What Docker Runs

### 1. Voice & Music Engine (Port 5000)
- **Voice Cloning (XTTS-v2)** — TTS in Jessie's voice from a 6-second sample
- **Music Generation (MusicGen)** — AI-generated songs, beats, instrumentals
- **Stem Separation (Demucs)** — split songs into vocals/drums/bass/other
- **Hum-to-Song** — turn humming into polished tracks

### 2. Backup Server (Port 5050)
- **Automatic backups** of your entire Supabase database every 6 hours
- **Manual backup** trigger via API
- **Local storage** — all backups saved to Docker volume on your 1TB HDD
- Tables backed up: profiles, ai_usage, ai_memory, chat_messages, events, livestock, orders, and more

### 3. Watchtower (Auto-Updates)
- Monitors your containers and auto-rebuilds when you update code
- Checks once per day

---

## Requirements

| Requirement | Details |
|-------------|---------|
| **OS** | Windows 10/11 |
| **Docker Desktop** | [Download here](https://www.docker.com/products/docker-desktop/) |
| **Disk Space** | ~15 GB for Docker image + AI models |

No NVIDIA GPU or special drivers needed — runs on CPU.

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

### Manual
```bash
cd public/voice-engine
docker compose up --build -d
```

---

## First Run

On first launch, Docker will:
1. Build the containers (~5-8 min)
2. Download AI models on first request (~4-6 GB total):
   - XTTS-v2 (~1.8 GB)
   - MusicGen-small (~1.5 GB)
   - Demucs (~800 MB)
   - Whisper-base (~150 MB)

Models are cached in Docker volumes — they only download once.

---

## Connecting to CriderGPT

### Voice Engine
1. Go to **Supabase Dashboard → Edge Function Secrets**
2. Set `VOICE_ENGINE_URL` to `http://localhost:5000`

### Backup Server
1. Set `SUPABASE_SERVICE_KEY` in a `.env` file in the `public/voice-engine/` folder:
   ```
   SUPABASE_URL=https://udpldrrpebdyuiqdtqnq.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   ```
2. Get your service role key from **Supabase Dashboard → Settings → API → service_role**

---

## Verify It's Working

```bash
# Voice engine health
curl http://localhost:5000/health

# Backup server health
curl http://localhost:5050/health

# List backups
curl http://localhost:5050/backups

# Trigger manual backup
curl -X POST http://localhost:5050/backup/now
```

---

## Commands

| Action | Command |
|--------|---------|
| Start all | `docker compose up -d` |
| Stop all | `docker compose down` |
| Voice logs | `docker logs -f cridergpt-voice-engine` |
| Backup logs | `docker logs -f cridergpt-backup-server` |
| Restart | `docker compose restart` |
| Rebuild | `docker compose up --build -d` |
| Manual backup | `curl -X POST http://localhost:5050/backup/now` |

---

## Performance Notes (Your Build)

| Task | Estimated Time (CPU) |
|------|---------------------|
| TTS (1 sentence) | ~5-10 seconds |
| Music (15 sec clip) | ~30-60 seconds |
| Beat generation | ~30-60 seconds |
| Stem separation | ~2-3 minutes |
| Hum-to-song | ~45-90 seconds |

CPU mode is slower than GPU but totally usable for personal/small use. Your 16GB RAM is enough to load all models.

---

## Troubleshooting

**"Out of memory"**
- Your 16GB RAM is enough, but close Chrome tabs and heavy apps while generating
- Models load on first use and stay in memory (~6-8 GB total)

**"Connection refused" from the app**
- Make sure Docker container is running: `docker ps`
- Check port isn't blocked by firewall
- Verify `VOICE_ENGINE_URL` matches your setup

**Slow generation?**
- Expected on CPU — see performance table above
- Your Ryzen 3 3200G handles it but won't be instant like a GPU
- Consider a future NVIDIA GPU upgrade (RTX 3060 12GB = ~$250) for 5-10x speedup

**Backup server says "no service key"**
- Add `SUPABASE_SERVICE_KEY` to your `.env` file in `public/voice-engine/`
