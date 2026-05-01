import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_check_in: string | null;
  total_check_ins: number;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86400000);
};

export function useStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, last_check_in, total_check_ins')
      .eq('user_id', user.id)
      .maybeSingle();
    setStreak(data ?? { current_streak: 0, longest_streak: 0, last_check_in: null, total_check_ins: 0 });
  }, [user]);

  const checkIn = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = todayISO();
    const { data: existing } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.last_check_in === today) {
      setLoading(false);
      return; // already checked in
    }

    let current = 1;
    if (existing?.last_check_in) {
      const gap = daysBetween(existing.last_check_in, today);
      current = gap === 1 ? existing.current_streak + 1 : 1;
    }
    const longest = Math.max(existing?.longest_streak ?? 0, current);
    const totals = (existing?.total_check_ins ?? 0) + 1;

    await supabase.from('user_streaks').upsert({
      user_id: user.id,
      current_streak: current,
      longest_streak: longest,
      last_check_in: today,
      total_check_ins: totals,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    await refresh();
    setLoading(false);
  }, [user, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-check-in once per session
  useEffect(() => {
    if (!user) return;
    const key = `streak-checked-${todayISO()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    checkIn();
  }, [user, checkIn]);

  return { streak, loading, checkIn, refresh };
}
