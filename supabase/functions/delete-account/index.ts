// Delete the authenticated user's account and associated data
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Best-effort cleanup of user-owned rows in commonly-keyed tables.
    // auth.users cascade rules + FKs should handle most, but we clear here
    // to be safe across older tables that may lack ON DELETE CASCADE.
    const tables = [
      "ai_memory", "ai_interactions", "ai_feedback", "ai_usage",
      "chat_conversations", "chat_messages", "imported_messages",
      "media_generations", "vision_memory", "user_patterns",
      "user_preferences", "user_notifications", "user_streaks",
      "user_ffa_profiles", "user_profiles", "user_contacts",
      "user_reference_library", "user_activity_log", "pending_tasks",
      "idea_planner_ideas", "livestock_animals", "livestock_notes",
      "livestock_weights", "livestock_health_records", "livestock_scan_logs",
      "calendar_events", "events", "push_subscriptions",
      "digest_preferences", "spending_entries", "referral_codes",
      "platform_subscriptions", "subscriptions", "customers",
      "profiles", "user_roles", "buyers",
    ];
    const results: Record<string, string> = {};
    for (const t of tables) {
      const { error } = await admin.from(t).delete().eq("user_id", userId);
      if (error) {
        // try id-keyed tables (profiles/buyers sometimes use id)
        const { error: e2 } = await admin.from(t).delete().eq("id", userId);
        results[t] = e2 ? `skip:${error.message}` : "ok(id)";
      } else {
        results[t] = "ok";
      }
    }

    // Finally, delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(
        JSON.stringify({ error: delErr.message, cleanup: results }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, cleanup: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
