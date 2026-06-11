// Google Play Real-time Developer Notifications (RTDN) receiver.
// Configured in Play Console → Monetize → Monetization setup → "Real-time developer notifications".
// Pub/Sub pushes here with no JWT (the function is public; we validate via the Play API).
//
// Pub/Sub push body shape:
//   { message: { data: base64(json), messageId, publishTime }, subscription }
// Decoded data shape (subscriptions):
//   {
//     version, packageName, eventTimeMillis,
//     subscriptionNotification: { version, notificationType, purchaseToken, subscriptionId }
//   }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[PLAY-RTDN] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

// notificationType reference:
// 1 RECOVERED  2 RENEWED  3 CANCELED  4 PURCHASED  5 ON_HOLD  6 IN_GRACE_PERIOD
// 7 RESTARTED  8 PRICE_CHANGE_CONFIRMED  9 DEFERRED  10 PAUSED  11 PAUSE_SCHEDULE_CHANGED
// 12 REVOKED  13 EXPIRED
const ACTIVE_TYPES = new Set([1, 2, 4, 6, 7]); // recovered, renewed, purchased, grace, restarted
const INACTIVE_TYPES = new Set([3, 5, 10, 12, 13]); // canceled, on_hold, paused, revoked, expired

const PLAN_BY_PRODUCT: Record<string, "plus" | "pro"> = {
  cridergpt_plus_monthly: "plus",
  cridergpt_pro_monthly: "pro",
};

// ---- service-account JWT → access token (same as verify-iap) ---------------
function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlStr = (s: string) => b64url(new TextEncoder().encode(s));
function pemToDer(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN [^-]+-----/g, "")
                  .replace(/-----END [^-]+-----/g, "")
                  .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function getAccessToken(saJson: string): Promise<string> {
  const sa = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64urlStr(JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now, exp: now + 3600,
    }));
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const jwt = `${unsigned}.${b64url(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error("Google token error: " + JSON.stringify(json));
  return json.access_token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // ALWAYS 200 to Pub/Sub unless we want a retry — log everything internally.
  try {
    const envelope = await req.json();
    const data = envelope?.message?.data;
    if (!data) {
      log("No message.data", envelope);
      return new Response("ok", { status: 200 });
    }
    const payload = JSON.parse(atob(data));
    log("Notification", payload);

    const sub = payload.subscriptionNotification;
    if (!sub) {
      // Test publish or one-time-product notification — ack and move on.
      return new Response("ok", { status: 200 });
    }
    const { notificationType, purchaseToken, subscriptionId } = sub;
    const packageName = payload.packageName ??
      Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "app.cridergpt.android";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Find the local purchase row by token.
    const { data: row } = await supabase
      .from("iap_purchases")
      .select("id, user_id, product_id")
      .eq("purchase_token", purchaseToken)
      .maybeSingle();

    if (!row) {
      log("Unknown purchase_token — RTDN arrived before client verify?", { purchaseToken });
      return new Response("ok", { status: 200 });
    }

    // Re-query Play for the freshest expiry/state.
    const saJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");
    let expiresAt: string | null = null;
    let active = ACTIVE_TYPES.has(notificationType);

    if (saJson) {
      try {
        const token = await getAccessToken(saJson);
        const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(purchaseToken)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const sub = await res.json();
        log("Play state", sub);
        if (sub.expiryTimeMillis) {
          expiresAt = new Date(parseInt(sub.expiryTimeMillis, 10)).toISOString();
          active = active && Date.now() < parseInt(sub.expiryTimeMillis, 10);
        }
      } catch (e) {
        log("Play re-query failed", { error: String(e) });
      }
    }

    if (INACTIVE_TYPES.has(notificationType)) active = false;

    // Update the purchase row.
    await supabase
      .from("iap_purchases")
      .update({
        status: active ? "verified" : "expired",
        expires_at: expiresAt,
        metadata: { last_rtdn_type: notificationType, at: new Date().toISOString() },
      })
      .eq("id", row.id);

    // Flip the user's plan.
    if (active) {
      const plan = PLAN_BY_PRODUCT[row.product_id] ?? "free";
      await supabase.from("ai_usage").upsert(
        { user_id: row.user_id, user_plan: plan, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      await supabase.from("profiles").update({ tier: plan }).eq("user_id", row.user_id);
    } else {
      await supabase.from("ai_usage").upsert(
        { user_id: row.user_id, user_plan: "free", updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      await supabase.from("profiles").update({ tier: "free" }).eq("user_id", row.user_id);
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    log("ERROR", { message: err instanceof Error ? err.message : String(err) });
    // Still 200 so Pub/Sub doesn't loop on a malformed message.
    return new Response("ok", { status: 200 });
  }
});
