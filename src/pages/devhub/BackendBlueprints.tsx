import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Database, ShieldCheck, Webhook, Mail, ListChecks, Code2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Block = {
  id: string;
  title: string;
  desc: string;
  icon: any;
  language: "sql" | "ts" | "bash" | "text";
  code: string;
};

type Blueprint = {
  slug: string;
  name: string;
  pkg: string;
  tagline: string;
  supabaseProject: string;
  secrets: string[];
  edgeFunctions: { name: string; purpose: string }[];
  blocks: Block[];
};

const HIM_AND_HER: Blueprint = {
  slug: "him-and-her",
  name: "A: Single-Seller (Aunt Only)",
  pkg: "com.crider.himandher",
  tagline: "Aunt is the ONLY seller. Customers browse + buy. Stripe Checkout straight to her account.",
  supabaseProject: "Create a NEW Supabase project (do not reuse CriderGPT). Name it 'himandher-boutique'.",
  secrets: [
    "STRIPE_SECRET_KEY  (sk_live_... or sk_test_...)",
    "STRIPE_WEBHOOK_SECRET  (whsec_... from Stripe dashboard → Webhooks)",
    "RESEND_API_KEY  (for order receipt emails)",
    "SHIPPING_FROM_ZIP  (origin ZIP, e.g. 24293)",
  ],
  edgeFunctions: [
    { name: "create-checkout", purpose: "Builds a Stripe Checkout Session from the user's cart, returns hosted URL." },
    { name: "stripe-webhook", purpose: "Receives checkout.session.completed → marks order paid, decrements inventory, fires receipt email." },
    { name: "send-receipt", purpose: "Sends branded HTML receipt via Resend." },
    { name: "shipping-quote", purpose: "Calls USPS/UPS rate API for live shipping cost at checkout." },
  ],
  blocks: [
    {
      id: "01-extensions",
      title: "1. Enable extensions",
      desc: "Run first. Enables UUID + crypto helpers.",
      icon: Database,
      language: "sql",
      code: `create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";`,
    },
    {
      id: "02-roles",
      title: "2. User roles (admin/customer)",
      desc: "Separate roles table — NEVER put role on profiles. Prevents privilege escalation.",
      icon: ShieldCheck,
      language: "sql",
      code: `create type public.app_role as enum ('admin', 'staff', 'customer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users see their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

-- Security-definer helper (prevents recursive RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;`,
    },
    {
      id: "03-customers",
      title: "3. Customers / profiles",
      desc: "Customer profile + saved shipping addresses.",
      icon: Database,
      language: "sql",
      code: `create table public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  stripe_customer_id text unique,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.customers to authenticated;
grant all on public.customers to service_role;

alter table public.customers enable row level security;

create policy "Customers manage own row"
  on public.customers for all
  to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Admins read all customers"
  on public.customers for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.customer_addresses to authenticated;
grant all on public.customer_addresses to service_role;

alter table public.customer_addresses enable row level security;

create policy "Customers manage own addresses"
  on public.customer_addresses for all
  to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());`,
    },
    {
      id: "04-products",
      title: "4. Products + variants + inventory",
      desc: "Product catalog with size/color variants. Inventory tracked per variant.",
      icon: Database,
      language: "sql",
      code: `create type public.gender_section as enum ('him', 'her', 'unisex');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  section gender_section not null,
  category text not null,           -- tops, bottoms, outerwear, accessories
  base_price_cents int not null,
  compare_at_cents int,             -- for "was $X" strike-through
  hero_image_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.products(section, category) where is_active;
create index on public.products(is_featured) where is_active and is_featured;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique not null,
  size text,
  color text,
  price_cents int,                  -- null = use product base_price
  inventory_qty int not null default 0,
  low_stock_threshold int not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index on public.product_variants(product_id);

-- Public read for storefront
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant all on public.products to service_role;
grant all on public.product_images to service_role;
grant all on public.product_variants to service_role;

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;

create policy "Anyone reads active products"
  on public.products for select using (is_active = true);
create policy "Admins write products"
  on public.products for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

create policy "Anyone reads product images"
  on public.product_images for select using (true);
create policy "Admins write product images"
  on public.product_images for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

create policy "Anyone reads active variants"
  on public.product_variants for select using (is_active = true);
create policy "Admins write variants"
  on public.product_variants for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));`,
    },
    {
      id: "05-orders",
      title: "5. Orders + order items",
      desc: "Order header + line items. Paid status only set by Stripe webhook (server-side).",
      icon: Database,
      language: "sql",
      code: `create type public.order_status as enum (
  'pending', 'paid', 'fulfilled', 'shipped', 'delivered', 'refunded', 'cancelled'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('HH-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  customer_id uuid references public.customers(id),
  guest_email text,                 -- for guest checkout
  status order_status not null default 'pending',
  subtotal_cents int not null,
  shipping_cents int not null default 0,
  tax_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents int not null,
  currency text not null default 'usd',
  promo_code text,
  stripe_session_id text unique,
  stripe_payment_intent text,
  shipping_address jsonb,
  tracking_number text,
  tracking_carrier text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz
);

create index on public.orders(customer_id);
create index on public.orders(status);
create index on public.orders(created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  product_name text not null,       -- snapshot at purchase
  variant_label text,               -- "Black / M"
  qty int not null,
  unit_price_cents int not null,
  line_total_cents int not null
);

create index on public.order_items(order_id);

grant select, insert on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;
grant all on public.orders to service_role;
grant all on public.order_items to service_role;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Customers see own orders"
  on public.orders for select to authenticated
  using (customer_id = auth.uid());
create policy "Customers create own orders"
  on public.orders for insert to authenticated
  with check (customer_id = auth.uid() and status = 'pending');
create policy "Admins see all orders"
  on public.orders for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

create policy "Customers see own order items"
  on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "Customers add items to own pending orders"
  on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'pending'));
create policy "Admins manage all order items"
  on public.order_items for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));`,
    },
    {
      id: "06-promo",
      title: "6. Promo codes + wishlists",
      desc: "Discount engine + saved wishlist per customer.",
      icon: Database,
      language: "sql",
      code: `create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  amount int not null,              -- percent (1-100) OR cents
  min_subtotal_cents int default 0,
  max_uses int,
  uses_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

grant select on public.promo_codes to anon, authenticated;
grant all on public.promo_codes to service_role;

alter table public.promo_codes enable row level security;
create policy "Anyone reads active promos" on public.promo_codes for select
  using (is_active = true and (ends_at is null or ends_at > now()));
create policy "Admins manage promos" on public.promo_codes for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

grant select, insert, delete on public.wishlists to authenticated;
grant all on public.wishlists to service_role;

alter table public.wishlists enable row level security;
create policy "Customers manage own wishlist"
  on public.wishlists for all to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());`,
    },
    {
      id: "07-triggers",
      title: "7. updated_at + customer auto-create",
      desc: "Keeps updated_at fresh; auto-creates customer row on signup.",
      icon: Database,
      language: "sql",
      code: `create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_products_updated before update on public.products
  for each row execute function public.touch_updated_at();
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.touch_updated_at();

-- Auto-create customer row + default 'customer' role on signup
create or replace function public.handle_new_customer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_customer();`,
    },
    {
      id: "08-storage",
      title: "8. Storage bucket for product photos",
      desc: "Public bucket so the storefront can show images without auth.",
      icon: Database,
      language: "sql",
      code: `insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admins upload product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  );

create policy "Admins delete product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  );`,
    },
    {
      id: "09-seed-admin",
      title: "9. Make your aunt an admin",
      desc: "Run AFTER she signs up the first time. Replace the email.",
      icon: ShieldCheck,
      language: "sql",
      code: `insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'AUNT_EMAIL_HERE@example.com'
on conflict (user_id, role) do nothing;`,
    },
    {
      id: "10-fn-create-checkout",
      title: "Edge fn: create-checkout/index.ts",
      desc: "Builds a Stripe Checkout Session from cart items, supports guest + logged-in.",
      icon: Code2,
      language: "ts",
      code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { items, email, shipping_address, promo_code } = await req.json();
    // items: [{ variant_id, qty }]

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up variants + price server-side (NEVER trust client prices)
    const ids = items.map((i: any) => i.variant_id);
    const { data: variants } = await supa
      .from("product_variants")
      .select("id, sku, size, color, price_cents, inventory_qty, product:products(name, base_price_cents, hero_image_url)")
      .in("id", ids);

    if (!variants?.length) throw new Error("No valid items");

    const line_items = items.map((i: any) => {
      const v: any = variants.find((x: any) => x.id === i.variant_id);
      if (!v) throw new Error("Variant missing");
      if (v.inventory_qty < i.qty) throw new Error(\`Out of stock: \${v.product.name}\`);
      const price = v.price_cents ?? v.product.base_price_cents;
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: \`\${v.product.name} — \${v.size ?? ""} \${v.color ?? ""}\`.trim(),
            images: v.product.hero_image_url ? [v.product.hero_image_url] : [],
          },
          unit_amount: price,
        },
        quantity: i.qty,
      };
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Create pending order row first so webhook can match by session id
    const subtotal = line_items.reduce((s: number, li: any) => s + li.price_data.unit_amount * li.quantity, 0);
    const { data: order } = await supa.from("orders").insert({
      guest_email: email,
      status: "pending",
      subtotal_cents: subtotal,
      total_cents: subtotal,
      shipping_address,
      promo_code,
    }).select().single();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      customer_email: email,
      shipping_address_collection: { allowed_countries: ["US"] },
      success_url: \`\${req.headers.get("origin")}/order/success?id=\${order!.id}\`,
      cancel_url: \`\${req.headers.get("origin")}/cart\`,
      metadata: { order_id: order!.id },
    });

    await supa.from("orders").update({ stripe_session_id: session.id }).eq("id", order!.id);

    return new Response(JSON.stringify({ url: session.url, order_id: order!.id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});`,
    },
    {
      id: "11-fn-stripe-webhook",
      title: "Edge fn: stripe-webhook/index.ts",
      desc: "Verifies Stripe signature, marks order paid, decrements inventory, fires receipt.",
      icon: Webhook,
      language: "ts",
      code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// IMPORTANT: add this function to supabase/config.toml with verify_jwt = false
serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (e: any) {
    return new Response(\`Webhook Error: \${e.message}\`, { status: 400 });
  }

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const orderId = s.metadata?.order_id;
    if (!orderId) return new Response("no order id", { status: 200 });

    await supa.from("orders").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent: s.payment_intent as string,
      total_cents: s.amount_total ?? 0,
      shipping_cents: s.shipping_cost?.amount_total ?? 0,
      tax_cents: s.total_details?.amount_tax ?? 0,
    }).eq("id", orderId);

    // Decrement inventory
    const { data: items } = await supa.from("order_items").select("variant_id, qty").eq("order_id", orderId);
    for (const it of items ?? []) {
      await supa.rpc("decrement_inventory", { _variant: it.variant_id, _qty: it.qty });
    }

    // Fire receipt
    await supa.functions.invoke("send-receipt", { body: { order_id: orderId } });
  }

  if (event.type === "charge.refunded") {
    const c = event.data.object as Stripe.Charge;
    await supa.from("orders").update({ status: "refunded" }).eq("stripe_payment_intent", c.payment_intent as string);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});`,
    },
    {
      id: "12-fn-send-receipt",
      title: "Edge fn: send-receipt/index.ts",
      desc: "Sends branded HTML receipt via Resend.",
      icon: Mail,
      language: "ts",
      code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const { order_id } = await req.json();

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await supa.from("orders").select("*, order_items(*)").eq("id", order_id).single();
  if (!order) return new Response("not found", { status: 404 });

  const to = order.guest_email || (await supa.from("customers").select("email").eq("id", order.customer_id).single()).data?.email;
  if (!to) return new Response("no email", { status: 400 });

  const lines = order.order_items.map((it: any) =>
    \`<tr><td>\${it.product_name} \${it.variant_label ?? ""}</td><td>\${it.qty}</td><td>$\${(it.line_total_cents/100).toFixed(2)}</td></tr>\`
  ).join("");

  const html = \`
    <div style="font-family:system-ui;max-width:560px;margin:auto;padding:24px">
      <h1 style="color:#1a1a1a">Him and Her Boutique</h1>
      <p>Thanks for your order, <strong>#\${order.order_number}</strong>!</p>
      <table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>\${lines}</tbody></table>
      <p style="margin-top:16px"><strong>Total: $\${(order.total_cents/100).toFixed(2)}</strong></p>
    </div>\`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": \`Bearer \${Deno.env.get("RESEND_API_KEY")}\`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Him and Her <orders@himandherboutique.com>",
      to: [to],
      subject: \`Order #\${order.order_number} confirmed\`,
      html,
    }),
  });

  return new Response(JSON.stringify({ sent: r.ok }), { headers: { ...cors, "Content-Type": "application/json" } });
});`,
    },
    {
      id: "13-inventory-rpc",
      title: "Inventory decrement RPC",
      desc: "Server-side atomic decrement called from the webhook.",
      icon: Database,
      language: "sql",
      code: `create or replace function public.decrement_inventory(_variant uuid, _qty int)
returns void language sql security definer set search_path = public as $$
  update public.product_variants
  set inventory_qty = greatest(0, inventory_qty - _qty)
  where id = _variant;
$$;`,
    },
    {
      id: "14-checklist",
      title: "Post-SQL checklist",
      desc: "Do these in order after the migrations run clean.",
      icon: ListChecks,
      language: "text",
      code: `[ ] Enable Email auth in Supabase → Authentication → Providers
[ ] Add Google OAuth (optional but recommended for boutique shoppers)
[ ] Add the 4 secrets listed at the top of this page
[ ] In supabase/config.toml: set verify_jwt = false for stripe-webhook
[ ] Create Stripe webhook → URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
    Events: checkout.session.completed, charge.refunded
    Copy the signing secret → STRIPE_WEBHOOK_SECRET
[ ] Deploy edge functions: create-checkout, stripe-webhook, send-receipt
[ ] Verify Resend domain (himandherboutique.com)
[ ] Upload first 5-10 products via the admin dashboard
[ ] Run a $0.50 test order with Stripe test card 4242 4242 4242 4242
[ ] Flip Stripe to live mode, swap keys, run a real $1 order
[ ] List on Google Play under your Crider dev account, package com.crider.himandher`,
    },
  ],
};

// ============================================================
// MARKETPLACE BLUEPRINT (Option B - anyone can sell)
// ============================================================
const MARKETPLACE: Blueprint = {
  slug: "him-and-her-marketplace",
  name: "B: Multi-Vendor Marketplace ($12.99/mo seller membership)",
  pkg: "com.crider.himandher",
  tagline: "Youth clothing marketplace. Anyone can sell — but must hold an active $12.99/mo Seller Membership to list. Stripe Connect splits each sale to the seller; platform takes a % cut on top of the membership.",
  supabaseProject: "SAME new Supabase project as Option A — but run THIS SQL instead. Pick ONE.",
  secrets: [
    "STRIPE_SECRET_KEY  (sk_live_... or sk_test_...)",
    "STRIPE_WEBHOOK_SECRET  (whsec_...)",
    "STRIPE_CONNECT_CLIENT_ID  (ca_... from Stripe Connect settings)",
    "STRIPE_SELLER_MEMBERSHIP_PRICE_ID  (price_... for the $12.99/mo recurring price you create in Stripe)",
    "RESEND_API_KEY",
    "PLATFORM_FEE_PERCENT  (e.g. 8 = aunt takes 8% of every sale, on top of the $12.99 membership)",
  ],
  edgeFunctions: [
    { name: "create-checkout", purpose: "Builds Stripe Checkout with destination charges → seller's Connect account, platform fee deducted." },
    { name: "stripe-webhook", purpose: "Marks order paid, splits to sellers, decrements per-seller inventory, AND flips seller_memberships.active on subscription events." },
    { name: "connect-onboard", purpose: "Creates Stripe Express account + onboarding link so sellers can accept payouts." },
    { name: "seller-membership-checkout", purpose: "Starts the $12.99/mo Seller Membership subscription for the signed-in user (gate to list items)." },
    { name: "check-seller-membership", purpose: "Returns { active: boolean } so the app can show/hide the 'List an Item' button." },
    { name: "send-receipt", purpose: "Sends receipt to buyer + sale notification to each seller." },
    { name: "moderate-listing", purpose: "Admin action: hide/ban listings or sellers." },
  ],

  blocks: [
    {
      id: "m01-extensions",
      title: "1. Extensions + roles",
      desc: "Adds 'seller' role on top of admin/customer.",
      icon: Database,
      language: "sql",
      code: `create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'staff', 'seller', 'customer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create policy "Users see own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;`,
    },
    {
      id: "m02-sellers",
      title: "2. Seller shops + Stripe Connect",
      desc: "Each seller has a shop profile + their own Connect account ID for payouts.",
      icon: Database,
      language: "sql",
      code: `create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null,
  name text not null,
  bio text,
  avatar_url text,
  banner_url text,
  stripe_account_id text unique,         -- acct_... from Connect
  payouts_enabled boolean not null default false,
  is_approved boolean not null default false,  -- admin approves new shops
  is_banned boolean not null default false,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  total_sales_cents bigint default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.shops(owner_id);
create index on public.shops(is_approved, is_banned);

grant select on public.shops to anon, authenticated;
grant insert, update on public.shops to authenticated;
grant all on public.shops to service_role;

alter table public.shops enable row level security;

create policy "Public reads approved shops" on public.shops for select
  using (is_approved = true and is_banned = false);
create policy "Owner reads own shop" on public.shops for select to authenticated
  using (owner_id = auth.uid());
create policy "Owner manages own shop" on public.shops for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Authenticated users open a shop" on public.shops for insert to authenticated
  with check (owner_id = auth.uid());
create policy "Admins manage shops" on public.shops for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));`,
    },
    {
      id: "m02b-seller-memberships",
      title: "2b. Seller memberships ($12.99/mo gate)",
      desc: "Tracks who currently has an active $12.99/mo Seller Membership. Listings are blocked unless active=true.",
      icon: Database,
      language: "sql",
      code: `create table public.seller_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'inactive',          -- mirrors Stripe: active, trialing, past_due, canceled, etc.
  active boolean not null default false,            -- convenience flag (status in ('active','trialing'))
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  price_id text,                                    -- the $12.99/mo price id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.seller_memberships(active);

grant select on public.seller_memberships to authenticated;
grant all on public.seller_memberships to service_role;

alter table public.seller_memberships enable row level security;

create policy "User reads own membership" on public.seller_memberships for select to authenticated
  using (user_id = auth.uid());
create policy "Admins read all memberships" on public.seller_memberships for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
-- writes go through edge functions (service_role); no insert/update policy for users.

-- Helper used by listings RLS to enforce the membership gate
create or replace function public.has_active_seller_membership(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.seller_memberships
    where user_id = _user_id and active = true
  )
$$;

-- HARDEN listings: only insert if seller's membership is active
drop policy if exists "Sellers manage own listings" on public.listings;
create policy "Sellers insert listings (membership required)" on public.listings for insert to authenticated
  with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
    and public.has_active_seller_membership(auth.uid())
  );
create policy "Sellers update own listings" on public.listings for update to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Sellers delete own listings" on public.listings for delete to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));`,
    },
    {
      id: "m02c-fn-seller-membership-checkout",
      title: "Edge fn: seller-membership-checkout/index.ts",
      desc: "Starts the $12.99/mo Stripe subscription for the signed-in seller. Returns Checkout URL.",
      icon: Code2,
      language: "ts",
      code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const PRICE_ID = Deno.env.get("STRIPE_SELLER_MEMBERSHIP_PRICE_ID")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization")!;
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (!user?.email) throw new Error("Not authed");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: \`\${req.headers.get("origin")}/seller/dashboard?membership=ok\`,
      cancel_url: \`\${req.headers.get("origin")}/seller/membership\`,
      metadata: { user_id: user.id, purpose: "seller_membership" },
      subscription_data: { metadata: { user_id: user.id, purpose: "seller_membership" } },
    });

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: cors });
  }
});`,
    },
    {
      id: "m02d-fn-check-seller-membership",
      title: "Edge fn: check-seller-membership/index.ts",
      desc: "Returns { active } so the app can show/hide the 'List an Item' button. Also syncs from Stripe if no row yet.",
      icon: Code2,
      language: "ts",
      code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization")!;
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (!user?.email) throw new Error("Not authed");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) {
      return new Response(JSON.stringify({ active: false }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 5 });
    const sub = subs.data.find(s => ["active","trialing","past_due"].includes(s.status));
    const active = !!sub && (sub.status === "active" || sub.status === "trialing");

    await admin.from("seller_memberships").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub?.id ?? null,
      status: sub?.status ?? "inactive",
      active,
      current_period_end: sub ? new Date(sub.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: sub?.cancel_at_period_end ?? false,
      price_id: sub?.items.data[0]?.price.id ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ active, status: sub?.status ?? "inactive" }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: cors });
  }
});`,
    },
    {

      id: "m03-listings",
      title: "3. Listings (per-seller products)",
      desc: "Replaces 'products'. Each listing belongs to ONE shop.",
      icon: Database,
      language: "sql",
      code: `create type public.gender_section as enum ('him', 'her', 'unisex', 'kids');
create type public.item_condition as enum ('new', 'like_new', 'good', 'fair');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  slug text unique not null,
  name text not null,
  description text,
  section gender_section not null,
  category text not null,
  brand text,
  size text,
  color text,
  condition item_condition not null default 'new',
  price_cents int not null,
  compare_at_cents int,
  inventory_qty int not null default 1,        -- often 1 for resale items
  hero_image_url text,
  images text[] default '{}',
  tags text[] default '{}',
  is_active boolean not null default true,
  is_sold boolean not null default false,
  views_count int not null default 0,
  favorites_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.listings(shop_id);
create index on public.listings(section, category) where is_active and not is_sold;
create index on public.listings(created_at desc) where is_active and not is_sold;

grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant all on public.listings to service_role;

alter table public.listings enable row level security;

create policy "Public reads active listings" on public.listings for select
  using (is_active = true);
create policy "Sellers manage own listings" on public.listings for all to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Admins manage all listings" on public.listings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "Users manage own favorites" on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());`,
    },
    {
      id: "m04-orders",
      title: "4. Orders (split per-seller)",
      desc: "One buyer checkout = one order, but split into sub-orders per shop.",
      icon: Database,
      language: "sql",
      code: `create type public.order_status as enum ('pending','paid','shipped','delivered','refunded','cancelled','disputed');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('HH-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  buyer_id uuid references auth.users(id),
  guest_email text,
  status order_status not null default 'pending',
  subtotal_cents int not null,
  shipping_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null,
  platform_fee_cents int not null default 0,
  stripe_session_id text unique,
  stripe_payment_intent text,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Per-shop sub-order (one per seller in the cart)
create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  shop_id uuid not null references public.shops(id),
  status order_status not null default 'pending',
  subtotal_cents int not null,
  shipping_cents int not null default 0,
  platform_fee_cents int not null default 0,
  seller_payout_cents int not null default 0,
  stripe_transfer_id text,
  tracking_number text,
  tracking_carrier text,
  shipped_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  shop_order_id uuid not null references public.shop_orders(id) on delete cascade,
  listing_id uuid not null references public.listings(id),
  product_name text not null,
  variant_label text,
  qty int not null,
  unit_price_cents int not null,
  line_total_cents int not null
);

create index on public.orders(buyer_id);
create index on public.shop_orders(shop_id);
create index on public.shop_orders(order_id);

grant select, insert on public.orders, public.shop_orders, public.order_items to authenticated;
grant all on public.orders, public.shop_orders, public.order_items to service_role;

alter table public.orders enable row level security;
alter table public.shop_orders enable row level security;
alter table public.order_items enable row level security;

create policy "Buyers see own orders" on public.orders for select to authenticated
  using (buyer_id = auth.uid());
create policy "Buyers create own orders" on public.orders for insert to authenticated
  with check (buyer_id = auth.uid() and status = 'pending');
create policy "Admins see all orders" on public.orders for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Buyers see own shop_orders" on public.shop_orders for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy "Sellers see own shop_orders" on public.shop_orders for select to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Sellers update own shop_orders" on public.shop_orders for update to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));

create policy "Order items follow shop_order access" on public.order_items for select to authenticated
  using (exists (
    select 1 from public.shop_orders so
    left join public.orders o on o.id = so.order_id
    left join public.shops s on s.id = so.shop_id
    where so.id = shop_order_id and (o.buyer_id = auth.uid() or s.owner_id = auth.uid())
  ));`,
    },
    {
      id: "m05-messaging-reviews",
      title: "5. Messaging, offers, reviews",
      desc: "Buyer ↔ seller chat, Make-an-Offer, 1-5 star reviews after delivery.",
      icon: Database,
      language: "sql",
      code: `create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (buyer_id, shop_id, listing_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','expired')),
  expires_at timestamptz default (now() + interval '48 hours'),
  created_at timestamptz default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  shop_order_id uuid references public.shop_orders(id),
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz default now(),
  unique (shop_order_id, reviewer_id)
);

grant select, insert, update on public.conversations, public.messages, public.offers, public.reviews to authenticated;
grant all on public.conversations, public.messages, public.offers, public.reviews to service_role;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;

create policy "Convo parties read" on public.conversations for select to authenticated
  using (buyer_id = auth.uid() or exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Buyers start convos" on public.conversations for insert to authenticated
  with check (buyer_id = auth.uid());

create policy "Convo members read messages" on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c left join public.shops s on s.id = c.shop_id
    where c.id = conversation_id and (c.buyer_id = auth.uid() or s.owner_id = auth.uid())
  ));
create policy "Convo members send messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversations c left join public.shops s on s.id = c.shop_id
    where c.id = conversation_id and (c.buyer_id = auth.uid() or s.owner_id = auth.uid())
  ));

create policy "Public reads offers on own listings" on public.offers for select to authenticated
  using (buyer_id = auth.uid() or exists (
    select 1 from public.listings l join public.shops s on s.id = l.shop_id
    where l.id = listing_id and s.owner_id = auth.uid()
  ));
create policy "Buyers make offers" on public.offers for insert to authenticated
  with check (buyer_id = auth.uid());

create policy "Public reads reviews" on public.reviews for select using (true);
create policy "Buyers post reviews on delivered orders" on public.reviews for insert to authenticated
  with check (reviewer_id = auth.uid() and exists (
    select 1 from public.shop_orders so join public.orders o on o.id = so.order_id
    where so.id = shop_order_id and o.buyer_id = auth.uid() and so.status = 'delivered'
  ));`,
    },
    {
      id: "m06-reports",
      title: "6. Reports + moderation log",
      desc: "Users report bad listings/sellers. Admins act.",
      icon: ShieldCheck,
      language: "sql",
      code: `create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id),
  target_type text not null check (target_type in ('listing','shop','user','message')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  created_at timestamptz default now()
);

grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "Anyone files reports" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "Reporter sees own" on public.reports for select to authenticated
  using (reporter_id = auth.uid());
create policy "Admins read/act all" on public.reports for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));`,
    },
    {
      id: "m07-triggers",
      title: "7. Auto-create customer + updated_at",
      desc: "Every signup gets 'customer' role. Sellers upgrade by opening a shop.",
      icon: Database,
      language: "sql",
      code: `create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create trigger trg_listings_updated before update on public.listings
  for each row execute function public.touch_updated_at();
create trigger trg_shops_updated before update on public.shops
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
    on conflict (user_id, role) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-add 'seller' role when shop is created
create or replace function public.grant_seller_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role) values (new.owner_id, 'seller')
    on conflict (user_id, role) do nothing;
  return new;
end; $$;

create trigger on_shop_created after insert on public.shops
  for each row execute function public.grant_seller_role();`,
    },
    {
      id: "m08-storage",
      title: "8. Storage buckets (listings + shop banners)",
      desc: "Public buckets. Sellers upload to their own folder.",
      icon: Database,
      language: "sql",
      code: `insert into storage.buckets (id, name, public) values
  ('listing-images', 'listing-images', true),
  ('shop-assets', 'shop-assets', true)
on conflict (id) do nothing;

create policy "Public read listing images"
  on storage.objects for select using (bucket_id = 'listing-images');
create policy "Sellers upload listing images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Sellers delete own listing images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public read shop assets"
  on storage.objects for select using (bucket_id = 'shop-assets');
create policy "Sellers manage own shop assets"
  on storage.objects for all to authenticated
  using (bucket_id = 'shop-assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'shop-assets' and (storage.foldername(name))[1] = auth.uid()::text);`,
    },
    {
      id: "m09-fn-connect-onboard",
      title: "Edge fn: connect-onboard/index.ts",
      desc: "Creates Stripe Express account for a seller + returns onboarding URL.",
      icon: Code2,
      language: "ts",
      code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization")!;
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) throw new Error("Not authed");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: shop } = await admin.from("shops").select("*").eq("owner_id", user.id).single();
    if (!shop) throw new Error("Open a shop first");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    let acctId = shop.stripe_account_id;
    if (!acctId) {
      const acct = await stripe.accounts.create({ type: "express", email: user.email!, capabilities: { card_payments: { requested: true }, transfers: { requested: true } } });
      acctId = acct.id;
      await admin.from("shops").update({ stripe_account_id: acctId }).eq("id", shop.id);
    }

    const link = await stripe.accountLinks.create({
      account: acctId,
      refresh_url: \`\${req.headers.get("origin")}/seller/onboard\`,
      return_url: \`\${req.headers.get("origin")}/seller/dashboard\`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: cors });
  }
});`,
    },
    {
      id: "m10-fn-create-checkout",
      title: "Edge fn: create-checkout/index.ts (Connect)",
      desc: "Splits cart by seller, creates Checkout with destination charges + platform fee.",
      icon: Code2,
      language: "ts",
      code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const FEE_PCT = Number(Deno.env.get("PLATFORM_FEE_PERCENT") ?? "8");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { items, email, shipping_address } = await req.json();
    // items: [{ listing_id, qty }]

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ids = items.map((i: any) => i.listing_id);
    const { data: listings } = await supa
      .from("listings")
      .select("id, name, price_cents, hero_image_url, inventory_qty, shop:shops(id, stripe_account_id, payouts_enabled)")
      .in("id", ids);

    if (!listings?.length) throw new Error("No items");

    // Group by shop
    const byShop = new Map<string, any[]>();
    for (const i of items) {
      const l: any = listings.find((x: any) => x.id === i.listing_id);
      if (!l) throw new Error("Listing missing");
      if (!l.shop.payouts_enabled) throw new Error(\`Seller not ready to accept payouts\`);
      if (l.inventory_qty < i.qty) throw new Error(\`Out of stock: \${l.name}\`);
      const arr = byShop.get(l.shop.id) ?? [];
      arr.push({ listing: l, qty: i.qty });
      byShop.set(l.shop.id, arr);
    }

    // NOTE: Stripe destination charges support a single connected account per session.
    // For multi-shop carts, create ONE checkout per shop. Here we create the FIRST shop's session
    // and pass remaining shops as metadata for sequential checkout, OR loop to create multiple sessions.
    // Simpler v1: enforce single-shop carts.
    if (byShop.size > 1) throw new Error("Please check out one shop at a time (v1 limit)");

    const [shopId, shopItems] = [...byShop.entries()][0];
    const shop = shopItems[0].listing.shop;
    const subtotal = shopItems.reduce((s: number, it: any) => s + it.listing.price_cents * it.qty, 0);
    const platformFee = Math.round(subtotal * (FEE_PCT / 100));

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Create order skeleton
    const { data: order } = await supa.from("orders").insert({
      guest_email: email, subtotal_cents: subtotal, total_cents: subtotal,
      platform_fee_cents: platformFee, shipping_address, status: "pending",
    }).select().single();

    const { data: shopOrder } = await supa.from("shop_orders").insert({
      order_id: order!.id, shop_id: shopId, subtotal_cents: subtotal,
      platform_fee_cents: platformFee, seller_payout_cents: subtotal - platformFee,
    }).select().single();

    await supa.from("order_items").insert(shopItems.map((it: any) => ({
      shop_order_id: shopOrder!.id,
      listing_id: it.listing.id,
      product_name: it.listing.name,
      qty: it.qty,
      unit_price_cents: it.listing.price_cents,
      line_total_cents: it.listing.price_cents * it.qty,
    })));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: shopItems.map((it: any) => ({
        quantity: it.qty,
        price_data: {
          currency: "usd",
          unit_amount: it.listing.price_cents,
          product_data: { name: it.listing.name, images: it.listing.hero_image_url ? [it.listing.hero_image_url] : [] },
        },
      })),
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: { destination: shop.stripe_account_id },
      },
      shipping_address_collection: { allowed_countries: ["US"] },
      success_url: \`\${req.headers.get("origin")}/order/success?id=\${order!.id}\`,
      cancel_url: \`\${req.headers.get("origin")}/cart\`,
      metadata: { order_id: order!.id, shop_order_id: shopOrder!.id },
    });

    await supa.from("orders").update({ stripe_session_id: session.id }).eq("id", order!.id);

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: cors });
  }
});`,
    },
    {
      id: "m11-fn-webhook",
      title: "Edge fn: stripe-webhook/index.ts (Connect)",
      desc: "Handles checkout.session.completed + account.updated (payouts_enabled).",
      icon: Webhook,
      language: "ts",
      code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// config.toml: verify_jwt = false for this function
serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (e: any) {
    return new Response(\`Webhook Error: \${e.message}\`, { status: 400 });
  }

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const orderId = s.metadata?.order_id;
    const shopOrderId = s.metadata?.shop_order_id;
    if (!orderId) return new Response("ok", { status: 200 });

    await supa.from("orders").update({
      status: "paid", paid_at: new Date().toISOString(),
      stripe_payment_intent: s.payment_intent as string,
      total_cents: s.amount_total ?? 0,
    }).eq("id", orderId);

    await supa.from("shop_orders").update({ status: "paid" }).eq("id", shopOrderId);

    const { data: items } = await supa.from("order_items").select("listing_id, qty").eq("shop_order_id", shopOrderId);
    for (const it of items ?? []) {
      await supa.rpc("decrement_listing_inventory", { _listing: it.listing_id, _qty: it.qty });
    }

    await supa.functions.invoke("send-receipt", { body: { order_id: orderId } });
  }

  // Seller finishes Connect onboarding → enable payouts
  if (event.type === "account.updated") {
    const a = event.data.object as Stripe.Account;
    await supa.from("shops").update({
      payouts_enabled: a.payouts_enabled ?? false,
      is_approved: a.payouts_enabled ?? false,
    }).eq("stripe_account_id", a.id);
  }

  if (event.type === "charge.refunded") {
    const c = event.data.object as Stripe.Charge;
    await supa.from("orders").update({ status: "refunded" }).eq("stripe_payment_intent", c.payment_intent as string);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});`,
    },
    {
      id: "m12-rpc",
      title: "Listing inventory decrement RPC",
      desc: "Atomic decrement + auto-mark sold when qty hits zero.",
      icon: Database,
      language: "sql",
      code: `create or replace function public.decrement_listing_inventory(_listing uuid, _qty int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.listings
  set inventory_qty = greatest(0, inventory_qty - _qty),
      is_sold = (greatest(0, inventory_qty - _qty) = 0)
  where id = _listing;
end; $$;`,
    },
    {
      id: "m13-checklist",
      title: "Post-SQL checklist (Marketplace)",
      desc: "Extra steps for Stripe Connect.",
      icon: ListChecks,
      language: "text",
      code: `[ ] Enable Email + Google auth in Supabase
[ ] Add 5 secrets from the top of this page
[ ] In Stripe Dashboard → Connect → Settings: enable Express accounts
    Copy the Connect Client ID (ca_...) → STRIPE_CONNECT_CLIENT_ID
[ ] Add webhook URL: https://<project>.supabase.co/functions/v1/stripe-webhook
    Events: checkout.session.completed, charge.refunded, account.updated (CONNECT events tab too)
[ ] In supabase/config.toml: verify_jwt = false for stripe-webhook
[ ] Deploy edge functions: create-checkout, stripe-webhook, connect-onboard, send-receipt
[ ] Make aunt the first admin (insert into user_roles)
[ ] Aunt opens her own shop first → completes Connect onboarding → lists her items
[ ] Open seller signup to public
[ ] Test: create 2 test seller accounts, list items, buy with 4242 4242 4242 4242
[ ] Verify each seller's Connect dashboard shows their payout minus platform fee
[ ] TAX WARNING: each seller is responsible for their own sales tax.
    Year-end: Stripe issues 1099-K to sellers >$600/yr automatically.
[ ] DISPUTE POLICY: write a Terms of Service BEFORE launch. Aunt is not liable for individual seller items.`,
    },
  ],
};

const BLUEPRINTS: Blueprint[] = [HIM_AND_HER, MARKETPLACE];

function CodeBlock({ block }: { block: Block }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const Icon = block.icon;

  const copy = async () => {
    await navigator.clipboard.writeText(block.code);
    setCopied(true);
    toast({ title: "Copied", description: block.title });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{block.title}</CardTitle>
              <CardDescription className="text-xs mt-1">{block.desc}</CardDescription>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="ml-1.5 text-xs">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-[11px] leading-relaxed bg-muted/40 border border-border rounded-md p-3 overflow-x-auto max-h-[420px]">
          <code>{block.code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

function BlueprintView({ bp }: { bp: Blueprint }) {
  const fullSql = bp.blocks.filter(b => b.language === "sql").map(b => `-- ${b.title}\n${b.code}`).join("\n\n");
  const { toast } = useToast();

  return (
    <div className="space-y-5">
      <Card className="border-primary/40">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">{bp.name}</CardTitle>
              <CardDescription className="text-xs">{bp.pkg}</CardDescription>
            </div>
            <Badge variant="outline">Client Build</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">{bp.tagline}</p>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Supabase project</p>
            <p className="text-xs">{bp.supabaseProject}</p>
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Secrets to add</p>
            <ul className="text-xs space-y-1 text-muted-foreground font-mono">
              {bp.secrets.map(s => <li key={s}>• {s}</li>)}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><Webhook className="w-3.5 h-3.5" /> Edge functions to build</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {bp.edgeFunctions.map(f => (
                <li key={f.name}><span className="font-mono text-foreground">{f.name}</span> — {f.purpose}</li>
              ))}
            </ul>
          </div>

          <Button
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(fullSql);
              toast({ title: "Full SQL copied", description: "Paste into Supabase SQL editor and run." });
            }}
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy ALL SQL (run in order)
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {bp.blocks.map(b => <CodeBlock key={b.id} block={b} />)}
      </div>
    </div>
  );
}

export default function BackendBlueprints() {
  return (
    <DevHubPage
      title="Backend Blueprints"
      subtitle="Copy-paste SQL + setup checklists for each client app's Supabase project."
    >
      <Tabs defaultValue={BLUEPRINTS[0].slug} className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto">
          {BLUEPRINTS.map(bp => (
            <TabsTrigger key={bp.slug} value={bp.slug}>{bp.name}</TabsTrigger>
          ))}
        </TabsList>
        {BLUEPRINTS.map(bp => (
          <TabsContent key={bp.slug} value={bp.slug}>
            <BlueprintView bp={bp} />
          </TabsContent>
        ))}
      </Tabs>
    </DevHubPage>
  );
}
