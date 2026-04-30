// CriderGPT Public API — external sites/apps call this with an API key
// generated from the Dev Panel.
//
// POST /cridergpt-public-api
// Header: Authorization: Bearer cgpt_live_xxxxxxxx
// Body: { message: string, model?: string, conversation?: [{role, content}] }
//
// Response: { response: string, model: string, routed_to: 'local'|'cloud', latency_ms }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { decideRoute, callLocalOllama, type HybridSettings } from "../_shared/hybrid-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cridergpt-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // --- Auth: API key from Authorization or x-cridergpt-key ---
    const auth = req.headers.get("authorization") || "";
    const headerKey = req.headers.get("x-cridergpt-key") || "";
    const rawKey = (auth.startsWith("Bearer ") ? auth.slice(7) : headerKey).trim();
    if (!rawKey || !rawKey.startsWith("cgpt_")) {
      return json({ error: "Missing API key. Send 'Authorization: Bearer cgpt_...'" }, 401);
    }
    const keyHash = await sha256Hex(rawKey);

    const { data: keyRow } = await admin
      .from("cridergpt_public_api_keys")
      .select("id, user_id, scopes, rate_limit_per_min, is_active, expires_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (!keyRow || !keyRow.is_active) return json({ error: "Invalid or revoked API key" }, 401);
    if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
      return json({ error: "API key expired" }, 401);
    }
    if (!keyRow.scopes?.includes("chat")) return json({ error: "Key lacks 'chat' scope" }, 403);

    // --- Rate limit (per-minute) ---
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recent } = await admin
      .from("cridergpt_public_api_usage")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", keyRow.id)
      .gte("created_at", oneMinAgo);
    if ((recent ?? 0) >= keyRow.rate_limit_per_min) {
      return json({ error: "Rate limit exceeded", retry_after_seconds: 60 }, 429);
    }

    // --- Body ---
    const body = await req.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    if (!message) return json({ error: "message is required" }, 400);
    const conversation = Array.isArray(body.conversation) ? body.conversation.slice(-10) : [];
    const requestedModel = String(body.model || "").trim();

    // --- Hybrid router (uses key owner's settings) ---
    const { data: hs } = await admin
      .from("hybrid_router_settings")
      .select("enabled, local_endpoint, local_model, prefer_local_for, cloud_fallback, max_local_latency_ms")
      .eq("user_id", keyRow.user_id)
      .maybeSingle();
    const hybridSettings: HybridSettings | null = hs as HybridSettings | null;

    const messages = [
      { role: "system", content: "You are CriderGPT — a helpful assistant. Keep replies clear and concise. Match the casual voice of the platform." },
      ...conversation,
      { role: "user", content: message },
    ];

    let routedTo: "local" | "cloud" = "cloud";
    let responseText = "";
    let modelUsed = requestedModel || "google/gemini-3-flash-preview";

    const decision = decideRoute({ message }, hybridSettings);
    if (decision.route === "local" && decision.endpoint && decision.model) {
      const localRes = await callLocalOllama(decision.endpoint, decision.model, messages, {
        temperature: 0.7,
        max_tokens: 1024,
        timeout_ms: hybridSettings?.max_local_latency_ms || 30000,
      });
      if (localRes.ok) {
        responseText = localRes.data?.choices?.[0]?.message?.content || "";
        modelUsed = `local/${decision.model}`;
        routedTo = "local";
      } else if (hybridSettings && !hybridSettings.cloud_fallback) {
        await logUsage(admin, keyRow.id, keyRow.user_id, 502, "local", Date.now() - t0);
        return json({ error: `Local AI failed: ${localRes.error}` }, 502);
      }
    }

    if (!responseText) {
      // Cloud fallback via Lovable AI Gateway
      if (!LOVABLE_API_KEY) {
        return json({ error: "Cloud AI not configured" }, 500);
      }
      const cloudRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelUsed, messages, max_tokens: 1024, temperature: 0.7 }),
      });
      if (!cloudRes.ok) {
        const errText = await cloudRes.text();
        await logUsage(admin, keyRow.id, keyRow.user_id, cloudRes.status, "cloud", Date.now() - t0);
        if (cloudRes.status === 429) return json({ error: "Upstream rate limit" }, 429);
        if (cloudRes.status === 402) return json({ error: "Workspace credits exhausted" }, 402);
        return json({ error: `Cloud error: ${errText}` }, 502);
      }
      const data = await cloudRes.json();
      responseText = data?.choices?.[0]?.message?.content || "";
    }

    const latency = Date.now() - t0;
    await logUsage(admin, keyRow.id, keyRow.user_id, 200, routedTo, latency);
    await admin.from("cridergpt_public_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

    return json({
      response: responseText,
      model: modelUsed,
      routed_to: routedTo,
      latency_ms: latency,
    });
  } catch (e) {
    console.error("public-api error", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});

async function logUsage(admin: any, keyId: string, userId: string, status: number, routedTo: string, latency: number) {
  try {
    await admin.from("cridergpt_public_api_usage").insert({
      api_key_id: keyId,
      user_id: userId,
      endpoint: "chat",
      status,
      routed_to: routedTo,
      latency_ms: latency,
    });
  } catch (_) { /* ignore */ }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
