
# CriderGPT Phase 1.5: API Fix, Adsterra Native Banner, and Agent Enhancements

## Problem Summary

The API system is broken because **5 critical database tables are missing** (`cridergpt_api_keys`, `cridergpt_api_settings`, `cridergpt_api_logs`, `api_keywords`, `cridergpt_training_corpus`). Both the `cridergpt-admin` and `cridergpt-api` edge functions query these tables, so any API key generation or command execution fails. Additionally, a new Adsterra Native Banner ad needs to be integrated, and the old ad script needs to be removed from `index.html`.

---

## Part 1: Fix the API System (Database Tables)

Create the 5 missing tables that the edge functions already reference:

### Tables to Create

| Table | Purpose |
|-------|---------|
| `cridergpt_api_keys` | Stores API keys (hashed), permissions, rate limits |
| `cridergpt_api_settings` | Kill switch, endpoint overrides |
| `cridergpt_api_logs` | Request/command audit trail |
| `api_keywords` | Keyword-to-action mappings for API routing |
| `cridergpt_training_corpus` | Unified training data from ai_memory + writing_samples + training_data |

Each table gets RLS policies restricted to admin users via the existing `has_role` function. The `cridergpt_training_corpus` table will be populated with a view or materialized approach pulling from `ai_memory`, `writing_samples`, and `cridergpt_training_data`.

### Also: Seed Default Keywords

Insert default keywords (`agent_mode`, `pc_agent`, `convert_app_code`, `open_github`, `generate_photo`) so the API can route commands immediately.

---

## Part 2: Adsterra Native Banner Integration

1. **Remove** the old `effectivegatecpm.com` script from `index.html`
2. **Create** `src/components/AdsterraBanner.tsx` -- a React component that:
   - Renders a `<div id="container-0db409f9b28e67b2c5eb854b55bb35c8">`
   - Loads the Adsterra invoke script asynchronously after mount via `useEffect`
   - Includes a fallback placeholder for layout stability
   - Cleans up on unmount
3. **Place** the banner in the main layout (below header/above footer) inside `src/pages/Index.tsx` or the app shell so it appears on all pages
4. Ensure the ad is responsive and doesn't block interactive elements or PWA behavior

---

## Part 3: Agent EXE Builder Python Script

Since Lovable cannot compile native EXE files, we'll add a `build_exe.py` script to the Agent Scripts tab that:
- Uses PyInstaller to package the agent into a single `.exe`
- Includes a simple tkinter GUI with: API key input, save to `.env`, agent on/off toggle, connection status indicator
- The GUI wraps the existing `agent.py` logic
- Instructions for running: `python build_exe.py` produces `CriderGPT-Agent.exe`

New Python files to add to `AgentScripts.tsx`:
- `gui_agent.py` -- tkinter-based desktop UI with API input, on/off switch, status panel
- `build_exe.py` -- PyInstaller build script

---

## Part 4: Code Editor Tab (Basic)

Add a new "Code Editor" tab to the navigation sidebar that provides:
- A Monaco-style textarea (using a simple code editor with syntax highlighting)
- File browser showing the project structure (fetched via edge function that reads code structure)
- Run button that sends code to the `generate-code` edge function for execution/debugging
- AI assist button that sends selected code to the chat AI for help
- Owner-only access (jessiecrider3@gmail.com)

This will be a new component `src/components/panels/CodeEditorPanel.tsx` and nav entry.

---

## Part 5: CriderGPT AI Code Awareness (Owner-Only)

Update the `chat-with-ai` edge function's system prompt so that when the authenticated user is `jessiecrider3@gmail.com`:
- The AI knows it's talking to Jessie Crider, the founder
- It can reference the full codebase structure
- It can generate Android Studio zip exports on request
- It can provide full source code only to the verified owner
- For all other users, code access is denied

This is a system prompt enhancement only -- no new edge function needed.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create 5 missing tables + seed keywords |
| `index.html` | Remove old ad script |
| `src/components/AdsterraBanner.tsx` | New: Adsterra native banner component |
| `src/pages/Index.tsx` or layout | Add AdsterraBanner placement |
| `src/components/admin/AgentScripts.tsx` | Add `gui_agent.py` and `build_exe.py` to Python files |
| `src/components/panels/CodeEditorPanel.tsx` | New: basic code editor panel |
| `src/components/NavigationSidebar.tsx` | Add Code Editor nav item |
| `src/components/panels/AdminPanel.tsx` | No changes needed (already has agent tab) |
| `supabase/functions/chat-with-ai/index.ts` | Add owner-only code awareness system prompt |

## Execution Order

1. Database migration (create 5 tables, seed keywords)
2. Remove old ad script from index.html
3. Create and place AdsterraBanner component
4. Add GUI agent + EXE builder Python scripts to AgentScripts
5. Create CodeEditorPanel with basic editing + AI assist
6. Update chat-with-ai with owner code awareness
7. Wire new nav items

---

## Technical Notes

- The `has_role` RPC function already exists and is used by `cridergpt-admin` for admin checks
- `ai_memory` has a `details` column (not `content`), so the training corpus view needs to map correctly
- The `cridergpt_training_data` table exists but has different columns than the code expects -- the migration will add the missing columns or create the corpus table as the unified source
- EXE building cannot happen in-browser; the Python scripts provide the tooling for local compilation
- The Adsterra script uses `data-cfasync="false"` which is Cloudflare-specific; we'll keep it for compatibility
