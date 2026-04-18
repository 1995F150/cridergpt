import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  loadFullCatalog,
  summarizeCatalogForAI,
  lookupOrdersForUser,
  createCheckoutLink,
  type CatalogProduct,
} from "../_shared/catalog.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function scoreProduct(p: CatalogProduct, q: string): number {
  const hay = [p.title, p.description ?? '', p.category ?? '', p.tags.join(' '), p.product_type, p.source]
    .join(' ').toLowerCase();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const t of terms) if (hay.includes(t)) score += 1;
  return score;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { tool, args = {} } = await req.json();

    // Identify caller
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let userEmail: string | null = null;
    if (authHeader) {
      const supa = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supa.auth.getUser();
      userId = user?.id ?? null;
      userEmail = user?.email ?? null;
    }

    const origin = req.headers.get('origin') || 'https://cridergpt.lovable.app';

    switch (tool) {
      case 'list_catalog': {
        const products = await loadFullCatalog();
        return jsonRes({ products, summary: summarizeCatalogForAI(products) });
      }

      case 'search_products': {
        const q = String(args.query || '').trim();
        const category = args.category ? String(args.category) : null;
        const products = await loadFullCatalog();
        let filtered = products;
        if (category) filtered = filtered.filter(p => p.category === category);
        if (q) {
          filtered = filtered
            .map(p => ({ p, s: scoreProduct(p, q) }))
            .filter(x => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .map(x => x.p);
        }
        const top = filtered.slice(0, 10);
        return jsonRes({ count: top.length, products: top, summary: summarizeCatalogForAI(top) });
      }

      case 'recommend_products': {
        const need = String(args.need || args.query || '').trim();
        const products = await loadFullCatalog();
        const ranked = products
          .map(p => ({ p, s: scoreProduct(p, need) }))
          .sort((a, b) => b.s - a.s)
          .slice(0, 5)
          .map(x => x.p);
        return jsonRes({
          recommendations: ranked,
          summary: summarizeCatalogForAI(ranked),
        });
      }

      case 'lookup_order': {
        if (!userId) return jsonRes({ error: 'Sign in required to look up orders' });
        const orders = await lookupOrdersForUser(userId, userEmail);
        return jsonRes({ count: orders.length, orders });
      }

      case 'create_checkout_link': {
        const productRef = String(args.product_ref || args.product_id || '');
        const quantity = Math.max(1, Math.min(99, Number(args.quantity) || 1));
        if (!productRef) return jsonRes({ error: 'product_ref is required' });
        const result = await createCheckoutLink(productRef, quantity, userEmail, origin);
        return jsonRes(result);
      }

      case 'add_to_cart': {
        if (!userId) return jsonRes({ error: 'Sign in required to add items to cart' });
        const productId = String(args.product_id || '');
        const quantity = Math.max(1, Math.min(99, Number(args.quantity) || 1));
        if (!productId) return jsonRes({ error: 'product_id is required' });
        const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const admin = createClient(SUPABASE_URL, SERVICE_KEY);
        const { data: existing } = await admin
          .from('store_cart_items')
          .select('id, quantity')
          .eq('user_id', userId)
          .eq('product_id', productId)
          .maybeSingle();
        if (existing) {
          await admin.from('store_cart_items').update({
            quantity: existing.quantity + quantity,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await admin.from('store_cart_items').insert({
            user_id: userId, product_id: productId, quantity,
          });
        }
        return jsonRes({ ok: true, cart_url: `${origin}/store?cart=1` });
      }

      default:
        return jsonRes({ error: `Unknown tool: ${tool}` }, 400);
    }
  } catch (err) {
    console.error('[product-tools] error:', err);
    return jsonRes({ error: (err as Error).message }, 500);
  }
});

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
