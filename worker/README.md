# CriderGPT Local Ubuntu Worker

Hybrid architecture: **Supabase = source of truth**, this worker = local compute muscle.
The worker only makes **outbound HTTPS** to Supabase — no inbound ports, no SSH, no public exposure of your server required.

---

## How jobs flow

```
┌─────────────┐   insert    ┌──────────────┐  poll RPC   ┌───────────────┐
│  Web app /  │ ──────────► │  worker_jobs │ ◄────────── │ Ubuntu worker │
│ Edge fn     │             │  (Supabase)  │   claim     │ (this code)   │
└─────────────┘             └──────┬───────┘             └───────┬───────┘
                                   │  result/error                │
                                   └◄─────────────────────────────┘
```

### Lifecycle
| Status       | Meaning                                                   |
| ------------ | --------------------------------------------------------- |
| `pending`    | Created, waiting for a worker. `scheduled_for <= now()`   |
| `processing` | A worker has claimed it (`worker_name` + `started_at` set)|
| `complete`   | Handler returned a result; `result` populated             |
| `failed`     | Hit `max_attempts` (default 3) — `error` populated        |
| `retry` →    | Internal: bumped back to `pending` with backoff           |

Retries: exponential-ish (60s × attempt#, capped at 10 min).

---

## 1. One-time Ubuntu setup

```bash
# create unprivileged user
sudo useradd -r -m -d /opt/cridergpt-worker -s /usr/sbin/nologin cridergpt

# install code
sudo mkdir -p /opt/cridergpt-worker
sudo chown cridergpt:cridergpt /opt/cridergpt-worker
sudo -u cridergpt bash <<'EOF'
cd /opt/cridergpt-worker
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
EOF

# copy these files into /opt/cridergpt-worker/
#   worker.py
#   requirements.txt
#   .env       (copy from .env.example and fill in)
sudo cp .env.example /opt/cridergpt-worker/.env
sudo nano /opt/cridergpt-worker/.env     # paste service role key
sudo chmod 600 /opt/cridergpt-worker/.env
sudo chown cridergpt:cridergpt /opt/cridergpt-worker/.env
```

## 2. Test in foreground first

```bash
sudo -u cridergpt /opt/cridergpt-worker/venv/bin/python /opt/cridergpt-worker/worker.py
```

Insert a test job from the SQL editor:

```sql
insert into worker_jobs (type, payload, created_by)
values ('ping_test', '{"hello":"world"}'::jsonb, auth.uid());
```

You should see `⚡ Job ... | type=ping_test` then `✅ Job ... complete` in the worker log,
and the row in `worker_jobs` should now have `status='complete'` and a populated `result`.

## 3. Install as a systemd service

```bash
sudo cp cridergpt-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cridergpt-worker
sudo systemctl status cridergpt-worker
journalctl -u cridergpt-worker -f         # tail logs
```

## 4. Trigger a job from the web app

```ts
const { data, error } = await supabase.functions.invoke("create-worker-job", {
  body: { type: "echo_text", payload: { text: "hi from the app" } },
});
```

Then poll:
```ts
supabase.from("worker_jobs").select("*").eq("id", data.job.id).single();
```

---

## Adding new job types

1. Add the type to `ALLOWED_TYPES` in `supabase/functions/create-worker-job/index.ts`.
2. Add a handler in `worker.py`:

```python
def handle_ai_chat(payload):
    prompt = payload["prompt"]
    # call your local Ollama / llama.cpp / whatever
    return {"reply": "..."}

HANDLERS["ai_chat"] = handle_ai_chat
```

3. (Optional) Restrict which workers run heavy types by setting on each box:
   ```
   JOB_TYPES=ai_chat,image_generation
   ```
   Light boxes can stay on `ping_test,echo_text`.

### Future job ideas (same pipeline, no schema changes)
- **`ai_chat`** — local Ollama/llama.cpp inference; payload `{prompt, model}`
- **`image_generation`** — local SD/Comfy; result = signed Supabase Storage URL
- **`file_processing`** — payload references a Storage object; worker downloads, processes, re-uploads
- **`scheduled_job`** — set `scheduled_for` in the future for cron-like behavior. Add a tiny pg_cron entry to insert recurring rows.

---

## Assumptions made
- Service role key lives **only** on the Ubuntu box, never in the browser.
- The Ubuntu server has outbound HTTPS to `*.supabase.co`. No inbound rules required.
- Single-worker is fine to start; the `FOR UPDATE SKIP LOCKED` claim function lets you scale to N workers later with zero changes.
- Long-running jobs (>30s) should override the httpx timeout in their handler.
