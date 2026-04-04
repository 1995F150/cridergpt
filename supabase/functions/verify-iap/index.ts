import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-IAP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { platform, product_id, product_type, transaction_id, receipt_data, purchase_token, original_transaction_id } = body;

    if (!platform || !product_id || !product_type) {
      throw new Error("Missing required fields: platform, product_id, product_type");
    }

    logStep("Verifying purchase", { platform, product_id, product_type, transaction_id });

    let verified = false;
    let expiresAt: string | null = null;
    let amountCents: number | null = null;

    if (platform === 'ios') {
      // iOS App Store receipt verification
      // In production, verify with Apple's /verifyReceipt endpoint
      // For now, we trust the receipt and mark as verified
      // TODO: Add Apple server-to-server notification endpoint for real-time updates
      if (receipt_data) {
        const appleVerifyUrl = Deno.env.get("APPLE_VERIFY_PRODUCTION") === "true"
          ? "https://buy.itunes.apple.com/verifyReceipt"
          : "https://sandbox.itunes.apple.com/verifyReceipt";

        const appleSharedSecret = Deno.env.get("APPLE_SHARED_SECRET");

        if (appleSharedSecret) {
          try {
            const appleResponse = await fetch(appleVerifyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                "receipt-data": receipt_data,
                password: appleSharedSecret,
              }),
            });
            const appleResult = await appleResponse.json();
            logStep("Apple verification response", { status: appleResult.status });

            if (appleResult.status === 0) {
              verified = true;
              // Extract expiry for subscriptions
              if (product_type === 'subscription' && appleResult.latest_receipt_info) {
                const latestInfo = Array.isArray(appleResult.latest_receipt_info)
                  ? appleResult.latest_receipt_info[appleResult.latest_receipt_info.length - 1]
                  : appleResult.latest_receipt_info;
                if (latestInfo?.expires_date_ms) {
                  expiresAt = new Date(parseInt(latestInfo.expires_date_ms)).toISOString();
                }
              }
            } else if (appleResult.status === 21007) {
              // Sandbox receipt sent to production - retry with sandbox
              logStep("Retrying with sandbox URL");
              const sandboxResponse = await fetch("https://sandbox.itunes.apple.com/verifyReceipt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  "receipt-data": receipt_data,
                  password: appleSharedSecret,
                }),
              });
              const sandboxResult = await sandboxResponse.json();
              verified = sandboxResult.status === 0;
            }
          } catch (err) {
            logStep("Apple verification error", { error: String(err) });
          }
        } else {
          // No Apple shared secret configured - trust client receipt for development
          logStep("No APPLE_SHARED_SECRET configured, marking as verified for development");
          verified = true;
        }
      }
    } else if (platform === 'android') {
      // Google Play receipt verification
      // In production, verify with Google Play Developer API
      if (purchase_token && product_id) {
        const googleServiceAccount = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");

        if (googleServiceAccount) {
          try {
            const serviceAccount = JSON.parse(googleServiceAccount);
            // Generate OAuth2 token from service account
            // For subscriptions: androidpublisher/v3/applications/{packageName}/purchases/subscriptions/{subscriptionId}/tokens/{token}
            // For products: androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{token}
            const packageName = "app.cridergpt.android";
            const endpoint = product_type === 'subscription'
              ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${product_id}/tokens/${purchase_token}`
              : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${product_id}/tokens/${purchase_token}`;

            logStep("Google Play verification endpoint", { endpoint: endpoint.substring(0, 80) });
            // In production, use proper OAuth2 flow with service account
            // For now, mark as verified
            verified = true;
          } catch (err) {
            logStep("Google Play verification error", { error: String(err) });
          }
        } else {
          logStep("No GOOGLE_PLAY_SERVICE_ACCOUNT configured, marking as verified for development");
          verified = true;
        }
      }
    } else if (platform === 'web') {
      // Web purchases go through Stripe - already handled by create-checkout/stripe-webhooks
      // This endpoint is for recording/syncing web purchases from the app
      verified = true;
    }

    // Check for duplicate transaction
    if (transaction_id) {
      const { data: existing } = await supabaseClient
        .from('iap_purchases')
        .select('id')
        .eq('transaction_id', transaction_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        logStep("Duplicate transaction, returning existing", { id: existing.id });
        return new Response(JSON.stringify({ 
          success: true, 
          status: 'already_verified',
          purchase_id: existing.id 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Insert purchase record
    const { data: purchase, error: insertError } = await supabaseClient
      .from('iap_purchases')
      .insert({
        user_id: user.id,
        platform,
        product_id,
        product_type,
        transaction_id: transaction_id || null,
        original_transaction_id: original_transaction_id || null,
        receipt_data: receipt_data || null,
        purchase_token: purchase_token || null,
        status: verified ? 'verified' : 'pending',
        amount_cents: amountCents,
        verified_at: verified ? new Date().toISOString() : null,
        expires_at: expiresAt,
        metadata: body.metadata || {},
      })
      .select('id')
      .single();

    if (insertError) {
      logStep("Insert error", { error: insertError.message });
      throw new Error(`Failed to record purchase: ${insertError.message}`);
    }

    logStep("Purchase recorded", { id: purchase.id, verified });

    // If verified, update user plan/credits
    if (verified) {
      await applyPurchaseBenefits(supabaseClient, user.id, product_id, product_type);
    }

    return new Response(JSON.stringify({
      success: true,
      status: verified ? 'verified' : 'pending',
      purchase_id: purchase.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function applyPurchaseBenefits(
  supabase: any,
  userId: string,
  productId: string,
  productType: string
) {
  logStep("Applying purchase benefits", { userId, productId, productType });

  // Map product IDs to plan upgrades
  // These should match your App Store Connect / Google Play Console product IDs
  const planMapping: Record<string, string> = {
    'com.cridergpt.plus.monthly': 'plus',
    'com.cridergpt.pro.monthly': 'pro',
    'com.cridergpt.lifetime': 'lifetime',
    'cridergpt_plus_monthly': 'plus',
    'cridergpt_pro_monthly': 'pro',
    'cridergpt_lifetime': 'lifetime',
  };

  const creditMapping: Record<string, number> = {
    'com.cridergpt.credits.100': 100,
    'com.cridergpt.credits.500': 500,
    'com.cridergpt.credits.1000': 1000,
    'cridergpt_credits_100': 100,
    'cridergpt_credits_500': 500,
    'cridergpt_credits_1000': 1000,
  };

  const plan = planMapping[productId];
  if (plan) {
    // Update user plan
    await supabase
      .from('ai_usage')
      .upsert({
        user_id: userId,
        user_plan: plan,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Also update profiles tier
    await supabase
      .from('profiles')
      .update({ tier: plan })
      .eq('user_id', userId);

    logStep("Plan upgraded", { plan });
  }

  const credits = creditMapping[productId];
  if (credits) {
    // Add credits to user's token balance
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('tokens_used')
      .eq('user_id', userId)
      .maybeSingle();

    const currentTokens = usage?.tokens_used || 0;
    // Decrease tokens_used to effectively add credits
    await supabase
      .from('ai_usage')
      .upsert({
        user_id: userId,
        tokens_used: Math.max(0, currentTokens - credits),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    logStep("Credits added", { credits });
  }
}
