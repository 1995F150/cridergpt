// CriderGPT SMS — sends SMS to the authenticated user's verified phone via Twilio Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const message: string = (body.message || "").toString().slice(0, 1500);
    const overrideTo: string | undefined = body.to;
    if (!message) return json({ error: "message required" }, 400);

    // Load user's SMS settings
    const { data: settings } = await supabase
      .from("sms_settings")
      .select("phone_number, notifications_enabled, twilio_from_number")
      .eq("user_id", user.id)
      .maybeSingle();

    const toNumber = overrideTo || settings?.phone_number;
    if (!toNumber) return json({ error: "No phone number on file" }, 400);
    if (settings && settings.notifications_enabled === false) {
      return json({ error: "Notifications disabled" }, 403);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM =
      settings?.twilio_from_number ||
      Deno.env.get("TWILIO_FROM_NUMBER") ||
      Deno.env.get("TWILIO_PHONE_NUMBER");

    // If Twilio isn't configured yet, log to sms_log as 'pending_config' so the wiring is verifiable
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await admin.from("sms_log").insert({
        user_id: user.id,
        to_number: toNumber,
        body: message,
        status: "pending_config",
        error: "Twilio connector or FROM number not configured yet",
      });
      return json(
        {
          ok: false,
          status: "pending_config",
          message:
            "SMS wired but Twilio connector / FROM number not configured. Connect Twilio to enable.",
        },
        200
      );
    }

    const tw = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toNumber, From: FROM, Body: message }),
    });

    const twData = await tw.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!tw.ok) {
      await admin.from("sms_log").insert({
        user_id: user.id,
        to_number: toNumber,
        body: message,
        status: "failed",
        error: JSON.stringify(twData).slice(0, 500),
      });
      return json({ error: "Twilio error", details: twData }, 502);
    }

    await admin.from("sms_log").insert({
      user_id: user.id,
      to_number: toNumber,
      body: message,
      twilio_sid: twData.sid,
      status: twData.status || "sent",
    });

    return json({ ok: true, sid: twData.sid, status: twData.status });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
