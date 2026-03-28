

## Combined Plan: Product Ideas Tracker + Smart ID Store + AI Infrastructure Foundation

Three features to build in one pass. Minimal edge function usage since you're near the limit.

---

### Feature 1: Product Ideas Tracker (Admin + Team)

A new "Products" tab in the Admin Panel for tracking physical product ideas, materials, build status, and notes. Accessible to admin and moderator roles.

**Database: New table `product_ideas`**
```
id            uuid PK
created_by    uuid NOT NULL (references auth.users)
title         text NOT NULL
description   text
category      text DEFAULT 'general' (livestock, electronics, accessories, general)
status        text DEFAULT 'idea' (idea, researching, materials_bought, prototyping, built, selling, shelved)
materials     jsonb DEFAULT '[]' (array of {name, cost, bought: bool})
est_cost      numeric(10,2)
sell_price    numeric(10,2)
notes         text
is_patented   boolean DEFAULT false
is_public     boolean DEFAULT false (hidden until released)
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

**RLS**: Admin and moderator roles can CRUD via `has_role()`. No public access.

**UI**: `src/components/admin/ProductIdeasTracker.tsx`
- Card grid showing each product idea with status badge, cost/price, materials checklist
- Add/edit modal with all fields
- Filter by status and category
- Materials sub-list with checkboxes for "bought" status and running cost total
- Patent/copyright toggle per item

**Admin Panel**: Add "Products" tab with a Lightbulb icon.

---

### Feature 2: Smart ID Store (Public Product Page + Stripe Checkout)

A public-facing product page for selling physical NFC cow tags at $3.50 each. Uses existing Stripe integration.

**Database: New table `tag_orders`**
```
id            uuid PK
customer_id   uuid (references auth.users, nullable for guest)
customer_email text NOT NULL
customer_name text
quantity      integer NOT NULL
unit_price    numeric(10,2) DEFAULT 3.50
total_price   numeric(10,2)
status        text DEFAULT 'pending' (pending, paid, processing, shipped, delivered)
shipping_address jsonb
stripe_session_id text
notes         text
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

**RLS**: Users can read their own orders. Admin can read all.

**Stripe**: Create a new product "CriderGPT Smart Livestock Tag" at $3.50/unit using Stripe tools. Use `mode: "payment"` for one-time purchase.

**Edge function**: Reuse or extend existing `create-checkout` to handle tag orders with dynamic quantity. Add an action parameter (`action: 'tag-order'`) to avoid creating a new function. After checkout, insert into `tag_orders`.

**New page**: `src/pages/SmartIDStore.tsx`
- Hero section: "Smart Livestock Tags — $3.50 each"
- Product description: NFC-enabled, weather-coated, works with CriderGPT Smart ID system
- Quantity selector
- "Buy Now" button → Stripe checkout
- FAQ section (how it works, what you need, compatibility)

**New route**: `/store` in App.tsx

**Navigation**: Add "Smart ID Store" link to the sidebar under a new "STORE" group (public, not admin-restricted). Also add a link on the Livestock panel.

**Admin visibility**: Tag orders show up in the existing FilterOrdersManager or a new sub-tab under Admin.

---

### Feature 3: AI Infrastructure Foundation (No Voice Cloning)

Build the groundwork for your own AI system that uses your existing `ai_memory` and `cridergpt_training_corpus` data before calling external APIs.

**Architecture**: Modify the existing `chat-with-ai` edge function to add a "local-first" layer:

```text
User Message
    │
    ▼
┌─────────────────────┐
│ 1. Search ai_memory  │  ← keyword/semantic match
│ 2. Search corpus     │  ← cridergpt_training_corpus
│ 3. Check patterns    │  ← tool_pattern memories
└─────────┬───────────┘
          │
    Has confident match?
    ┌─────┴─────┐
    │ YES       │ NO
    ▼           ▼
Return local   Call OpenAI/Gateway
answer         (existing flow)
```

**Changes to `chat-with-ai/index.ts`**:
- Before calling OpenAI, query `ai_memory` and `cridergpt_training_corpus` for matches against the user's message
- If corpus has a high-confidence match (exact topic or keyword), inject it as context or return it directly
- Add a `source` field to responses: `"cridergpt-local"` vs `"openai"` vs `"gateway"` so you can track how often your own data answers questions
- Store successful local-answer patterns back to `ai_memory` with category `self_answer`

**No new edge functions needed** — this modifies the existing `chat-with-ai` function.

**Admin visibility**: Add a simple "AI Stats" card to the Admin Dashboard showing:
- Total memories count
- Total corpus entries
- Local answer rate (% of responses served from local data vs API)
- Last training data import date

**Future-ready**: This lays the foundation. When you later self-host Ollama/Llama, you swap the OpenAI call for a local model call — the memory/corpus lookup layer stays the same.

---

### Files to Create/Edit

| File | Action |
|------|--------|
| Migration SQL | `product_ideas` table, `tag_orders` table, RLS policies |
| `src/components/admin/ProductIdeasTracker.tsx` | New — product ideas CRUD UI |
| `src/components/panels/AdminPanel.tsx` | Add "Products" tab |
| `src/pages/SmartIDStore.tsx` | New — public store page |
| `src/App.tsx` | Add `/store` route |
| `src/components/NavigationSidebar.tsx` | Add "Store" nav item |
| `supabase/functions/chat-with-ai/index.ts` | Add local-first memory/corpus lookup layer |
| `supabase/functions/create-checkout/index.ts` | Add tag-order checkout action |
| `src/components/admin/AdminDashboard.tsx` | Add AI Stats card |

**Stripe**: Will create a product + price ($3.50 one-time) using Stripe tools before building the checkout flow.

**Edge function count**: Zero new functions. All changes go into existing functions.

