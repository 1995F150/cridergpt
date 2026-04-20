// Edge function: create-worker-job
// Inserts a new job into worker_jobs for the local Ubuntu worker to pick up.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TYPES = new Set([
  "ping_test",
  "echo_text",
  // future: "ai_chat", "image_generation", "file_processing"
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { type, payload, priority, scheduled_for } = body ?? {};

    if (!type || typeof type !== "string" || !ALLOWED_TYPES.has(type)) {
      return json({ error: `Invalid job type. Allowed: ${[...ALLOWED_TYPES].join(", ")}` }, 400);
    }

    const insert = {
      type,
      payload: payload ?? {},
      priority: typeof priority === "number" ? priority : 0,
      scheduled_for: scheduled_for ?? new Date().toISOString(),
      created_by: userData.user.id,
    };

    const { data, error } = await supabase
      .from("worker_jobs")
      .insert(insert)
      .select()
      .single();

    if (error) return json({ error: error.message }, 400);
    return json({ job: data }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
