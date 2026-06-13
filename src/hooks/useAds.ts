import { useCallback } from "react";

/**
 * Web-only stub for the ads hook.
 *
 * The shipping CriderGPT Android app is fully native Kotlin and wires AdMob
 * directly via the Google Mobile Ads SDK in the `android_app/` project — it
 * does NOT load this web bundle for ads. The web/PWA build never shows
 * AdMob (Google's policies don't allow AdMob in PWAs), so every call here
 * is a no-op and `showAds` is permanently false.
 *
 * Production AdMob IDs are kept here for reference only — they live in the
 * native Android app's AdMob bridge, not in this hook.
 */
export const ADMOB_APP_ID = "ca-app-pub-1884621321896668~7174244598";

export const AD_UNITS = {
  rewarded: "ca-app-pub-1884621321896668/8461902383",
  interstitial: "ca-app-pub-1884621321896668/6979140189",
  banner: "ca-app-pub-1884621321896668/5478019545",
} as const;

export function useAds() {
  const showAds = false;

  const showRewarded = useCallback(async (): Promise<null> => null, []);
  const showInterstitial = useCallback(async (): Promise<void> => {}, []);
  const showBanner = useCallback(async (): Promise<void> => {}, []);
  const hideBanner = useCallback(async (): Promise<void> => {}, []);

  return {
    showAds,
    showRewarded,
    showInterstitial,
    showBanner,
    hideBanner,
  };
}
