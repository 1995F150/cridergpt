
# Add Android Build Commands to CriderGPT AI Knowledge

## Goal
Make the main CriderGPT AI assistant (the chat interface you're using) aware of all Android conversion commands so when you ask "how do I build the Android app?" it can directly provide the correct CMD commands.

## Current State
- **FixxyBot** knows the commands but it's a separate interface
- **CriderGPT main chat** (`chat-with-ai`) does NOT have this knowledge in its system prompt
- The verify_developer RPC already exists and works

## What Will Change

### Update: `supabase/functions/chat-with-ai/index.ts`

Add a new section to the system prompt that includes developer command knowledge when the verified owner is detected:

```text
SYSTEM_PROMPT additions (for jessiecrider3@gmail.com only):

🔧 DEVELOPER COMMANDS KNOWLEDGE:
When Jessie asks about building the Android app, converting to mobile, 
or running commands, provide these exact steps:

ANDROID BUILD WORKFLOW:
1. git pull origin main && npm install
2. npm run build  
3. npx cap sync android
4. npx cap open android
5. npx cap run android

MAINTENANCE COMMANDS:
- npm run lint (check issues)
- npx cap doctor (capacitor status)
- keytool -list -v -keystore ~/.android/debug.keystore (SHA-1)
- adb logcat (Android logs)
- adb devices (list connected devices)

GIT COMMANDS:
- git pull origin main
- git add . && git commit -m "message" && git push

SUPABASE COMMANDS:
- npx supabase gen types typescript --project-id udpldrrpebdyuiqdtqnq
- npx supabase functions deploy
```

### Security
- Commands are ONLY included in the system prompt when the user email matches `jessiecrider3@gmail.com`
- Other users will never see this developer knowledge
- No changes to verification flow needed - already using email check

## Result
When you ask CriderGPT: "how do I build the Android app?" or "what's the cmd command for android conversion?" it will respond with the exact commands in your familiar tone.

## Files to Edit
| File | Change |
|------|--------|
| `supabase/functions/chat-with-ai/index.ts` | Add developer commands section to SYSTEM_PROMPT (owner-only) |
