import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SmsSettings {
  phone_number: string;
  notifications_enabled: boolean;
  verified: boolean;
  twilio_from_number?: string | null;
}

export function useSmsSettings() {
  const [settings, setSettings] = useState<SmsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data } = await supabase
      .from("sms_settings")
      .select("phone_number, notifications_enabled, verified, twilio_from_number")
      .eq("user_id", u.user.id)
      .maybeSingle();
    setSettings(data as SmsSettings | null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next: Partial<SmsSettings> & { phone_number: string }) => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return { error: "Not signed in" }; }
    const payload = {
      user_id: u.user.id,
      phone_number: next.phone_number,
      notifications_enabled: next.notifications_enabled ?? true,
      twilio_from_number: next.twilio_from_number ?? null,
    };
    const { error } = await supabase.from("sms_settings").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (!error) await load();
    return { error: error?.message };
  }, [load]);

  const sendTest = useCallback(async (message = "Hey — CriderGPT is wired up and can text you. 🤠") => {
    const { data, error } = await supabase.functions.invoke("cridergpt-sms", {
      body: { message },
    });
    return { data, error: error?.message };
  }, []);

  return { settings, loading, saving, save, sendTest, reload: load };
}
