

# USB Hub Enhancements — Connected Device Data Reading + iPhone Support + PWA Install

## Overview

Three additions to the USB Hub:

1. **Connected Device Data Reader** — A new tab that reads data from a plugged-in phone or laptop using the **Web Serial API** (`navigator.serial`) and **File System Access API**. This covers reading files/data from connected devices over USB cable.

2. **iPhone Compatibility** — Currently, several tabs show "not supported" on Safari/iOS. Add fallback approaches for each tab:
   - File Reader: Fall back to standard `<input type="file">` picker (works on all browsers including Safari)
   - Device Connect: Show instructions to use a companion approach or fall back to file-based data transfer
   - Contacts: On iOS, fall back to importing a `.vcf` (vCard) file export since Contact Picker API isn't available on iOS
   - Add platform detection throughout and show iOS-friendly alternatives instead of just "not supported"

3. **PWA Install from USB Hub** — When a USB device is detected or the USB Hub is open, show a prominent PWA install card using the existing `usePWAInstall` hook. This encourages users to install the app while they're actively using hardware features.

## Technical Details

### New "Connected Device" Tab
- Uses **Web Serial API** (`navigator.serial.requestPort()`) for serial data from connected devices
- Falls back to file picker for transferring files from a connected phone/laptop
- Logs all transfers to `usb_data_logs` with `source_type: 'connected_device'`
- Web Serial works in Chrome/Edge on desktop — for iOS/unsupported browsers, show file-based transfer

### iPhone Fallbacks per Tab
| Tab | Current | iOS Fallback |
|-----|---------|-------------|
| Files | `showDirectoryPicker()` | Standard `<input type="file" multiple>` |
| Device | WebUSB | Show "connect via file transfer" message |
| Scanner | Keyboard listener | Works as-is (keyboard events work everywhere) |
| Import | File input | Works as-is |
| Contacts | Contact Picker API | Import `.vcf` vCard file + parse it |
| Connected Device (new) | Web Serial | Standard file picker |

### PWA Install Integration
- Import `usePWAInstall` in `USBHub.tsx`
- Show a `PWAInstallPrompt` card (variant="card") at the top of the USB Hub when `isInstallable` or on iOS
- Message: "Install CriderGPT for the best USB experience — works offline with full device access"

## Files Changed

| File | Action |
|------|--------|
| `src/components/usb/USBHub.tsx` | Add Connected Device tab, iOS fallbacks for all tabs, PWA install prompt, vCard parser for iOS contacts |

