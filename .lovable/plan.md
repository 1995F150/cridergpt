

## NFC Tag Writer Fix + Tag State Tracking + Raspberry Pi Pilot

### Summary

Three issues to solve in one pass:

1. **NFC Writer reliability**: The Admin NFC Writer writes encrypted `CGPT:` payloads that the scanner can't match against `tag_id` values (which are plain `CriderGPT-XXXXXX`). Lock is on by default causing confusion. Fix: write plain tag IDs, move lock to advanced mode.

2. **Tag state tracking**: The system doesn't know which tag IDs have been physically written to NFC hardware vs. just sitting in the pool. There's no `nfc_programmed` status. Fix: add a `programmed` status to the tag pool workflow and persist NFC write events to the database.

3. **Raspberry Pi full pilot**: Build an Admin "Devices" tab where you register a Raspberry Pi scanner, generate an API token, and see device heartbeat/status. Build a companion Python script for the Pi that polls the backend and scans NFC tags.

---

### Part 1: Database Changes (SQL Migration)

**Add columns to `livestock_tag_pool`:**
- `nfc_written_at` (timestamptz, nullable) — when the ID was physically written to an NFC tag
- `nfc_written_by` (uuid, nullable) — who wrote it
- `nfc_locked` (boolean, default false) — whether the tag was permanently locked

**New table `livestock_devices`:**
```
id           uuid PK
owner_id     uuid NOT NULL (references auth.users)
device_name  text NOT NULL
device_token text NOT NULL UNIQUE (hashed API token for the Pi)
device_type  text DEFAULT 'raspberry_pi'
last_heartbeat timestamptz
status       text DEFAULT 'offline' (online/offline)
metadata     jsonb DEFAULT '{}'
created_at   timestamptz DEFAULT now()
```

**RLS on `livestock_devices`:** Owner can manage their own devices. Service role has full access.

**New table `livestock_device_logs`:**
```
id          uuid PK
device_id   uuid NOT NULL
event_type  text NOT NULL (heartbeat, scan, write, error)
payload     jsonb DEFAULT '{}'
created_at  timestamptz DEFAULT now()
```

**RLS:** Owner of the device can read logs.

---

### Part 2: NFC Writer Fix (`src/components/admin/NFCTagWriter.tsx`)

**Changes:**
- **Default format**: Write plain `CriderGPT-XXXXXX` text record (not encrypted). Remove encryption as default.
- **Encryption toggle**: Keep as optional but OFF by default.
- **Lock toggle**: Move to an "Advanced" collapsible section, OFF by default, no password requirement (use `makeReadOnly()` only when explicitly enabled).
- **After successful write**: Update `livestock_tag_pool` with `nfc_written_at`, `nfc_written_by`, and set status to `programmed` (new intermediate status between `available` and `assigned`).
- **Read verification**: After reading a tag, decode and show whether the tag content matches any pool entry, and display its current status (available / programmed / assigned).
- **Tag pool display**: Show ALL statuses (available, programmed, assigned) with color badges so you can see which tags have been physically written.

**Scanner compatibility fix** (`src/components/livestock/TagScanner.tsx`):
- When reading an NFC tag with `CGPT:` prefix, decode it and extract the plain `id` field for lookup. This provides backward compatibility with any tags already written in encrypted format.

---

### Part 3: Tag Pool Status Flow

```text
┌───────────┐    NFC Write     ┌────────────┐   Register Animal   ┌──────────┐
│ available  │ ──────────────> │ programmed  │ ─────────────────> │ assigned │
└───────────┘                  └────────────┘                     └──────────┘
      ^                                                                │
      │                     Delete Animal (trigger)                    │
      └────────────────────────────────────────────────────────────────┘
```

- `available`: ID exists in pool, not written to any physical tag
- `programmed`: ID has been written to a physical NFC tag but not yet linked to an animal
- `assigned`: ID is linked to a live animal record

The `scan-card` edge function already handles `available` pool tags as `unregistered`. Update it to also recognize `programmed` status and return a more specific message: "Tag is programmed and ready to register."

---

### Part 4: Raspberry Pi Pilot

**Admin UI** — New tab "Devices" in Admin Panel (`src/components/admin/DeviceManager.tsx`):
- Register a new device (name, type)
- Generate a one-time API token (displayed once, stored hashed)
- Device status card: name, last heartbeat, online/offline badge
- Recent device logs (scans, errors)

**Edge function** `device-heartbeat` (new):
- Accepts `POST` with `device_token` in Authorization header
- Validates token against `livestock_devices`
- Updates `last_heartbeat` and sets status to `online`
- Returns list of pending commands (future use)

**Edge function** `device-scan` (new):
- Accepts `POST` with `device_token` + `tag_id`
- Performs same lookup as `scan-card` but authenticated via device token instead of user JWT
- Returns animal profile or unregistered status
- Logs to `livestock_device_logs`

**Python script for Raspberry Pi** (`public/rpi-scanner/scanner.py`):
- Reads NFC tags via `nfcpy` or `pyscard` library
- Sends scanned tag ID to `device-scan` endpoint
- Sends heartbeat every 60 seconds to `device-heartbeat`
- Displays result on terminal (or optional LCD display)
- Config file for API URL and device token

---

### Part 5: Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/migrations/XXXXXX.sql` | Add columns, tables, RLS |
| `src/components/admin/NFCTagWriter.tsx` | Rewrite write/read logic, plain format, advanced lock |
| `src/components/admin/DeviceManager.tsx` | New — device registration + status UI |
| `src/components/panels/AdminPanel.tsx` | Add "Devices" tab |
| `src/components/livestock/TagScanner.tsx` | Add CGPT: prefix decode fallback |
| `supabase/functions/scan-card/index.ts` | Handle `programmed` status |
| `supabase/functions/device-heartbeat/index.ts` | New edge function |
| `supabase/functions/device-scan/index.ts` | New edge function |
| `public/rpi-scanner/scanner.py` | New Python script |
| `public/rpi-scanner/requirements.txt` | nfcpy, requests |
| `public/rpi-scanner/config.example.json` | Config template |
| `RPI_SCANNER_GUIDE.md` | Setup instructions |

---

### Risk: Edge Function Limits

Previous deployment hit the function limit. If we can't deploy `device-heartbeat` and `device-scan` as separate functions, we'll combine them into a single `device-api` function with action routing (`action: 'heartbeat' | 'scan'`).

