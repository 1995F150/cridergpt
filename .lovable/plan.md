

# USB Data Hub — Universal USB Device & File Interface

## Overview

Build a comprehensive USB panel that handles four use cases:
1. **USB Drive Files** — Detect and read files from USB drives via the File System Access API
2. **USB Device Sensors** — Connect to USB hardware (scales, sensors) via the WebUSB API and stream data to Supabase
3. **Livestock Tag Scanner** — Read RFID/NFC data from USB-connected scanners and match to animals
4. **General Data Import** — Bulk-import CSV/JSON files from USB into database tables

## Technical Approach

### Database

Create a `usb_data_logs` table to record all USB data transfers:

```sql
CREATE TABLE public.usb_data_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL, -- 'drive_file', 'sensor', 'tag_scanner', 'data_import'
  device_name TEXT,
  file_name TEXT,
  data_payload JSONB DEFAULT '{}',
  file_url TEXT,
  records_imported INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Plus a Supabase Storage bucket `usb-uploads` for file storage.

### Frontend — New "USB Hub" Panel

**`src/components/usb/USBHub.tsx`** — Main component with 4 tabs:

1. **File Reader Tab** — Uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) (`window.showDirectoryPicker()`) to browse USB drive contents, preview files, and upload selected ones to Supabase Storage.

2. **Device Connect Tab** — Uses the [WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/USB) (`navigator.usb.requestDevice()`) to pair with USB hardware. Reads incoming data and posts it to Supabase in real-time. Shows live readings.

3. **Tag Scanner Tab** — Listens for USB HID barcode/RFID scanner input (these typically emulate keyboard input). Captures scanned tag IDs, looks them up against `livestock_animals.tag_id`, and displays the animal profile. Falls back to the existing `scan-card` edge function.

4. **Data Import Tab** — File picker for CSV/JSON files. Parses them client-side, shows a preview table, lets the user map columns, then bulk-inserts into a chosen target table (livestock, spending entries, calendar events, etc.).

**`src/components/panels/USBPanel.tsx`** — Wrapper panel component.

### Navigation Integration

Add `'usb-hub'` to `PanelType`, add a nav item with the `Usb` icon from lucide-react in both `NavigationSidebar.tsx` and `MobileNavigation.tsx`.

### Browser Compatibility Note

WebUSB and File System Access API only work in Chromium-based browsers (Chrome, Edge, Brave). The UI will show compatibility warnings on unsupported browsers and gracefully disable those tabs.

## Files

| File | Action |
|------|--------|
| DB migration | Create `usb_data_logs` table + `usb-uploads` storage bucket + RLS |
| `src/components/usb/USBHub.tsx` | Create — main 4-tab USB interface |
| `src/components/panels/USBPanel.tsx` | Create — panel wrapper |
| `src/pages/Index.tsx` | Add `usb-hub` panel type + import |
| `src/components/NavigationSidebar.tsx` | Add USB nav item |
| `src/components/MobileNavigation.tsx` | Add USB nav item |

