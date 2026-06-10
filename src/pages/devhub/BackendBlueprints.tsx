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
  name: "Him and Her Boutique",
  pkg: "com.crider.himandher",
  tagline: "Mobile clothing boutique — dual storefront, Stripe checkout, full inventory + orders backend.",
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
      id: "10-checklist",
      title: "10. Post-SQL checklist",
      desc: "Do these in order after the migrations run clean.",
      icon: ListChecks,
      language: "text",
      code: `[ ] Enable Email auth in Supabase → Authentication → Providers
[ ] Add Google OAuth (optional but recommended for boutique shoppers)
[ ] Add the 4 secrets listed at the top of this page
[ ] Create Stripe webhook → URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
    Events: checkout.session.completed, payment_intent.succeeded, charge.refunded
    Copy the signing secret → STRIPE_WEBHOOK_SECRET
[ ] Deploy edge functions: create-checkout, stripe-webhook, send-receipt, shipping-quote
[ ] Verify Resend domain (himandherboutique.com or whatever she picks)
[ ] Upload first 5-10 products via the admin dashboard
[ ] Run a $0.50 test order with Stripe test card 4242 4242 4242 4242
[ ] Flip Stripe to live mode, swap keys, run a real $1 order
[ ] List on Google Play under your Crider dev account, package com.crider.himandher`,
    },
  ],
};

const BLUEPRINTS: Blueprint[] = [HIM_AND_HER];

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
