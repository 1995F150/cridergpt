import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type PassphraseAction = "unlock_dev" | "switch_mode" | "secret_command" | "verify_action";

export interface PassphraseRow {
  id: string;
  label: string;
  action_type: PassphraseAction;
  payload: Record<string, any>;
  enabled: boolean;
  last_used_at: string | null;
  created_at: string;
}

export function usePassphrase() {
  const { user } = useAuth();
  const [list, setList] = useState<PassphraseRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("owner_passphrases")
      .select("id,label,action_type,payload,enabled,last_used_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setList((data as PassphraseRow[]) ?? []);
    setLoading(false);
  }, [user]);

  const create = useCallback(
    async (label: string, phrase: string, action_type: PassphraseAction, payload: Record<string, any> = {}) => {
      if (!user) return;
      const hash = await sha256(phrase);
      const { error } = await supabase.from("owner_passphrases").insert({
        user_id: user.id,
        label,
        passphrase_hash: hash,
        action_type,
        payload,
      });
      if (error) {
        toast.error(error.message);
        return false;
      }
      toast.success("Passphrase saved");
      await refresh();
      return true;
    },
    [user, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("owner_passphrases").delete().eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Removed");
      await refresh();
    },
    [refresh],
  );

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      await supabase.from("owner_passphrases").update({ enabled }).eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const verify = useCallback(async (phrase: string) => {
    const { data, error } = await supabase.functions.invoke("passphrase-verify", { body: { phrase } });
    if (error) {
      toast.error(error.message);
      return null;
    }
    return data as { matched: boolean; action_type?: PassphraseAction; payload?: Record<string, any>; label?: string };
  }, []);

  return { list, loading, refresh, create, remove, toggle, verify };
}
