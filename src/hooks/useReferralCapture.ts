import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PENDING_KEY = 'pending-referral-code';

/**
 * Captures ?ref=CODE from the URL on first load and stores it.
 * Once the user signs up, attaches the referral row.
 */
export function useReferralCapture() {
  const { user } = useAuth();

  // 1. Capture code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && !localStorage.getItem(PENDING_KEY)) {
      localStorage.setItem(PENDING_KEY, ref.toUpperCase());
    }
  }, []);

  // 2. Once user is logged in, redeem the code (one-shot)
  useEffect(() => {
    if (!user) return;
    const code = localStorage.getItem(PENDING_KEY);
    if (!code) return;

    (async () => {
      // Don't credit if user already has a referral record
      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('invitee_id', user.id)
        .maybeSingle();
      if (existing) {
        localStorage.removeItem(PENDING_KEY);
        return;
      }

      // Find the inviter
      const { data: codeRow } = await supabase
        .from('referral_codes')
        .select('user_id, uses_count')
        .eq('code', code)
        .maybeSingle();
      if (!codeRow || codeRow.user_id === user.id) {
        localStorage.removeItem(PENDING_KEY);
        return;
      }

      // Insert the referral
      await supabase.from('referrals').insert({
        inviter_id: codeRow.user_id,
        invitee_id: user.id,
        code_used: code,
      });

      // Bump uses_count
      await supabase
        .from('referral_codes')
        .update({ uses_count: (codeRow.uses_count ?? 0) + 1 })
        .eq('user_id', codeRow.user_id);

      localStorage.removeItem(PENDING_KEY);
    })();
  }, [user]);
}
