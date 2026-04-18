// Shared catalog helpers used by chat-with-ai, openai-realtime-token, and product-tools.
// Pulls products from Stripe (live) + digital_products + filter pricing tiers.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import Stripe from "https://esm.sh/stripe@18.5.0";

export interface CatalogProduct {
  id: string;
  source: 'stripe' | 'digital' | 'filter' | 'iap';
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
  product_type: string;
  stripe_price_id: string | null;
  image_url: string | null;
  category: string | null;
  tags: string[];
  active: boolean;
  metadata: Record<string, unknown>;
}

export async function loadFullCatalog(): Promise<CatalogProduct[]> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const out: CatalogProduct[] = [];

  // 1. Digital products
  try {
    const { data } = await admin
      .from('digital_products')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    for (const p of data || []) {
      out.push({
        id: p.id,
        source: 'digital',
        title: p.title,
        description: p.description,
        price_cents: p.price_cents,
        currency: p.currency,
        product_type: p.product_type,
        stripe_price_id: p.stripe_price_id,
        image_url: p.cover_image_url,
        category: p.category,
        tags: p.tags || [],
        active: p.active,
        metadata: p.metadata || {},
      });
    }
  } catch (e) {
    console.warn('[catalog] digital_products error:', e);
  }

  // 2. Stripe products + prices (physical/digital from Stripe dashboard)
  if (STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' as any });
      const products = await stripe.products.list({ active: true, limit: 100 });
      for (const prod of products.data) {
        const prices = await stripe.prices.list({ product: prod.id, active: true, limit: 5 });
        const primary = prices.data[0];
        out.push({
          id: prod.id,
          source: 'stripe',
          title: prod.name,
          description: prod.description,
          price_cents: primary?.unit_amount ?? null,
          currency: primary?.currency ?? 'usd',
          product_type: prod.shippable ? 'physical' : 'digital',
          stripe_price_id: primary?.id ?? null,
          image_url: prod.images?.[0] ?? null,
          category: (prod.metadata as any)?.category ?? null,
          tags: ((prod.metadata as any)?.tags || '').split(',').filter(Boolean),
          active: prod.active,
          metadata: prod.metadata || {},
        });
      }
    } catch (e) {
      console.warn('[catalog] Stripe error:', e);
    }
  }

  // 3. Snapchat custom filter tiers (presets)
  out.push(
    {
      id: 'filter-basic',
      source: 'filter',
      title: 'Custom Snapchat Filter — Basic',
      description: 'Simple text overlay or single image filter. 1-2 day turnaround.',
      price_cents: 1500,
      currency: 'usd',
      product_type: 'service',
      stripe_price_id: null,
      image_url: null,
      category: 'snapchat-filters',
      tags: ['snapchat', 'filter', 'design'],
      active: true,
      metadata: { tier: 'basic', order_url: '/custom-filters' },
    },
    {
      id: 'filter-standard',
      source: 'filter',
      title: 'Custom Snapchat Filter — Standard',
      description: 'Custom artwork, logo, multiple elements. 2-4 day turnaround.',
      price_cents: 3500,
      currency: 'usd',
      product_type: 'service',
      stripe_price_id: null,
      image_url: null,
      category: 'snapchat-filters',
      tags: ['snapchat', 'filter', 'design'],
      active: true,
      metadata: { tier: 'standard', order_url: '/custom-filters' },
    },
    {
      id: 'filter-premium',
      source: 'filter',
      title: 'Custom Snapchat Filter — Premium',
      description: 'Animated filters, advanced effects, multi-revision. 3-7 day turnaround.',
      price_cents: 7500,
      currency: 'usd',
      product_type: 'service',
      stripe_price_id: null,
      image_url: null,
      category: 'snapchat-filters',
      tags: ['snapchat', 'filter', 'animated', 'premium'],
      active: true,
      metadata: { tier: 'premium', order_url: '/custom-filters' },
    },
  );

  return out;
}

export function summarizeCatalogForAI(products: CatalogProduct[]): string {
  if (!products.length) return 'No products available right now.';
  const lines = products.map(p => {
    const price = p.price_cents != null ? `$${(p.price_cents / 100).toFixed(2)} ${p.currency.toUpperCase()}` : 'price varies';
    const cat = p.category ? ` [${p.category}]` : '';
    const desc = p.description ? ` — ${p.description.slice(0, 120)}` : '';
    return `• ${p.title} (${p.source}, ${p.product_type})${cat} — ${price}${desc}`;
  });
  return lines.join('\n');
}

export async function lookupOrdersForUser(userId: string, userEmail: string | null) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const orders: Array<{
    source: string;
    id: string;
    title: string;
    status: string;
    amount: string;
    date: string;
    details?: string;
  }> = [];

  // IAP / digital purchases
  try {
    const { data: iap } = await admin
      .from('iap_purchases')
      .select('id, product_id, product_type, status, amount_cents, currency, created_at, expires_at, platform')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const o of iap || []) {
      orders.push({
        source: 'iap',
        id: o.id,
        title: o.product_id,
        status: o.status,
        amount: o.amount_cents != null ? `$${(o.amount_cents / 100).toFixed(2)} ${(o.currency || 'usd').toUpperCase()}` : '—',
        date: o.created_at,
        details: `${o.product_type} on ${o.platform}${o.expires_at ? `, expires ${o.expires_at}` : ''}`,
      });
    }
  } catch (e) { console.warn('[lookup] iap error:', e); }

  // Custom filter orders (match by user_id or email)
  try {
    const filters = await admin
      .from('filter_orders')
      .select('id, filter_type, status, payment_status, agreed_price, customer_email, created_at, delivery_url')
      .or(`user_id.eq.${userId}${userEmail ? `,customer_email.eq.${userEmail}` : ''}`)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const o of filters.data || []) {
      orders.push({
        source: 'filter_order',
        id: o.id,
        title: `Snapchat Filter (${o.filter_type})`,
        status: `${o.status} / payment: ${o.payment_status}`,
        amount: o.agreed_price != null ? `$${Number(o.agreed_price).toFixed(2)}` : 'pending quote',
        date: o.created_at,
        details: o.delivery_url ? `Delivered: ${o.delivery_url}` : undefined,
      });
    }
  } catch (e) { console.warn('[lookup] filter_orders error:', e); }

  return orders;
}

export async function createCheckoutLink(
  productRef: string,
  quantity: number,
  userEmail: string | null,
  origin: string,
): Promise<{ url: string; price_id: string; title: string } | { error: string }> {
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
  if (!STRIPE_SECRET_KEY) return { error: 'Stripe not configured' };

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' as any });

  // Resolve productRef to a price_id
  let priceId: string | null = null;
  let title = productRef;

  if (productRef.startsWith('price_')) {
    priceId = productRef;
  } else if (productRef.startsWith('prod_')) {
    const prices = await stripe.prices.list({ product: productRef, active: true, limit: 1 });
    priceId = prices.data[0]?.id ?? null;
    const prod = await stripe.products.retrieve(productRef);
    title = prod.name;
  } else {
    // Try digital_products
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data } = await admin
      .from('digital_products')
      .select('title, stripe_price_id')
      .or(`id.eq.${productRef},slug.eq.${productRef}`)
      .maybeSingle();
    if (data?.stripe_price_id) {
      priceId = data.stripe_price_id;
      title = data.title;
    }
  }

  if (!priceId) return { error: `No purchasable Stripe price found for "${productRef}". This item may need to be ordered through the store or a custom quote.` };

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity }],
    mode: 'payment',
    customer_email: userEmail ?? undefined,
    success_url: `${origin}/payment-success`,
    cancel_url: `${origin}/store`,
  });

  return { url: session.url!, price_id: priceId, title };
}
