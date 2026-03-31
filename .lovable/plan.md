

## Plan: CriderGPT Official Store Overhaul + Admin Tools

This is a large feature set. Here's the breakdown organized by priority.

---

### 1. Transform Store into a Multi-Product Storefront

**Current state**: `/store` only sells Smart ID tags with a hardcoded product.

**Changes to `SmartIDStore.tsx` (rename concept to "CriderGPT Store")**:
- Fetch all active products from `store_products` table and display them in a grid (Amazon-style product cards with image, title, price, stock badge, "Add to Cart" button)
- Each product card shows stock count (e.g., "12 in stock", "Low stock", "Made to order")
- Smart ID tags show "FREE SHIPPING" badge
- If quantity exceeds stock, show warning: "Custom order — allow extra production time"
- Product detail view when clicking a product card

### 2. Shopping Cart System

**New DB table**: `store_cart_items` (user_id, product_id, quantity, created_at)
- Cart persists for signed-in users across sessions
- Cart icon in store header with item count badge
- Cart drawer/page showing items, quantities, totals
- "Checkout" button processes all cart items via Stripe
- Update `create-checkout` edge function to handle multi-product cart checkout

### 3. Order History & Recommendations

**New DB table**: `store_orders` (id, user_id, items JSONB, total, status, stripe_session_id, shipping_address, created_at)
- Order history page accessible from store profile
- "You might also like" section based on past order categories
- Reuse existing `tag_orders` data where applicable

### 4. Stock Visibility on Store

- Store product cards pull `stock_quantity` from `store_products`
- When quantity selector exceeds stock, show amber warning about custom/backorder
- Admin sets stock via existing `StoreProductsManager`

### 5. Admin QR Code Generator

**New component**: `src/components/admin/QRCodeGenerator.tsx`
- Uses `qrcode` npm library (client-side generation)
- Options: URL input, image embed (logo overlay), custom foreground/background colors
- Edge styles: square, rounded, dots
- Name each QR code, save as PNG download
- Gallery of previously generated QR codes (saved to localStorage or Supabase storage)

### 6. Admin Barcode Generator

**New component**: `src/components/admin/BarcodeGenerator.tsx`
- Uses `jsbarcode` npm library
- Generate standard UPC/EAN/Code128 barcodes for physical products
- Name and save as PNG
- Add to Admin panel as a new tab

### 7. SEO for Store

**Changes to `src/config/seo.ts`**:
- Add `store` SEO entry with keywords: "CriderGPT store, buy smart livestock tags, NFC ear tags, farm equipment store, livestock supplies online, smart ID tags for cattle"

**Changes to `public/sitemap.xml`**:
- Add `/store` URL entry

**Structured data**: Add `Product` schema to store page for Google Shopping visibility

### 8. Store Discounts for Signed-In Users

- Show "Sign in to save X%" messaging on products
- Discount logic in checkout edge function based on user plan tier

---

### Database Migrations Needed

```text
1. store_cart_items (user_id UUID, product_id UUID FK, quantity INT, created_at)
2. store_orders (id UUID, user_id UUID, items JSONB, total NUMERIC, status TEXT, stripe_session_id, shipping_address JSONB, created_at)
3. RLS policies for both tables (users see only their own data)
```

### New Dependencies
- `qrcode` (QR generation)
- `jsbarcode` (barcode generation)

### Files Created/Modified

| Action | File |
|--------|------|
| Major rewrite | `src/pages/SmartIDStore.tsx` — multi-product storefront |
| New | `src/components/store/ProductCard.tsx` |
| New | `src/components/store/ShoppingCart.tsx` |
| New | `src/components/store/OrderHistory.tsx` |
| New | `src/components/admin/QRCodeGenerator.tsx` |
| New | `src/components/admin/BarcodeGenerator.tsx` |
| Edit | `src/components/panels/AdminPanel.tsx` — add QR + Barcode tabs |
| Edit | `src/config/seo.ts` — add store SEO |
| Edit | `public/sitemap.xml` — add /store |
| Edit | `supabase/functions/create-checkout/index.ts` — multi-item cart support |
| New | Migration for `store_cart_items`, `store_orders` |

### Technical Notes
- QR and barcode generation happen entirely client-side (no edge function needed)
- Cart uses Supabase for persistence so it survives across devices
- Stock warnings are purely informational — orders over stock are allowed as "custom orders"
- Product recommendations use simple category matching from order history

