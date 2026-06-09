# AdMob Setup — CriderGPT

## ✅ Live IDs (Android)

| Slot | ID |
|---|---|
| **App ID** | `ca-app-pub-1884621321896668~7174244598` |
| **Rewarded — Unlock Messages** (+5 msgs) | `ca-app-pub-1884621321896668/8461902383` |
| Interstitial — Session Break | _TODO: create in AdMob console_ |
| Banner — Demo Page | _TODO: create in AdMob console_ |

iOS IDs: not created yet (no Apple Dev account).

## 🔧 Android Manifest (action required for external builder)

The `android/` folder is externally managed — the self-hosted Ubuntu builder needs to add this **inside `<application>`** in `AndroidManifest.xml`:

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-1884621321896668~7174244598"/>
```

Without this, the app will **crash on launch**. This is the only Android-side change needed.

## 📦 Frontend wiring

Plugin installed: `@capacitor-community/admob`
Hook: `src/hooks/useAds.ts`

```ts
import { useAds } from "@/hooks/useAds";

function MessageCapHit() {
  const { showAds, showRewarded } = useAds();

  if (!showAds) return null; // hidden on web + paid plans

  return (
    <Button
      onClick={async () => {
        const reward = await showRewarded();
        if (reward) {
          // grant +5 messages to user
          await grantBonusMessages(reward.amount);
        }
      }}
    >
      📺 Watch ad → +5 messages
    </Button>
  );
}
```

The hook auto-checks `useSubscriptionStatus` — paid users (`plus`/`pro`/`lifetime`) **never** see ads, and the web/PWA build never loads the plugin.

## 🎯 Where to surface

| Surface | Ad type | Trigger |
|---|---|---|
| Free user hits message cap | Rewarded → +5 msgs | Daily limit reached |
| Image gen cooldown | Rewarded → skip cooldown | Cooldown timer active |
| Between chat sessions (every 10th open) | Interstitial | App resume counter |
| Public `/demo` page | Banner | Always (guest traffic) |
| AGI Mode preview | Rewarded → 1 free use | Free user opens AGI |

## 📋 Next steps

1. Create the **Interstitial** ad unit in AdMob console, paste ID into `AD_UNITS.interstitial` in `src/hooks/useAds.ts`.
2. Same for **Banner**.
3. Tell the external Android builder to add the `<meta-data>` line above to `AndroidManifest.xml`.
4. Add AdMob disclosure to `/privacy` (Play Store requires it — already noted there).
5. Enable **UMP consent SDK** for GDPR (Capacitor plugin handles it; we can wire later).
