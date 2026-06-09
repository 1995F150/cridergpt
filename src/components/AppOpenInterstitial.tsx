import { useEffect, useRef } from "react";
import { useAds } from "@/hooks/useAds";

const STORAGE_KEY = "cridergpt_app_open_count";
const INTERVAL = 10;

/**
 * Mounts once at app root. On every 10th app open (native Android, non-paid),
 * fires a single interstitial. Web/PWA and paid users are no-ops via useAds gating.
 */
export function AppOpenInterstitial() {
  const { showAds, showInterstitial } = useAds();
  const fired = useRef(false);

  useEffect(() => {
    if (!showAds || fired.current) return;
    fired.current = true;

    let count = 0;
    try {
      count = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0;
    } catch {
      count = 0;
    }
    count += 1;
    try {
      localStorage.setItem(STORAGE_KEY, String(count));
    } catch {
      /* no-op */
    }

    if (count % INTERVAL === 0) {
      // Delay to let app settle
      const t = setTimeout(() => {
        void showInterstitial();
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [showAds, showInterstitial]);

  return null;
}
