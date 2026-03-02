

# CriderGPT Phase 1: Local Agent Add-On

## Overview

This plan adds a local PC agent system that polls the CriderGPT API for commands, executes them locally, and reports results back. It includes Python scripts (downloadable from Admin), a new task queue table, a polling edge function, a vision capture command, and an ad script integration. No existing files are modified unless explicitly importing new modules.

---

## 1. Database: Agent Execution Queue

Create a new `agent_execution_queue` table that the Python agent polls for tasks and writes results back to.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | auto-generated |
| user_id | uuid | owner who issued the command |
| command | text | the raw command string |
| keyword | text | matched keyword trigger |
| status | text | `pending`, `running`, `completed`, `failed`, `cancelled` |
| result | jsonb | output/error from local execution |
| vision_data | jsonb | screenshot metadata if vision capture was used |
| created_at | timestamptz | when queued |
| started_at | timestamptz | when agent picked it up |
| completed_at | timestamptz | when agent finished |
| kill_switch | boolean default false | per-task halt flag |

RLS: Only the owner (jessiecrider3@gmail.com user_id) can read/write rows.

---

## 2. Edge Function: `agent-poll`

A new edge function the Python agent calls to:

- **GET tasks**: Fetch pending commands for the authenticated user
- **POST results**: Mark a task as completed/failed with output
- **Heartbeat**: Agent reports its alive status (stored in `agent_execution_queue` or a simple `agent_status` row)

Authentication: Uses the existing API key system. The function validates the bearer token against `cridergpt_api_keys` (key_hash check) and confirms the user is the authorized owner.

Endpoints (via action field in JSON body):
- `poll` -- returns up to 10 pending tasks, marks them `running`
- `report` -- accepts task_id + result, marks `completed` or `failed`
- `heartbeat` -- updates agent online status
- `vision_upload` -- accepts base64 screenshot + metadata, stores in Supabase storage

---

## 3. Update `cridergpt-api` to Queue Agent Tasks

When the existing `cridergpt-api` edge function matches a keyword with action `agent_mode` or `pc_agent`, instead of only calling `fixxy-autonomous`, it also inserts a row into `agent_execution_queue` with status `pending`. The Python agent picks it up on next poll.

This is a small addition to the existing switch/case in `cridergpt-api/index.ts` -- not a rewrite.

---

## 4. Python Agent Scripts (7 files)

These are stored as downloadable `.py` content in the Admin panel. Each file is a string constant rendered in a new "Agent Scripts" tab.

### File List:

| File | Purpose |
|------|---------|
| `config.py` | Loads `.env` (API URL, API key, poll interval, vision toggle) |
| `auth.py` | Authenticates with CriderGPT API using the API key |
| `poller.py` | Background loop: polls `agent-poll` for pending tasks every 10s |
| `executor.py` | Receives a command dict, runs it locally (subprocess, file ops, URL open), returns result |
| `vision.py` | Captures screenshots (using `pillow` + `pyautogui`), sends to API with metadata (active window, timestamp) |
| `agent.py` | Main entry point: starts poller + vision loop, handles graceful shutdown (kill switch) |
| `requirements.txt` | `requests`, `python-dotenv`, `pillow`, `pyautogui`, `psutil` |

Safety features baked in:
- Keyword authorization check before execution
- Kill switch polling (checks `kill_switch` field on every cycle)
- Single-user enforcement (API key tied to owner account)
- Vision is read-only (capture + send, no clicks/keystrokes)
- All commands logged to `agent_execution_queue`

### EXE Wrapper Notes
The plan includes a `setup_agent.py` script that:
- Installs dependencies from `requirements.txt`
- Creates a `.env` template
- Optionally registers as a Windows startup task
- Provides start/stop commands

Actual EXE compilation (PyInstaller) instructions are included as comments in `agent.py`.

---

## 5. Admin Panel: Agent Scripts Tab

Add a new tab "Agent Scripts" to the existing Admin panel (`AdminPanel.tsx`) that:

- Lists all 7 Python files with syntax-highlighted code blocks
- "Copy" and "Download .py" buttons for each file
- Shows agent connection status (polls `agent-poll` heartbeat endpoint)
- Shows recent execution results from `agent_execution_queue`
- "Generate .env Template" button that pre-fills the API URL and a placeholder for the key

New component: `src/components/admin/AgentScripts.tsx`

---

## 6. Ad Script Integration

Add the provided ad script to `index.html` just before `</body>`, loaded asynchronously:

```html
<script async src="https://pl28825167.effectivegatecpm.com/50/cd/34/50cd342b9dce7103747bc542e2fbc402.js"></script>
```

---

## 7. Smart ID Scan Fix Investigation

The TagScanner and scan-card edge function look correct. The likely issue is that `getClaims()` may not exist on older Supabase client versions. The fix:
- Replace `getClaims(token)` with `getUser()` in the `scan-card` edge function (the same pattern used in `cridergpt-api`)
- This ensures the scan actually authenticates properly and returns animal data

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create `agent_execution_queue` table with RLS |
| `supabase/functions/agent-poll/index.ts` | New edge function |
| `supabase/config.toml` | Add `[functions.agent-poll]` entry |
| `supabase/functions/cridergpt-api/index.ts` | Add queue insert for `agent_mode` action |
| `supabase/functions/scan-card/index.ts` | Fix auth: replace `getClaims` with `getUser` |
| `src/components/admin/AgentScripts.tsx` | New component with all Python file contents |
| `src/components/panels/AdminPanel.tsx` | Add Agent Scripts tab |
| `index.html` | Add async ad script before `</body>` |

## Execution Order

1. Database migration (agent_execution_queue table)
2. Fix scan-card auth (getClaims -> getUser)
3. Create agent-poll edge function
4. Update cridergpt-api to queue agent tasks
5. Build AgentScripts admin component with all Python files
6. Wire into AdminPanel
7. Add ad script to index.html

