// Verify Google Play IAP purchase tokens server-side and grant the user their plan.
// Native Android only — CriderGPT no longer ships a Capacitor build.
// Required secrets:
//   GOOGLE_PLAY_SERVICE_ACCOUNT  - full JSON of a Play Console service account with
//                                  "View financial data" + "Manage orders and subscriptions"
//   GOOGLE_PLAY_PACKAGE_NAME     - e.g. app.cridergpt.android
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-IAP] ${step}${d}`);
};

// ---- Product → plan mapping (Play Console subscription IDs) -----------------
const PLAN_BY_PRODUCT: Record<string, "plus" | "pro"> = {
  cridergpt_plus_monthly: "plus",
  cridergpt_pro_monthly: "pro",
};

// ---- Google service-account JWT → OAuth2 access token -----------------------
function b64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlStr(s: string): string {
  return b64url(new TextEncoder().encode(s));
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getGoogleAccessToken(saJson: string): Promise<string> {
  const sa = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
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
  if (!res.ok) throw new Error(`Google token error: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

async function verifyAndroidSubscription(
  packageName: string,
  productId: string,
  purchaseToken: string,
  accessToken: string,
) {
  // v2 endpoint gives richer line-item data, but v1 is simpler & still supported.
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Play verify failed: ${JSON.stringify(json)}`);
  return json as {
    expiryTimeMillis?: string;
    paymentState?: number; // 0 pending, 1 received, 2 free trial, 3 deferred
    autoRenewing?: boolean;
    orderId?: string;
    priceAmountMicros?: string;
  };
}

// -----------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    log("Function started");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) throw new Error("Authentication failed");
    const user = userData.user;
    log("User authenticated", { userId: user.id });

    const body = await req.json();
    const {
      product_id,
      purchase_token,
      transaction_id, // Play orderId
      product_type = "subscription",
    } = body as {
      product_id: string;
      purchase_token: string;
      transaction_id?: string;
      product_type?: "subscription" | "product";
    };

    if (!product_id || !purchase_token) {
      throw new Error("Missing required fields: product_id, purchase_token");
    }
    if (!PLAN_BY_PRODUCT[product_id]) {
      throw new Error(`Unknown product_id: ${product_id}`);
    }

    // Dedup
    if (transaction_id) {
      const { data: existing } = await supabase
        .from("iap_purchases")
        .select("id")
        .eq("transaction_id", transaction_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        log("Duplicate transaction", { id: existing.id });
        return new Response(
          JSON.stringify({ success: true, status: "already_verified", purchase_id: existing.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ---- Google Play verification ------------------------------------------
    const saJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");
    const packageName =
      Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "app.cridergpt.android";

    let verified = false;
    let expiresAt: string | null = null;
    let amountCents: number | null = null;
    let orderId: string | null = transaction_id ?? null;

    if (!saJson) {
      // Dev fallback so the app still works before the service account is uploaded.
      log("GOOGLE_PLAY_SERVICE_ACCOUNT missing — DEV trust-client mode");
      verified = true;
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      const token = await getGoogleAccessToken(saJson);
      const result = await verifyAndroidSubscription(
        packageName,
        product_id,
        purchase_token,
        token,
      );
      log("Play response", result);
      // paymentState 1 = received, 2 = free trial. Either grants access.
      verified = result.paymentState === 1 || result.paymentState === 2;
      if (result.expiryTimeMillis) {
        expiresAt = new Date(parseInt(result.expiryTimeMillis, 10)).toISOString();
      }
      if (result.priceAmountMicros) {
        amountCents = Math.round(parseInt(result.priceAmountMicros, 10) / 10_000);
      }
      orderId = result.orderId ?? orderId;
    }

    // ---- Record purchase ---------------------------------------------------
    const { data: purchase, error: insertErr } = await supabase
      .from("iap_purchases")
      .insert({
        user_id: user.id,
        platform: "android",
        product_id,
        product_type,
        transaction_id: orderId,
        purchase_token,
        status: verified ? "verified" : "pending",
        amount_cents: amountCents,
        verified_at: verified ? new Date().toISOString() : null,
        expires_at: expiresAt,
        metadata: body.metadata ?? {},
      })
      .select("id")
      .single();
    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);
    log("Purchase recorded", { id: purchase.id, verified });

    if (verified) {
      const plan = PLAN_BY_PRODUCT[product_id];
      await supabase
        .from("ai_usage")
        .upsert(
          { user_id: user.id, user_plan: plan, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      await supabase.from("profiles").update({ tier: plan }).eq("user_id", user.id);
      log("Plan upgraded", { plan, expiresAt });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: verified ? "verified" : "pending",
        purchase_id: purchase.id,
        expires_at: expiresAt,
        plan: PLAN_BY_PRODUCT[product_id],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
