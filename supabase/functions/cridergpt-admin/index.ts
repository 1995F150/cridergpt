import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AdminBody =
  | { action: "generate_key"; label?: string; permissions?: Record<string, unknown>; rate_limit_per_minute?: number }
  | { action: "revoke_key"; id: string }
  | { action: "list_keys" }
  | { action: "set_kill_switch"; kill: boolean }
  | { action: "get_settings" }
  | { action: "list_logs"; user_email?: string; from?: string; to?: string }
  | { action: "upsert_keyword"; id?: string; keyword: string; action_name: string; description?: string; active?: boolean };

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomKey(len = 48): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  try {
    const auth = await supabase.auth.getUser();
    const user = auth.data.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    // Admin only: rely on has_role('admin')
    const { data: isAdmin } = await supabase.rpc("has_role", { _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = (await req.json()) as AdminBody;

    switch (body.action) {
      case "generate_key": {
        const plain = randomKey(56);
        const keyHash = await sha256(plain);
        const { data, error } = await supabase
          .from("cridergpt_api_keys")
          .insert({
            label: body.label ?? null,
            key_hash: keyHash,
            permissions: body.permissions ?? undefined,
            rate_limit_per_minute: body.rate_limit_per_minute ?? 60,
            created_by: user.id,
          })
          .select("id, label, permissions, active, rate_limit_per_minute, created_at")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ key: plain, record: data }), { status: 200, headers: corsHeaders });
      }
      case "revoke_key": {
        const { error } = await supabase
          .from("cridergpt_api_keys")
          .update({ active: false, revoked_at: new Date().toISOString() })
          .eq("id", (body as any).id);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
      }
      case "list_keys": {
        const { data, error } = await supabase
          .from("cridergpt_api_keys")
          .select("id, label, permissions, active, rate_limit_per_minute, created_at, revoked_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ keys: data }), { status: 200, headers: corsHeaders });
      }
      case "set_kill_switch": {
        // Ensure a settings row exists
        await supabase.from("cridergpt_api_settings").insert({}).select("id").single().catch(() => ({}));
        const { data: existing } = await supabase.from("cridergpt_api_settings").select("id").limit(1).maybeSingle();
        const id = existing?.id;
        if (id) {
          const { error } = await supabase
            .from("cridergpt_api_settings")
            .update({ kill_switch: (body as any).kill, updated_at: new Date().toISOString() })
            .eq("id", id);
          if (error) throw error;
        }
        return new Response(JSON.stringify({ ok: true, kill_switch: (body as any).kill }), { status: 200, headers: corsHeaders });
      }
      case "get_settings": {
        const { data } = await supabase.from("cridergpt_api_settings").select("kill_switch, endpoint_overrides, updated_at").limit(1).maybeSingle();
        return new Response(JSON.stringify({ settings: data }), { status: 200, headers: corsHeaders });
      }
      case "list_logs": {
        let query = supabase.from("cridergpt_api_logs").select("id, user_email, endpoint, command, status, created_at, flags").order("created_at", { ascending: false }).limit(500);
        if ((body as any).user_email) query = query.ilike("user_email", `%${(body as any).user_email}%`);
        if ((body as any).from) query = query.gte("created_at", (body as any).from);
        if ((body as any).to) query = query.lte("created_at", (body as any).to);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ logs: data }), { status: 200, headers: corsHeaders });
      }
      case "upsert_keyword": {
        const payload = {
          keyword: (body as any).keyword,
          action: (body as any).action_name,
          description: (body as any).description ?? null,
          active: (body as any).active ?? true,
          updated_at: new Date().toISOString(),
        };
        if ((body as any).id) {
          const { error } = await supabase.from("api_keywords").update(payload).eq("id", (body as any).id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("api_keywords").insert(payload);
          if (error) throw error;
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
    }
  } catch (e) {
    console.error("cridergpt-admin error", e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: corsHeaders });
  }
});
