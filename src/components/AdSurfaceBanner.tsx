import { useEffect } from "react";
import { useAds } from "@/hooks/useAds";

/**
 * Mount this on a page to show a bottom banner ad while the page is visible.
 * Only renders on native Android for non-paid users — web/PWA is a no-op.
 * Unmounting removes the banner.
 */
export function AdSurfaceBanner() {
  const { showBanner, hideBanner, showAds } = useAds();

  useEffect(() => {
    if (!showAds) return;
    void showBanner();
    return () => {
      void hideBanner();
    };
  }, [showAds, showBanner, hideBanner]);

  return null;
}
