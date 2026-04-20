# 🖥️ CriderGPT Hybrid Server Setup Guide

**Your one-stop guide to turning your local Ubuntu server into the heavy-lifting muscle behind CriderGPT.**

---

## 🎯 The Big Picture (Hybrid Architecture)

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│   USER (phone / browser)    │         │   YOUR LOCAL UBUNTU SERVER   │
│                             │         │   (Intel CPU + AMD GPU)      │
│   cridergpt.lovable.app     │         │                              │
└──────────────┬──────────────┘         │   ┌────────────────────────┐ │
               │                         │   │ Ollama (AI chat)       │ │
               ▼                         │   │ SD.Next (image gen)    │ │
┌─────────────────────────────┐          │   │ XTTS (voice cloning)   │ │
│  SUPABASE (source of truth) │ ◄──poll──┤   │ Worker (Python)        │ │
│                             │          │   └────────────────────────┘ │
│  • worker_jobs queue        │ ──result─►   Storage: /opt/cridergpt/   │
│  • ai_memory                │          │   • reference photos         │
│  • Storage buckets          │          │   • voice samples            │
│  • Edge functions           │          │   • generated images         │
└─────────────────────────────┘          └──────────────────────────────┘
       (Apple-hosted cloud)                    (Your basement / office)
```

**Rule:** Supabase is always the source of truth. The server is **outbound-only** — it polls Supabase for work, does the heavy job, uploads the result back. **No inbound ports needed. No public IP needed. No SSH exposed.**

### What runs where

| Job | Where | Why |
|---|---|---|
| Light chat / UI / auth | Supabase | Cheap, fast, always-on |
| Heavy AI chat (Llama 8B) | **Server** | Free, private, no token cost |
| AI image generation | **Server** | Free, GPU-accelerated |
| Voice cloning (XTTS) | **Server** | Needs GPU |
| Voice samples / reference photos | **Server** local + Supabase Storage | Local cache for speed |
| AI training on your writing | **Server** | Needs GPU + private data |
| Database, payments, auth | Supabase | What it's good at |

---

## 📋 Prerequisites

- Ubuntu Server 22.04 or 24.04 (you have this ✅)
- Remote terminal access from your main PC (you have this ✅)
- ~16 GB RAM (you have this ✅)
- Any AMD GPU (script auto-detects)
- ~50 GB free disk for models
- Internet connection

---

## 🚀 PART 1 — One-Command Server Setup

SSH into your server, then paste this **entire block** into the terminal. It auto-detects your GPU and installs everything.

```bash
# Run as your normal user (NOT root). Will sudo when needed.
mkdir -p ~/cridergpt-setup && cd ~/cridergpt-setup
curl -fsSL https://raw.githubusercontent.com/your-repo/cridergpt/main/worker/install-server.sh -o install-server.sh
chmod +x install-server.sh
./install-server.sh
```

**Don't have the repo cloned yet?** No problem — copy the script from `worker/install-server.sh` in this project, scp it over, and run it.

---

## 📦 PART 2 — What the Install Script Does (in order)

If you'd rather run things step-by-step instead of the one-shot script, here's exactly what it does. Run each block in order.

### Step 1 — System updates + base tools

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  curl wget git python3 python3-venv python3-pip \
  build-essential ffmpeg \
  vulkan-tools mesa-vulkan-drivers \
  libgl1 libglib2.0-0 \
  htop ncdu unzip
```

### Step 2 — Detect your GPU

```bash
lspci | grep -i 'vga\|3d\|display'
vulkaninfo --summary 2>/dev/null | head -20
```

Look for your GPU model in the output. The rest of this guide assumes **Vulkan** (works on every AMD card from RX 400 series onward — no driver headaches).

### Step 3 — Install Ollama (local AI chat — the brain)

```bash
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model that fits 16 GB RAM nicely
ollama pull llama3.1:8b           # ⭐ recommended sweet spot
ollama pull qwen2.5-coder:7b      # great for code
ollama pull nomic-embed-text      # for embeddings / RAG

# Test it
ollama run llama3.1:8b "Hello, who are you?"
```

Ollama auto-installs as a systemd service on port `11434`. It'll auto-start on boot.

### Step 4 — Install SD.Next (image generation)

```bash
sudo mkdir -p /opt/sdnext
sudo chown $USER:$USER /opt/sdnext
cd /opt/sdnext
git clone https://github.com/vladmandic/automatic .

# First launch — installs everything in its own venv
./webui.sh --use-zluda --listen --port 7860 --api &
# (or --use-cpu if Vulkan gives trouble — slower but always works)

# Wait for "Running on local URL: http://0.0.0.0:7860" then Ctrl+C
```

Test from your **main PC's browser**: `http://<server-ip>:7860`

### Step 5 — Install XTTS-v2 (voice cloning that sounds like you)

```bash
sudo mkdir -p /opt/xtts
sudo chown $USER:$USER /opt/xtts
cd /opt/xtts

python3 -m venv venv
source venv/bin/activate

pip install TTS flask flask-cors torch torchaudio --index-url https://download.pytorch.org/whl/cpu
# (CPU torch works on AMD; for GPU acceleration we'll use Vulkan-capable build later)

# Pre-download the XTTS-v2 model
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"

deactivate
```

You'll add a tiny Flask wrapper later — see Part 4.

### Step 6 — Set up local storage folders

```bash
sudo mkdir -p /opt/cridergpt/{voice-samples,reference-photos,generated-images,training-data,backups}
sudo chown -R $USER:$USER /opt/cridergpt
```

This is where the worker caches your reference photos, voice samples, and generated outputs. Anything important also gets pushed to Supabase Storage so you have a cloud backup.

### Step 7 — Install the CriderGPT worker

```bash
sudo useradd -r -m -d /opt/cridergpt-worker -s /bin/bash cridergpt 2>/dev/null || true
sudo mkdir -p /opt/cridergpt-worker
sudo chown cridergpt:cridergpt /opt/cridergpt-worker

# Copy worker.py, requirements.txt, .env.example from this repo's worker/ folder
sudo -u cridergpt cp ~/cridergpt-setup/worker/{worker.py,requirements.txt} /opt/cridergpt-worker/
sudo cp ~/cridergpt-setup/worker/.env.example /opt/cridergpt-worker/.env

# Edit .env — paste your Supabase service role key
sudo nano /opt/cridergpt-worker/.env
sudo chmod 600 /opt/cridergpt-worker/.env
sudo chown cridergpt:cridergpt /opt/cridergpt-worker/.env

# Build the venv
sudo -u cridergpt bash -c '
  cd /opt/cridergpt-worker
  python3 -m venv venv
  ./venv/bin/pip install -r requirements.txt
'

# Install systemd service
sudo cp ~/cridergpt-setup/worker/cridergpt-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cridergpt-worker
sudo systemctl status cridergpt-worker
```

---

## 🔧 PART 3 — Where to find your Supabase service role key

1. Open: https://supabase.com/dashboard/project/udpldrrpebdyuiqdtqnq/settings/api
2. Scroll to **Project API keys**
3. Copy the **`service_role`** key (the long one marked "secret")
4. Paste into `/opt/cridergpt-worker/.env` as `SUPABASE_SERVICE_ROLE_KEY=...`

⚠️ **Never put this key in the browser, in git, or in any frontend code.** Server only.

---

## 🧠 PART 4 — Wiring the heavy jobs into the worker

Add these handlers to `/opt/cridergpt-worker/worker.py` (or replace the existing `HANDLERS` dict).

### Handler: AI chat via Ollama

```python
def handle_ai_chat(payload):
    """Routes chat to local Ollama instance."""
    import httpx
    model = payload.get("model", "llama3.1:8b")
    messages = payload.get("messages", [])
    r = httpx.post(
        "http://localhost:11434/api/chat",
        json={"model": model, "messages": messages, "stream": False},
        timeout=300,
    )
    r.raise_for_status()
    data = r.json()
    return {
        "reply": data["message"]["content"],
        "model": model,
        "tokens": data.get("eval_count", 0),
    }

HANDLERS["ai_chat"] = handle_ai_chat
```

### Handler: Image generation via SD.Next

```python
import base64, uuid, pathlib

def handle_image_generation(payload):
    """Generate an image with SD.Next, save locally + upload to Supabase Storage."""
    import httpx
    r = httpx.post(
        "http://localhost:7860/sdapi/v1/txt2img",
        json={
            "prompt": payload["prompt"],
            "negative_prompt": payload.get("negative_prompt", ""),
            "steps": payload.get("steps", 25),
            "width": payload.get("width", 768),
            "height": payload.get("height", 768),
            "cfg_scale": payload.get("cfg_scale", 7),
        },
        timeout=600,
    )
    r.raise_for_status()
    img_b64 = r.json()["images"][0]
    img_bytes = base64.b64decode(img_b64)

    # Save local copy
    fname = f"{uuid.uuid4()}.png"
    local_path = pathlib.Path("/opt/cridergpt/generated-images") / fname
    local_path.write_bytes(img_bytes)

    # Upload to Supabase Storage
    upload = client.post(
        f"/storage/v1/object/generated-images/{fname}",
        content=img_bytes,
        headers={**HEADERS, "Content-Type": "image/png"},
    )
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/generated-images/{fname}"
    return {"image_url": public_url, "local_path": str(local_path)}

HANDLERS["image_generation"] = handle_image_generation
```

### Handler: Voice cloning (sounds like you)

```python
def handle_voice_clone(payload):
    """Clone Jessie's voice on the given text using XTTS."""
    import httpx
    text = payload["text"]
    speaker_wav = payload.get("speaker_wav", "/opt/cridergpt/voice-samples/jessie-default.wav")
    r = httpx.post(
        "http://localhost:5002/tts",
        json={"text": text, "speaker_wav": speaker_wav, "language": "en"},
        timeout=300,
    )
    r.raise_for_status()
    audio_bytes = r.content
    fname = f"{uuid.uuid4()}.wav"
    pathlib.Path(f"/opt/cridergpt/generated-audio/{fname}").write_bytes(audio_bytes)
    upload = client.post(
        f"/storage/v1/object/generated-audio/{fname}",
        content=audio_bytes,
        headers={**HEADERS, "Content-Type": "audio/wav"},
    )
    return {"audio_url": f"{SUPABASE_URL}/storage/v1/object/public/generated-audio/{fname}"}

HANDLERS["voice_clone"] = handle_voice_clone
```

After editing, restart the worker:
```bash
sudo systemctl restart cridergpt-worker
journalctl -u cridergpt-worker -f
```

Also add the new types to `supabase/functions/create-worker-job/index.ts` `ALLOWED_TYPES`:
```ts
const ALLOWED_TYPES = new Set([
  "ping_test", "echo_text",
  "ai_chat", "image_generation", "voice_clone",
]);
```

---

## 🎓 PART 5 — Training the AI on YOUR writing

This is the magic part — make the local model sound like *you*, not like generic ChatGPT.

### Pull your writing samples from Supabase

Create `/opt/cridergpt-worker/train_from_memory.py`:

```python
"""Pulls ai_memory + ai_interactions + writing samples from Supabase
   and turns them into JSONL training data for fine-tuning."""
import os, json, httpx, pathlib

SUPABASE_URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

OUT = pathlib.Path("/opt/cridergpt/training-data/jessie-corpus.jsonl")
OUT.parent.mkdir(parents=True, exist_ok=True)

def fetch(table, select="*", limit=50000):
    r = httpx.get(f"{SUPABASE_URL}/rest/v1/{table}",
                  params={"select": select, "limit": limit}, headers=H, timeout=120)
    r.raise_for_status()
    return r.json()

with OUT.open("w") as f:
    # AI interactions = (user_input -> ai_response) pairs
    for row in fetch("ai_interactions", "user_input,ai_response"):
        if row.get("user_input") and row.get("ai_response"):
            f.write(json.dumps({
                "messages": [
                    {"role": "user", "content": row["user_input"]},
                    {"role": "assistant", "content": row["ai_response"]},
                ]
            }) + "\n")

    # AI memory = topic + details (great for style transfer)
    for row in fetch("ai_memory", "topic,details,category"):
        f.write(json.dumps({
            "messages": [
                {"role": "user", "content": f"Tell me about {row['topic']}"},
                {"role": "assistant", "content": row["details"]},
            ]
        }) + "\n")

print(f"✅ Wrote training corpus to {OUT}")
print(f"   {sum(1 for _ in OUT.open())} examples")
```

Run it whenever you want fresh training data:
```bash
cd /opt/cridergpt-worker
sudo -u cridergpt ./venv/bin/python train_from_memory.py
```

### Fine-tune Llama on your corpus (optional, advanced)

```bash
pip install unsloth datasets trl
# See: https://github.com/unslothai/unsloth#-finetune-for-free
# 30 min on a decent GPU, produces a model you can re-import into Ollama:
ollama create cridergpt-jessie -f Modelfile
```

Then your worker can use `model: "cridergpt-jessie:latest"` and you'll get *your* voice in every reply.

---

## 📸 PART 6 — Reference photos & voice samples

Your character system already stores reference photos in Supabase (`character_references` table). Sync them to the server so SD.Next can use them for img2img / IP-Adapter:

`/opt/cridergpt-worker/sync_references.py`:
```python
import os, httpx, pathlib
SUPABASE_URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

OUT = pathlib.Path("/opt/cridergpt/reference-photos")
OUT.mkdir(parents=True, exist_ok=True)

refs = httpx.get(f"{SUPABASE_URL}/rest/v1/character_references",
                 params={"select": "slug,reference_photo_url"},
                 headers=H, timeout=60).json()

for r in refs:
    url = r["reference_photo_url"]
    target = OUT / f"{r['slug']}.jpg"
    if target.exists(): continue
    target.write_bytes(httpx.get(url, timeout=60).content)
    print(f"⬇️  {r['slug']}")
print("✅ Reference photos synced")
```

Run on a cron (add to `/etc/cron.d/cridergpt-sync`):
```
*/15 * * * * cridergpt /opt/cridergpt-worker/venv/bin/python /opt/cridergpt-worker/sync_references.py
```

Drop your **voice sample WAV files** (10–30 seconds of clean audio of you speaking) into:
```
/opt/cridergpt/voice-samples/jessie-default.wav
/opt/cridergpt/voice-samples/jessie-excited.wav
/opt/cridergpt/voice-samples/jessie-narrator.wav
```

XTTS will use these to clone your voice on demand.

---

## 🔄 PART 7 — End-to-end flow (what happens when a user asks for an image)

```
1. User in browser:  "Make me an image of a cow in a field"
       │
       ▼
2. React calls edge function `create-worker-job`
       │   { type: "image_generation", payload: { prompt: "..." } }
       ▼
3. Edge function inserts a row into worker_jobs (status=pending)
       │
       ▼   (within 3 seconds)
4. Your Ubuntu server's worker polls, claims the job atomically
       │
       ▼
5. worker.py routes to handle_image_generation()
       │   → POST http://localhost:7860/sdapi/v1/txt2img
       │   → SD.Next generates on your AMD GPU (~30 sec)
       ▼
6. Worker uploads PNG to Supabase Storage bucket `generated-images`
       │
       ▼
7. Worker patches worker_jobs row: status=complete, result={image_url:"..."}
       │
       ▼
8. React (which has been polling/subscribing) sees status=complete
       │
       ▼
9. Image displays in chat. User happy. Your wallet untouched. 🎉
```

**Total cloud cost for that image: $0.** Just electricity.

---

## 🛠️ PART 8 — Useful daily commands

```bash
# Tail the worker
journalctl -u cridergpt-worker -f

# Restart everything
sudo systemctl restart cridergpt-worker
sudo systemctl restart ollama
# SD.Next needs its own service — see Part 9 below

# Check what jobs are queued
psql "$SUPABASE_DB_URL" -c "select id,type,status,attempts from worker_jobs order by created_at desc limit 20;"

# Disk usage by component
du -sh /opt/cridergpt/* /opt/sdnext/models /root/.ollama/models

# GPU utilization (during a job)
watch -n 1 'vulkaninfo --summary | head -15'

# Free up space (delete old generated images > 30 days)
find /opt/cridergpt/generated-images -mtime +30 -delete
```

---

## 🧰 PART 9 — Auto-start SD.Next & XTTS on boot

Create `/etc/systemd/system/sdnext.service`:
```ini
[Unit]
Description=SD.Next Image Generation
After=network-online.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/opt/sdnext
ExecStart=/opt/sdnext/webui.sh --use-zluda --listen --port 7860 --api --skip-update
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/xtts.service` (after you write the Flask wrapper):
```ini
[Unit]
Description=XTTS Voice Cloning Server
After=network-online.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/opt/xtts
ExecStart=/opt/xtts/venv/bin/python server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable both:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sdnext xtts
```

---

## 🛡️ PART 10 — Security checklist

- [x] Service role key only on the server (`chmod 600 .env`)
- [x] Worker runs as unprivileged `cridergpt` user
- [x] No inbound ports opened to the internet
- [x] Ollama, SD.Next, XTTS bound to `localhost` only (or your LAN)
- [x] systemd hardening (NoNewPrivileges, PrivateTmp, ProtectSystem)
- [x] Generated content uploaded to Supabase Storage = automatic offsite backup
- [ ] **You should:** set up `ufw` to block all incoming except SSH from your main PC's LAN IP

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22  # adjust to your LAN
sudo ufw enable
```

---

## 🚦 PART 11 — Roadmap (in suggested order)

1. ✅ **Now:** Get the worker running with `ping_test` (already documented in `worker/README.md`)
2. **Next:** Install Ollama + add `ai_chat` handler → free local chat
3. **Then:** Install SD.Next + add `image_generation` handler → free image gen
4. **Then:** Install XTTS + add `voice_clone` handler → your voice anywhere
5. **Then:** Run `train_from_memory.py` weekly → AI gets smarter about *you*
6. **Future:** Fine-tune Llama with Unsloth → fully personalized model
7. **Future:** Add `file_processing` handler for big PDFs / videos
8. **Future:** Add a second worker box and load-balance automatically (already supported — just point another server at the same DB)

---

## ❓ FAQ

**Q: What if my server goes offline?**
A: Jobs stay in `pending` status. When the server comes back, it picks up where it left off. The web app shows "queued" until then.

**Q: How do I add a second worker?**
A: Repeat Part 1 on another box with a different `WORKER_NAME`. The `FOR UPDATE SKIP LOCKED` claim function prevents duplicate work.

**Q: Can I run this on my main Windows PC instead?**
A: Yes — install WSL2 + Ubuntu, then follow this guide inside WSL. But a dedicated server is way better.

**Q: What about cost?**
A: Supabase free/pro tier handles auth + DB + a tiny bit of storage. Your server handles all the expensive AI compute = $0/month for inference. You only pay electricity (~$5–15/month for an always-on PC).

**Q: How do I update Ollama models?**
A: `ollama pull llama3.1:8b` again — it pulls the latest.

---

**That's it. Every heavy thing CriderGPT does can now run on your server. Supabase stays the brain, your server is the muscle. 💪**
