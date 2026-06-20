// Registers a native device push token (APNS for iOS, FCM for Android)
// against the authenticated user.  Idempotent upsert by (user_id, token).
//
// Request:  { platform: "ios" | "android", token: string, device_label?: string }
// Response: { ok: true }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )
    const authHeader = req.headers.get("Authorization") ?? ""
    const jwt = authHeader.replace("Bearer ", "")
    const { data: { user }, error: uerr } = await supabase.auth.getUser(jwt)
    if (uerr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { platform, token, device_label } = await req.json()
    if (!token || !["ios", "android"].includes(platform)) {
      return new Response(JSON.stringify({ error: "bad_request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { error } = await supabase
      .from("device_push_tokens")
      .upsert({
        user_id: user.id,
        platform,
        token,
        device_label: device_label ?? null,
        enabled: true,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id,token" })

    if (error) throw error
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    console.error("[register-device-token]", e)
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
