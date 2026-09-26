# CriderGPT Desktop (Electron)

Wraps the CriderGPT web app into a real installable desktop application
for Windows, macOS, and Linux.

## One-time setup (on your PC)

```bash
npm install --save-dev electron @electron/packager
```

## Run in dev mode

Loads the live `cridergpt.lovable.app` site so you can iterate without rebuilding:

```bash
npx electron electron/main.cjs
```

## Desktop LAN Engine mode

The packaged desktop app includes a LAN connection control in the top bar. Set
the Engine address (the default is `http://10.42.0.1:8000`) and the Engine API
key there, test the connection, and enable **Use LAN Engine for chat**. The key
is encrypted with Windows secure storage and is used by Electron's main process;
it is not stored in the web bundle or sent through Supabase.

Normal text chat uses the LAN Engine when enabled. Image requests and any
explicit cloud fallback continue to use the existing Supabase route.

## Build a real installer

### Windows (.exe)
```bash
npm run build
npx @electron/packager . "CriderGPT" --platform=win32 --arch=x64 --out=electron-release --overwrite --ignore="^/src" --ignore="^/public" --ignore="^/electron-release"
```
Output: `electron-release/CriderGPT-win32-x64/CriderGPT.exe`

### macOS (.app)
```bash
npm run build
npx @electron/packager . "CriderGPT" --platform=darwin --arch=x64 --out=electron-release --overwrite
```

### Linux
```bash
npm run build
npx @electron/packager . "CriderGPT" --platform=linux --arch=x64 --out=electron-release --overwrite
```

## Notes

- `vite.config.ts` has `base: './'` so the built assets load correctly under `file://`.
- The desktop app can talk directly to the local MCP server
  (`public/voice-engine/cridergpt-pc-mcp.py`) for full PC automation —
  no Cursor required.
- To package as `.dmg` (macOS) or `.msi` (Windows) installers, swap to
  `electron-builder` later. `@electron/packager` only produces folders.
