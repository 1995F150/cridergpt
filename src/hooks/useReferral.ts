import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function generateCode(seed: string) {
  // 6-char readable code based on user id + random
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const src = seed.replace(/-/g, '') + Math.random().toString(36).slice(2);
  for (let i = 0; i < 6; i++) {
    out += alphabet[parseInt(src[i], 36) % alphabet.length];
  }
  return out;
}

export function useReferral() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [usesCount, setUsesCount] = useState(0);
  const [rewardCredits, setRewardCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const ensureCode = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('code, uses_count, reward_credits')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      setCode(existing.code);
      setUsesCount(existing.uses_count);
      setRewardCredits(existing.reward_credits);
    } else {
      // create one — retry if collision
      for (let attempt = 0; attempt < 5; attempt++) {
        const newCode = generateCode(user.id);
        const { data, error } = await supabase
          .from('referral_codes')
          .insert({ user_id: user.id, code: newCode })
          .select('code, uses_count, reward_credits')
          .single();
        if (!error && data) {
          setCode(data.code);
          setUsesCount(data.uses_count);
          setRewardCredits(data.reward_credits);
          break;
        }
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    ensureCode();
  }, [ensureCode]);

  const shareUrl = code ? `${window.location.origin}/?ref=${code}` : '';

  const copyShareUrl = async () => {
    if (!shareUrl) return false;
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch {
      return false;
    }
  };

  const nativeShare = async () => {
    if (!shareUrl) return false;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CriderGPT — the AI built by an FFA kid',
          text: 'Check out CriderGPT, the AI assistant built for FFA, livestock, and farm life. Use my invite:',
          url: shareUrl,
        });
        return true;
      } catch {
        return false;
      }
    }
    return copyShareUrl();
  };

  return { code, shareUrl, usesCount, rewardCredits, loading, copyShareUrl, nativeShare };
}
