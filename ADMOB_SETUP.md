# AdMob Pre-Stage Guide (Post-June 2026)

This is a **placeholder setup** so once Jessie turns 18 and opens an AdMob account, wiring real ads is a 15-minute job, not a 3-day refactor.

## Step 0 — Prerequisites (June+)
1. Open a Google AdSense / AdMob account: https://admob.google.com
2. Create app entries for:
   - **Android**: package `com.cridergpt.android`
   - **iOS** (later): bundle `app.cridergpt.ios` (or whatever you pick)
3. Grab the **App ID** (looks like `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`) and at least these **Ad Unit IDs**:
   - Rewarded video (best ROI — used to unlock free features)
   - Interstitial (between sessions, not mid-task)
   - Banner (optional, bottom of free-tier pages)

## Step 1 — Install Capacitor AdMob plugin (when ready)
```bash
npm install @capacitor-community/admob
npx cap sync
```

## Step 2 — Drop the App ID
- Android: edit `android_app/app/src/main/AndroidManifest.xml` and add inside `<application>`:
  ```xml
  <meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
  ```
  (⚠️ memory rule: `android_app/` is externally managed — coordinate before editing)
- iOS: edit `ios/App/App/Info.plist` similarly with `GADApplicationIdentifier`

## Step 3 — Frontend hook (already pre-staged shape)
When you're ready, create `src/hooks/useAds.ts` along these lines:

```ts
import { AdMob, RewardAdPluginEvents, AdMobRewardItem } from '@capacitor-community/admob';

const REWARDED_AD_ID = 'ca-app-pub-XXXX/REWARD_UNIT';

export function useAds() {
  const init = async () => {
    await AdMob.initialize({ testingDevices: [], initializeForTesting: false });
  };

  const showRewarded = (): Promise<AdMobRewardItem | null> =>
    new Promise(async (resolve) => {
      AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => resolve(reward));
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => resolve(null));
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID });
      await AdMob.showRewardVideoAd();
    });

  return { init, showRewarded };
}
```

## Step 4 — Where to show ads (revenue strategy)
| Surface | Ad type | Why |
|---|---|---|
| Free user hits message cap | Rewarded video → +5 messages | Highest eCPM, users CHOOSE to watch |
| Image generation cooldown | Rewarded video → skip cooldown | Same logic, high intent |
| Between chat sessions (every 10th open) | Interstitial | Don't interrupt mid-task |
| Public demo page (`/demo`) | Banner | Catches non-signed-up traffic |
| AGI Mode / Pro features preview | Rewarded video → 1 free use | Conversion funnel |

**Never** show ads to paid subscribers (Plus / Pro / Lifetime) — check `useSubscriptionStatus().plan`.

## Step 5 — Compliance
- Add AdMob to your **Privacy Policy** (`/privacy`) — required by Play Store
- Enable **UMP consent SDK** for GDPR / iOS ATT
- Tag your app as **non-child-directed** in AdMob console (CriderGPT skews high-school+)

## Estimated revenue ballpark
- Rewarded video eCPM in US ag/edu vertical: **$8-$15 / 1000 impressions**
- 500 daily active users × 2 rewarded watches/day × $10 eCPM = **~$10/day** = **~$300/month**
- Scales linearly with DAU — first real $$ comes around 1k DAU

## Don't do this yet
- ❌ Don't install the plugin until the AdMob account exists (it'll spam test ads in dev)
- ❌ Don't push App Store / Play Store builds with placeholder IDs
- ❌ Don't mix ads into paid-tier surfaces
