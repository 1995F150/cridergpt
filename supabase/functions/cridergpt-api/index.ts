import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExecuteBody = {
  message: string;
  conversation_id?: string;
  flags?: {
    use_memory?: boolean;
    store_in_training?: boolean;
    vision_memory?: boolean;
  };
  attachments?: { type: string; url: string }[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  try {
    const auth = await supabase.auth.getUser();
    const user = auth.data.user;
    const userEmail = user?.email ?? null;
    if (!user || !userEmail) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Hard lock: only Jessie may execute commands
    if (userEmail.toLowerCase() !== "jessiecrider3@gmail.com") {
      // Still log the attempt
      await supabase.from("cridergpt_api_logs").insert({
        user_id: user.id,
        user_email: userEmail,
        endpoint: "cridergpt-api",
        command: "BLOCKED: unauthorized user",
        status: "forbidden",
      });
      return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 403, headers: corsHeaders });
    }

    // Check kill switch
    const { data: settings } = await supabase.from("cridergpt_api_settings").select("kill_switch, endpoint_overrides").limit(1).maybeSingle();
    if (settings?.kill_switch) {
      await supabase.from("cridergpt_api_logs").insert({
        user_id: user.id,
        user_email: userEmail,
        endpoint: "cridergpt-api",
        command: "BLOCKED: kill_switch",
        status: "unavailable",
      });
      return new Response(JSON.stringify({ error: "API temporarily disabled" }), { status: 503, headers: corsHeaders });
    }

    const body = (await req.json()) as ExecuteBody;
    const rawMessage = body?.message?.trim() ?? "";
    if (!rawMessage) {
      return new Response(JSON.stringify({ error: "Missing message" }), { status: 400, headers: corsHeaders });
    }

    const flags = {
      use_memory: !!body.flags?.use_memory || /\buse\s+memory\b/i.test(rawMessage),
      store_in_training: !!body.flags?.store_in_training || /\bstore\s+in\s+training\b/i.test(rawMessage),
      vision_memory: !!body.flags?.vision_memory || /\bvision\s+memory\b/i.test(rawMessage),
    };

    // Simple moderation (text-only). Extend as needed for images.
    const banned = [/\bkill\b/i, /\bsuicide\b/i, /\bnuke\b/i];
    if (banned.some((r) => r.test(rawMessage))) {
      await supabase.from("cridergpt_api_logs").insert({
        user_id: user.id,
        user_email: userEmail,
        endpoint: "cridergpt-api",
        command: "BLOCKED: moderation",
        status: "rejected",
      });
      return new Response(JSON.stringify({ error: "Content rejected by moderation" }), { status: 400, headers: corsHeaders });
    }

    // Load active keywords
    const { data: keywords } = await supabase.from("api_keywords").select("keyword, action, active").eq("active", true);
        // Basic rate limit: 60 requests per minute per user
        const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
        const { count: recentCount } = await supabase
          .from("cridergpt_api_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", oneMinAgo);
        if ((recentCount ?? 0) >= 60) {
          await supabase.from("cridergpt_api_logs").insert({
            user_id: user.id,
            user_email: userEmail,
            endpoint: "cridergpt-api",
            command: "BLOCKED: rate_limit",
            status: "rate_limited",
          });
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: corsHeaders });
        }

    const normalized = rawMessage.toLowerCase();
    let matched: { keyword: string; action: string } | null = null;
    for (const k of keywords ?? []) {
      if (normalized.includes((k.keyword as string).toLowerCase())) {
        matched = { keyword: k.keyword as string, action: k.action as string };
        break;
      }
    }

    // Build lightweight context
    const contextChunks: unknown[] = [];
    if (flags.use_memory) {
      const { data: mem } = await supabase
        .from("ai_memory")
        .select("content, category, topic, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (mem) contextChunks.push({ type: "ai_memory", mem });
    }
    {
      const { data: training } = await supabase
        .from("cridergpt_training_corpus")
        .select("source, title, content, tags, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (training) contextChunks.push({ type: "training_corpus_recent", training });
    }

    // Writing style samples (Jessie)
    const { data: samples } = await supabase
      .from("writing_samples")
      .select("content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    const writingStyle = (samples ?? []).map((s) => s.content).filter(Boolean).join("\n\n");

    // Route based on keyword/action
    let endpoint = "none";
    let responsePayload: Record<string, unknown> = {};

    async function log(status: string, extra?: Partial<Record<string, unknown>>) {
      try {
        await supabase.from("cridergpt_api_logs").insert({
          user_id: user.id,
          user_email: userEmail,
          endpoint,
          command: rawMessage,
          flags,
          context: { size: contextChunks.length },
          response: extra ?? null,
          status,
        });
      } catch (_) {
        // ignore log failures
      }
    }

    if (!matched) {
      endpoint = "cridergpt-api/echo";
      await log("noop");
      return new Response(
        JSON.stringify({
          route: "noop",
          info: "No command keyword detected; message stored and logged.",
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    // Execute action
    try {
      switch (matched.action) {
      case "agent_mode":
        case "pc_agent": {
          endpoint = "fixxy-autonomous";
          // Queue task for the local Python agent
          const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {});
          await adminClient.from("agent_execution_queue").insert({
            user_id: user.id,
            command: rawMessage,
            keyword: matched.keyword,
            status: "pending",
          });
          // Also invoke fixxy-autonomous for cloud-side processing
          const { data, error } = await supabase.functions.invoke("fixxy-autonomous", {
            body: { message: rawMessage, context: contextChunks, author: userEmail },
          });
          if (error) throw error;
          responsePayload = { route: matched.action, data, agent_queued: true };
          break;
        }
        case "convert_app_code": {
          endpoint = "generate-code";
          const { data, error } = await supabase.functions.invoke("generate-code", {
            body: { prompt: rawMessage, style: writingStyle, context: contextChunks },
          });
          if (error) throw error;
          responsePayload = { route: matched.action, data };
          break;
        }
        case "open_github": {
          endpoint = "internal";
          const repo = "https://github.com/1995F150/cridergpt";
          responsePayload = { route: matched.action, url: repo, note: "Open in browser" };
          break;
        }
        case "generate_photo": {
          endpoint = "generate-ai-image";
          const { data, error } = await supabase.functions.invoke("generate-ai-image", {
            body: { prompt: rawMessage },
          });
          if (error) throw error;
          responsePayload = { route: matched.action, data };
          break;
        }
        default: {
          endpoint = "cridergpt-api/unknown";
          responsePayload = { route: matched.action, info: "Unhandled action" };
        }
      }

      // Optional: store in training
      if (flags.store_in_training) {
        const snippet = JSON.stringify(responsePayload).slice(0, 4000);
        await supabase.from("cridergpt_training_data").insert({
          user_id: user.id,
          user_email: userEmail,
          title: `Command: ${matched.action}`,
          content: `${rawMessage}\n\nResponse: ${snippet}`,
          tags: ["command", matched.action],
          source: "command",
        });
      }

      await log("ok", { route: matched.action });
      return new Response(JSON.stringify({ ...responsePayload, endpoint }), { status: 200, headers: corsHeaders });
    } catch (err) {
      console.error("cridergpt-api error", err);
      await log("error", { message: (err as Error)?.message ?? String(err) });
      return new Response(JSON.stringify({ error: "Command processing failed" }), { status: 500, headers: corsHeaders });
    }
  } catch (e) {
    console.error("cridergpt-api fatal", e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: corsHeaders });
  }
});
