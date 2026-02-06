

# Auto-Generate SHA-1 Fingerprint for Android Builds

## What This Solves

Right now, every time you build the Android version, you have to manually run a long `keytool` command, find the SHA-1 line, and copy it into Google Cloud Console. This plan automates that so the SHA-1 is extracted automatically.

## How It Works

There are two layers of automation:

### 1. Add npm Scripts to package.json

Add quick-run scripts you can just type in your terminal:

- `npm run android:sha1` - Automatically extracts JUST the SHA-1 fingerprint (no extra info)
- `npm run android:setup` - Full setup: build, sync, extract SHA-1, and open Android Studio
- `npm run android:build` - Quick rebuild: build + sync in one command

On Windows CMD, these will run the `keytool` command and filter out just the SHA-1 hash for you.

### 2. Add Gradle signingReport Integration

Add a note in the Android build commands that you can also run `./gradlew signingReport` from inside the `android/` folder. This is Android's built-in way to print ALL fingerprints (SHA-1, SHA-256, MD5) automatically. No keytool command needed.

### 3. Update Developer Command Panel

Add the new automated commands to the Developer Command Panel so they show up as one-click copy buttons.

### 4. Update CriderGPT AI Knowledge

Update the system prompt so CriderGPT knows about these automated commands and suggests them instead of the manual keytool approach.

## What You'll See

Instead of remembering this long command:
```
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

You just type:
```
npm run android:sha1
```

Or from the Android Studio terminal:
```
./gradlew signingReport
```

And the SHA-1 fingerprint prints right out, ready to copy into Google Cloud Console.

## Files to Change

| File | Change |
|------|--------|
| `package.json` | Add `android:sha1`, `android:setup`, and `android:build` npm scripts |
| `src/hooks/useDeveloperMode.ts` | Add automated SHA-1 commands to the command list |
| `src/components/DeveloperCommandPanel.tsx` | Add a dedicated "SHA-1 / Signing" section or update Android tab |
| `supabase/functions/chat-with-ai/index.ts` | Update AI knowledge with automated SHA-1 commands |
| `ANDROID_BUILD_GUIDE.md` | Add section about automated SHA-1 extraction |

## Technical Details

### npm scripts added to package.json:

```json
"android:sha1": "keytool -list -v -keystore %USERPROFILE%\\.android\\debug.keystore -alias androiddebugkey -storepass android -keypass android 2>nul | findstr SHA1",
"android:build": "npm run build && npx cap sync android",
"android:setup": "npm run build && npx cap sync android && npx cap open android"
```

Note: The `android:sha1` script uses Windows CMD syntax (`%USERPROFILE%` and `findstr`) since you're on Windows. For Mac/Linux there would be a different version using `grep`.

### Gradle signingReport (works on all platforms):

From inside the `android/` folder:
```
cd android
./gradlew signingReport
```

This prints all fingerprints for both debug and release keystores automatically -- no extra setup needed. This is the approach Google officially recommends.

