

# USB Hub — Phone Code Repair Tab (CriderGPT Code Reader/Writer)

## Overview

Add a 7th tab "Code Fix" to the USB Hub that lets CriderGPT read code files from a connected phone (via file picker), analyze them with AI for bugs/issues, generate fixes, and write the fixed code back as downloadable files. Works on both Android and iPhone since it uses standard file input + download.

## How It Works

1. **Read**: User selects code files from their phone storage (`.py`, `.js`, `.json`, `.xml`, `.plist`, `.sh`, `.log`, config files, etc.)
2. **Analyze**: CriderGPT sends the code to the `chat-with-ai` edge function with a system prompt focused on diagnosing phone/device issues
3. **Fix**: AI returns an explanation of what's wrong + corrected code
4. **Write Back**: User downloads the fixed file back to their phone

No new database tables needed — logs go to existing `usb_data_logs` with `source_type: 'code_fix'`.

## Changes

### `src/components/usb/USBHub.tsx`

- Add 7th tab "Code Fix" with `Code2` icon
- Update `TabsList` grid to `grid-cols-4 sm:grid-cols-7`
- New `CodeFixTab` component:
  - File picker accepting code/config file types
  - Reads file content via `FileReader`
  - Shows raw code in a `<pre>` block
  - "Diagnose & Fix" button sends to `chat-with-ai` edge function with a specialized prompt: *"Analyze this code from a phone. Find bugs, security issues, or configuration problems. Return the fixed code with explanations."*
  - Displays AI analysis + fixed code side-by-side
  - "Download Fixed File" button creates a Blob and triggers download with the corrected code
  - Logs action to `usb_data_logs`

### Files Changed

| File | Action |
|------|--------|
| `src/components/usb/USBHub.tsx` | Add Code Fix tab + `CodeFixTab` component |

