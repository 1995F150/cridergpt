
Goal: fix the fake/unpaid order problem, restore signed-in store account UI, and strengthen store + custom filter discoverability under the CriderGPT brand.

What I found
1. Unpaid orders are being created too early.
- `supabase/functions/create-checkout/index.ts` inserts into `tag_orders` before Stripe payment is completed.
- `src/components/store/ShoppingCart.tsx` also inserts into `store_orders` before payment, then opens Stripe.
- `src/pages/CustomFilters.tsx` inserts `filter_orders` before Stripe payment too.
- Result: cancelled checkout sessions still leave “pending” admin orders.

2. The store cart checkout is not truly a full cart checkout.
- `ShoppingCart.tsx` only sends the first cart item to `create-checkout`.
- It hardcodes `action: 'tag-order'`, so general store purchases can get mixed into tag orders.

3. The signed-in account UI is missing on `/store`.
- `SmartIDStore.tsx` uses a custom header and does not render `ProfileDropdown`, so signed-in users do not see their avatar/account controls there.

4. SEO is partly in place, but not enough to guarantee growth.
- `/store` already has a CriderGPT title, so Google likely has stale indexing or weak route authority.
- `/custom-filters` uses page-level Helmet tags, but its SEO is not centralized like the main app.
- Keyword improvements can help, but no code change can promise 5,000 views/week by itself.

Implementation plan

1. Secure payment-confirmed order flow
- Add explicit payment lifecycle fields to store/tag/filter order tables, such as:
  - `payment_status`
  - `checkout_status`
  - `paid_at`
  - optional `stripe_payment_intent`
- Change the flow so orders are not admin-visible unless Stripe confirms payment.
- Keep unpaid sessions as hidden drafts/internal records only if needed for reconciliation.
- Remove the client-side pre-payment insert from `ShoppingCart.tsx`.
- Update the custom filter flow to follow the same rule so unpaid filter requests do not show as real orders either.

2. Fix webhook-based confirmation
- Update Stripe webhook handling so `checkout.session.completed` is the source of truth for:
  - marking orders paid
  - promoting hidden drafts into visible admin/customer orders
  - storing Stripe session/payment info
- Also handle failed/expired checkout states so abandoned sessions never appear as real orders.
- Make webhook updates idempotent by matching on `stripe_session_id`.

3. Fix store checkout correctness
- Update `create-checkout` to support actual multi-item store carts instead of only the first product.
- Separate checkout types clearly:
  - Smart ID tag order
  - general store cart order
  - custom filter payment
- Ensure tag orders only contain Smart ID tag purchases.
- Ensure store orders keep full item snapshots for order history and reviews.

4. Fix admin visibility
- Update `TagOrdersManager` to only show paid/confirmed tag orders.
- Update filter order admin views the same way.
- Recalculate admin revenue cards from paid orders only, not drafts/cancelled attempts.

5. Restore signed-in store account controls
- Add authenticated account UI to the `/store` header using the existing auth state and `ProfileDropdown`.
- Keep the sign-in CTA for logged-out users.
- Make sure mobile store view also shows account access cleanly beside the cart.
- Keep checkout gated to signed-in users.

6. Improve CriderGPT Store branding in search
- Strengthen `/store` metadata so Google sees:
  - “CriderGPT Store” as the primary route title
  - official-brand wording in title/description
  - collection/product structured data
- Add centralized SEO config for `/custom-filters` too, so that business page also strengthens branded search traffic.
- Update sitemap freshness and ensure internal links point to `/store` and `/custom-filters`.
- Add stronger route-level schema:
  - `CollectionPage` / `Product`
  - `Service` / `FAQPage` for custom filters
  - breadcrumbs where helpful
- Audit any remaining generic or off-brand snippets so the route consistently appears as CriderGPT, not anything else.

7. Improve discovery content, not just keywords
- Expand indexable copy on `/store` and `/custom-filters` with natural search phrases users actually type:
  - smart livestock tags
  - NFC cattle tags
  - smart animal ID tags
  - custom Snapchat filters
  - Snapchat lens creator
  - truck chrome Snapchat filter
- Add short FAQ/content blocks so the pages have more searchable context, not just product cards.
- Keep expectations realistic: this improves technical SEO and click-through, but traffic growth also depends on content, backlinks, Search Console indexing, and regular updates.

Technical details
- Files likely touched:
  - `src/components/store/ShoppingCart.tsx`
  - `src/pages/SmartIDStore.tsx`
  - `src/pages/CustomFilters.tsx`
  - `src/components/admin/TagOrdersManager.tsx`
  - `src/components/admin/FilterOrdersManager.tsx`
  - `supabase/functions/create-checkout/index.ts`
  - `supabase/functions/stripe-webhooks/index.ts`
  - possibly `supabase/functions/stripe-webhook-checkout/index.ts` if still used
  - `src/config/seo.ts`
  - `src/components/SEO.tsx`
  - `public/sitemap.xml`
  - new migration(s) for payment lifecycle columns

- Important design choice:
  - unpaid checkouts may still exist internally as hidden drafts for Stripe/session tracking,
  - but they will not show in admin panels or customer order history unless payment is confirmed.

Validation checklist after implementation
1. Start checkout, cancel in Stripe:
- no visible tag order in admin
- no visible store order in order history
- no visible filter order as paid/real work

2. Complete payment successfully:
- order appears once
- admin sees it as paid/confirmed
- customer sees it in order history

3. Multi-item cart:
- all items are included in Stripe checkout
- order history shows all purchased items correctly

4. Signed-in store experience:
- avatar/profile controls appear on `/store`
- account access works on mobile and desktop

5. SEO sanity check:
- `/store` page title/source says “CriderGPT Store”
- `/custom-filters` has branded metadata and schema
- sitemap/canonicals are aligned

Priority order
1. Payment/order visibility fix
2. Webhook confirmation fix
3. Multi-item cart correction
4. Store account/avatar UI
5. SEO/branding improvements for store + custom filters
