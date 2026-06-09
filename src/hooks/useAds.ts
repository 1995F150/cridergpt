import { useCallback, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import {
  AdMob,
  RewardAdPluginEvents,
  InterstitialAdPluginEvents,
  type AdMobRewardItem,
} from "@capacitor-community/admob";
import { useSubscriptionStatus } from "./useSubscriptionStatus";

/**
 * CriderGPT AdMob Ad Unit IDs
 * App ID is set in AndroidManifest.xml (managed by external Android builder).
 *
 * Production IDs — only fire on native Android. Web/PWA never sees ads.
 */
export const ADMOB_APP_ID = "ca-app-pub-1884621321896668~7174244598";

export const AD_UNITS = {
  rewarded: "ca-app-pub-1884621321896668/8461902383",
  interstitial: "ca-app-pub-1884621321896668/6979140189",
  banner: "ca-app-pub-1884621321896668/5478019545",
} as const;

const PAID_PLANS = new Set(["plus", "pro", "lifetime"]);

export function useAds() {
  const { plan, loading } = useSubscriptionStatus();
  const initialized = useRef(false);

  const isNative = Capacitor.isNativePlatform();
  const showAds = !loading && !PAID_PLANS.has(plan) && isNative;

  useEffect(() => {
    if (!isNative || initialized.current) return;
    AdMob.initialize({
      initializeForTesting: false,
      testingDevices: [],
    })
      .then(() => {
        initialized.current = true;
      })
      .catch((err) => console.warn("[AdMob] init failed", err));
  }, [isNative]);

  /**
   * Show a rewarded video. Resolves with the reward (e.g. { amount: 5, type: "Messages" })
   * or null if the user closed it or no ad was available.
   */
  const showRewarded = useCallback(async (): Promise<AdMobRewardItem | null> => {
    if (!showAds || !AD_UNITS.rewarded) return null;

    return new Promise(async (resolve) => {
      let rewarded: AdMobRewardItem | null = null;

      const rewardListener = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        (reward) => {
          rewarded = reward;
        }
      );
      const dismissListener = await AdMob.addListener(
        RewardAdPluginEvents.Dismissed,
        () => {
          rewardListener.remove();
          dismissListener.remove();
          resolve(rewarded);
        }
      );
      const failListener = await AdMob.addListener(
        RewardAdPluginEvents.FailedToLoad,
        () => {
          rewardListener.remove();
          dismissListener.remove();
          failListener.remove();
          resolve(null);
        }
      );

      try {
        await AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded });
        await AdMob.showRewardVideoAd();
      } catch (err) {
        console.warn("[AdMob] rewarded failed", err);
        rewardListener.remove();
        dismissListener.remove();
        failListener.remove();
        resolve(null);
      }
    });
  }, [showAds]);

  /**
   * Show an interstitial between sessions. No reward — fire-and-forget.
   * Skipped silently if unit ID isn't configured yet.
   */
  const showInterstitial = useCallback(async (): Promise<void> => {
    if (!showAds || !AD_UNITS.interstitial) return;
    try {
      await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial });
      await AdMob.showInterstitial();
    } catch (err) {
      console.warn("[AdMob] interstitial failed", err);
    }
  }, [showAds]);

  return {
    /** True only on native Android for non-paid users. Use to gate UI like "Watch ad for +5 messages". */
    showAds,
    showRewarded,
    showInterstitial,
  };
}
