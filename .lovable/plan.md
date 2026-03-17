

# ZIP File Processing & FS Mod Creation in Chat

## The Problem

Right now when someone uploads a ZIP file in chat, CriderGPT just says "Detected ZIP file... appears to be a Farming Simulator mod." It doesn't actually **open** the ZIP, read the files inside, or do anything useful with it. You want it to work like ChatGPT — unpack ZIPs, read the XML/LUA files, analyze the mod structure, modify files, and give back a downloadable ZIP.

## What This Plan Does

Two capabilities:
1. **ZIP Read** — Upload a ZIP, AI unpacks it, reads every file, and analyzes the mod structure
2. **ZIP Create** — AI generates a complete FS script mod as a downloadable ZIP (modDesc.xml, LUA scripts, etc.)

## How It Works

### New Edge Function: `process-mod-zip`

A new Supabase Edge Function that handles both reading and creating ZIPs using Deno's built-in ZIP support.

**Read mode:** Client sends the ZIP as base64 → function unpacks it → extracts all text files (XML, LUA, TXT, JSON, I3D references) → returns a structured file tree + contents to the AI for analysis.

**Create mode:** AI sends a list of files with contents → function packages them into a ZIP → uploads to Supabase Storage (`user-files` bucket) → returns a signed download URL.

### Chat Integration Changes

In `OpenAIChat.tsx`, the current ZIP handling (lines 108-117) gets replaced. Instead of just showing a toast, it will:
1. Convert the ZIP to base64
2. Call `process-mod-zip` with `mode: 'read'`
3. Pass the extracted file contents to the AI as context
4. AI analyzes the mod structure and responds with insights/fixes

### AGI Mode Tool Addition

Add a `create_mod_zip` tool to `agi-chat/index.ts` so the AI can autonomously generate mod files:

```
Tool: create_mod_zip
Parameters: mod_name, mod_version, files[] (each with path + content)
```

When a user says "make me a speed script mod for FS25," the AI:
1. Generates modDesc.xml with proper schema
2. Writes the LUA script
3. Calls `create_mod_zip` → packages everything
4. Returns a download link

### FS Mod Templates

The edge function includes starter templates for common mod types:
- **Script mod** — modDesc.xml + main LUA file
- **Placeable** — modDesc.xml + placeable XML
- **FillType** — modDesc.xml + fillType registration

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/process-mod-zip/index.ts` | **New** — Edge function for ZIP read/create |
| `src/components/OpenAIChat.tsx` | Replace stub ZIP handling with real unpack + AI analysis |
| `supabase/functions/agi-chat/index.ts` | Add `create_mod_zip` tool definition + execution |
| `supabase/config.toml` | Register new edge function |

## Limitations (Being Honest)

- **No 3D models** — Can't generate .i3d meshes or textures. This handles script mods, XML configs, and LUA files only
- **File size** — Edge functions have a ~50MB payload limit, so massive mod ZIPs with textures won't work. Text-based mods are fine
- **No GIANTS Editor** — Can't compile or validate against the actual game engine. The AI validates XML structure but can't guarantee in-game behavior

This gets you to "ChatGPT-level" ZIP handling for text-based mods, which covers script mods, placeables, fillTypes, and production chains — the most common mod types people create.

