-- Seed training knowledge and add daily API usage view

-- Seed Android build playbook
insert into public.cridergpt_training_data (user_email, title, content, tags, source)
values (
  'jessiecrider3@gmail.com',
  'Android Build Playbook (Capacitor/Vite React)',
  $$
Goal: Produce an Android APK/AAB from the CriderGPT web app using Capacitor.

Steps (Windows CMD, PowerShell, macOS, Linux all similar):
1) Clone or pull repo
   - git clone https://github.com/1995F150/cridergpt.git
   - cd cridergpt
   - git pull origin main (for updates)
2) Install dependencies
   - npm install
3) Build the web app
   - npm run build
4) Add Android platform (first time only)
   - npx cap add android
5) Sync web build to Android
   - npx cap sync android
6) Open Android Studio
   - npx cap open android
7) Build APK in Android Studio
   - Build > Build Bundle(s)/APK(s) > Build APK(s)
   - Output: android/app/build/outputs/apk/debug/app-debug.apk

Extras:
- Quick update path after changes: npm run build && npx cap sync android
- Troubleshooting: npx cap doctor, npm run lint
- Device logs: adb logcat; Devices: adb devices
$$,
  array['android','build','capacitor','mobile'],
  'seed'
), (
  'jessiecrider3@gmail.com',
  'Web Dev & Deploy Playbook (Vite React)',
  $$
Goal: Build and preview the CriderGPT web app.

Steps:
1) Install deps: npm install
2) Dev server: npm run dev  (visit printed localhost URL)
3) Production build: npm run build
4) Preview build locally: npm run preview (ensure build created)
5) Static hosting deploy: upload dist/ to host or configure adapter as needed

Notes:
- Typecheck/lint: npm run lint
- Vite config: vite.config.ts; Tailwind: tailwind.config.ts
$$,
  array['web','vite','react','deploy'],
  'seed'
), (
  'jessiecrider3@gmail.com',
  'PC Agent Action Dictionary (Open Websites & Apps)',
  $$
Goal: Open URLs and launch apps cross-platform from a local PC agent.

Open a website in default browser:
- Windows (cmd.exe): start https://example.com
- PowerShell: Start-Process https://example.com
- macOS: open https://example.com
- Linux: xdg-open https://example.com

Open local file/folder:
- Windows: start "" "C:\\path\\to\\file-or-folder"
- macOS: open /path/to/file-or-folder
- Linux: xdg-open /path/to/file-or-folder

Launch common apps:
- Windows: start notepad, start calc, start mspaint
- PowerShell: Start-Process notepad
- macOS: open -a "Google Chrome"; open -a "Visual Studio Code"
- Linux: code .   (VS Code),   google-chrome https://example.com   (if in PATH)

GitHub repo quick open:
- Windows: start https://github.com/1995F150/cridergpt
- macOS: open https://github.com/1995F150/cridergpt
- Linux: xdg-open https://github.com/1995F150/cridergpt

Security:
- Validate command allowlist per-OS
- Never execute arbitrary shell without explicit mapping
$$,
  array['pc','agent','os','open','apps','urls'],
  'seed'
);

-- Basic per-day usage view
create or replace view public.cridergpt_api_usage_daily as
select 
  date_trunc('day', created_at) as day,
  coalesce(endpoint, 'unknown') as endpoint,
  count(*) as calls
from public.cridergpt_api_logs
group by 1, 2
order by 1 desc, 2 asc;
