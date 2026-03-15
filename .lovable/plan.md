

# Fix iPhone USB Hub — Surface Connect/Contacts/Files Options

## Problem

On iPhone, the "Device" tab just shows "not supported" with no actionable options. The contacts and file transfer features for iPhone are hidden in the "Connected" tab, which users don't find. The 7-tab grid also doesn't display well on mobile (411px viewport).

## Changes — `src/components/usb/USBHub.tsx`

### 1. Fix Mobile Tab Layout
Replace `grid-cols-4 sm:grid-cols-7` with a horizontally scrollable tab list using `flex overflow-x-auto` so all 7 tabs are accessible without wrapping awkwardly on small screens.

### 2. Add iPhone Options to Device Tab
When `isIOS` is detected on the Device Connect tab, instead of just showing "not supported," show three actionable buttons:
- **Import Contacts** — triggers Contact Picker or vCard file picker
- **Select Files** — opens standard file picker for transferring files from the connected device
- **Install App** — shows PWA install prompt for better device access

This makes the Device tab the one-stop shop on iPhone, since WebUSB/Serial aren't available.

### 3. Add iPhone Connect Section to Connected Tab
Add a prominent "Connect iPhone" section at the top of the Connected Device tab when iOS is detected, with:
- Instructions for connecting via Lightning/USB-C adapter
- Direct buttons for contacts and file access (already exist but will be more prominent)

### Files

| File | Action |
|------|--------|
| `src/components/usb/USBHub.tsx` | Fix tab layout for mobile, add iPhone actions to Device tab |

