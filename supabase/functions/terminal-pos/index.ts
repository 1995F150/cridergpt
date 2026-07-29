import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "";

    switch (action) {
      /* ---------- Reader discovery ---------- */
      case "list_readers": {
        const locations = await stripe.terminal.locations.list({ limit: 20 });
        const readers = await stripe.terminal.readers.list({ limit: 50 });
        return json({
          locations: locations.data.map((l) => ({ id: l.id, display_name: l.display_name })),
          readers: readers.data.map((r) => ({
            id: r.id,
            label: r.label,
            device_type: r.device_type,
            status: r.status,
            serial_number: r.serial_number,
            location: r.location,
            // Bluetooth/handheld readers (M2, BBPOS chipper) can't be driven from a browser
            server_drivable: !String(r.device_type ?? "").includes("chipper") &&
              !String(r.device_type ?? "").includes("bbpos_wisepad"),
          })),
        });
      }

      /* ---------- Mobile SDK (Reader M2 over Bluetooth) ---------- */
      case "connection_token": {
        const token = await stripe.terminal.connectionTokens.create();
        return json({ secret: token.secret });
      }

      /* ---------- Charge ---------- */
      case "charge": {
        const quantity = Math.max(1, parseInt(String(body.quantity ?? 1), 10));
        const unitPriceCents = Math.round(Number(body.unit_price ?? 0) * 100);
        const amount = Math.round(Number(body.amount ?? quantity * unitPriceCents / 100) * 100);
        if (!amount || amount < 50) return json({ error: "Amount must be at least $0.50" }, 400);

        const itemLabel: string = body.item_label || "Chicks";
        const method: string = body.method || "reader"; // 'reader' | 'link'
        const readerId: string | undefined = body.reader_id || undefined;

        const saleRow = {
          user_id: user.id,
          item_label: itemLabel,
          quantity,
          unit_price_cents: unitPriceCents,
          amount_cents: amount,
          method,
          status: "pending",
          reader_id: readerId ?? null,
          customer_name: body.customer_name ?? null,
          customer_email: body.customer_email ?? null,
          notes: body.notes ?? null,
        };

        if (method === "link") {
          const origin = req.headers.get("origin") || "https://cridergpt.com";
          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            customer_email: body.customer_email || undefined,
            line_items: [{
              price_data: {
                currency: "usd",
                unit_amount: unitPriceCents || amount,
                product_data: { name: `${itemLabel} (${quantity})` },
              },
              quantity: unitPriceCents ? quantity : 1,
            }],
            success_url: `${origin}/success`,
            cancel_url: `${origin}/cancel`,
            metadata: { pos: "cridergpt", seller: user.id, item: itemLabel },
          });

          const { data: sale } = await admin
            .from("pos_sales")
            .insert({ ...saleRow, checkout_url: session.url, payment_intent_id: session.id })
            .select()
            .single();

          return json({ mode: "link", url: session.url, sale });
        }

        // Card-present intent for the Terminal reader
        const intent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          payment_method_types: ["card_present"],
          capture_method: "automatic",
          description: `${itemLabel} x${quantity}`,
          metadata: { pos: "cridergpt", seller: user.id, item: itemLabel, quantity: String(quantity) },
        });

        const { data: sale } = await admin
          .from("pos_sales")
          .insert({ ...saleRow, payment_intent_id: intent.id })
          .select()
          .single();

        if (readerId) {
          try {
            await stripe.terminal.readers.processPaymentIntent(readerId, {
              payment_intent: intent.id,
            });
            return json({
              mode: "reader",
              reader_id: readerId,
              payment_intent_id: intent.id,
              client_secret: intent.client_secret,
              sale,
              message: "Sent to reader — have the customer tap or insert their card.",
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            // Bluetooth readers (M2) must be driven by the mobile SDK using client_secret
            return json({
              mode: "mobile_sdk",
              payment_intent_id: intent.id,
              client_secret: intent.client_secret,
              sale,
              message: `This reader can't be driven from the web. Use the CriderGPT mobile app to collect. (${msg})`,
            });
          }
        }

        return json({
          mode: "mobile_sdk",
          payment_intent_id: intent.id,
          client_secret: intent.client_secret,
          sale,
          message: "Payment ready — collect it on the reader from the mobile app.",
        });
      }

      /* ---------- Poll / finalize ---------- */
      case "check_status": {
        const id: string = body.payment_intent_id;
        if (!id) return json({ error: "payment_intent_id required" }, 400);

        let status = "unknown";
        if (id.startsWith("cs_")) {
          const s = await stripe.checkout.sessions.retrieve(id);
          status = s.payment_status === "paid" ? "succeeded" : String(s.status);
        } else {
          const pi = await stripe.paymentIntents.retrieve(id);
          status = pi.status;
        }

        if (status === "succeeded" || status === "canceled") {
          await admin
            .from("pos_sales")
            .update({ status: status === "succeeded" ? "paid" : "canceled" })
            .eq("payment_intent_id", id)
            .eq("user_id", user.id);
        }
        return json({ status });
      }

      case "cancel": {
        const readerId: string | undefined = body.reader_id;
        const id: string | undefined = body.payment_intent_id;
        if (readerId) await stripe.terminal.readers.cancelAction(readerId).catch(() => {});
        if (id && id.startsWith("pi_")) await stripe.paymentIntents.cancel(id).catch(() => {});
        if (id) {
          await admin.from("pos_sales").update({ status: "canceled" })
            .eq("payment_intent_id", id).eq("user_id", user.id);
        }
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[terminal-pos] error:", message);
    return json({ error: message }, 500);
  }
});
