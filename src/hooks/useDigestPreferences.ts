import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DigestPrefs {
  weekly_enabled: boolean;
  day_of_week: number;
}

export function useDigestPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<DigestPrefs>({ weekly_enabled: true, day_of_week: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("digest_preferences").select("weekly_enabled,day_of_week").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs(data as DigestPrefs);
        setLoading(false);
      });
  }, [user]);

  const save = useCallback(async (next: DigestPrefs) => {
    if (!user) return;
    setPrefs(next);
    const { error } = await supabase.from("digest_preferences").upsert({ user_id: user.id, ...next });
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }, [user]);

  return { prefs, save, loading };
}
