

# Add Contacts Tab to USB Data Hub

## Overview

Add a 5th tab "Contacts" to the USB Hub that reads phone contacts using the **Contact Picker API** (`navigator.contacts.select()`) and syncs them to a new `user_contacts` Supabase table. This API is available on Chrome for Android — perfect for the mobile use case.

## Technical Approach

### Database

Create a `user_contacts` table:

```sql
CREATE TABLE public.user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  source TEXT DEFAULT 'phone_contacts',
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, phone)
);

ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own contacts
CREATE POLICY "Users manage own contacts" ON public.user_contacts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Frontend — New "Contacts" Tab

Add a `ContactsSyncTab` component inside `USBHub.tsx`:

- Uses `navigator.contacts.select(['name', 'tel', 'email'], { multiple: true })` to open the native phone contact picker
- Shows browser compatibility warning (Contact Picker API only works on Chrome Android)
- Displays selected contacts in a table preview
- "Sync to Backend" button upserts contacts into `user_contacts` (deduplicates by phone number)
- Logs the action to `usb_data_logs` with `source_type: 'contacts'`

### Changes to USBHub.tsx

- Add 5th tab: `grid-cols-5` on TabsList
- New `TabsTrigger` with `Contact2` icon and "Contacts" label
- New `TabsContent` rendering `ContactsSyncTab`

## Files

| File | Action |
|------|--------|
| DB migration | Create `user_contacts` table with RLS |
| `src/components/usb/USBHub.tsx` | Add Contacts tab + `ContactsSyncTab` component |

