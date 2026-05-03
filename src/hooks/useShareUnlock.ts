import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useShareUnlock(featureKey: string) {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("share_unlocks")
      .select("id")
      .eq("user_id", user.id)
      .eq("feature_key", featureKey)
      .maybeSingle()
      .then(({ data }) => setUnlocked(!!data));
  }, [user, featureKey]);

  const shareAndUnlock = useCallback(
    async (shareData: { title: string; text: string; url: string }, platform = "native") => {
      if (!user) {
        toast.error("Sign in to unlock");
        return false;
      }
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
          toast.success("Link copied — share it to unlock!");
        }
        await supabase.from("share_unlocks").insert({
          user_id: user.id, feature_key: featureKey, share_platform: platform,
        });
        setUnlocked(true);
        toast.success("Unlocked!");
        return true;
      } catch {
        return false;
      }
    },
    [user, featureKey],
  );

  return { unlocked, shareAndUnlock };
}
