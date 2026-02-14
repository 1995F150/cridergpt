

# RFID Card Scanning Backend Integration

## Overview

Extend the existing Livestock Smart ID system with a dedicated RFID card scanning backend. This adds a new `livestock_rfid_cards` table, a `livestock_scan_logs` audit table, and a new `scan-card` edge function that acts as the REST API endpoint.

## Database Changes

### New Table: `livestock_rfid_cards`

Links physical RFID card IDs to animals and users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated |
| `card_id` | text (unique, not null) | The raw or encrypted ID from the RFID card (e.g., "CARD-001") |
| `animal_id` | uuid (FK -> livestock_animals.id) | Nullable -- card can be pre-provisioned before linking |
| `linked_by` | uuid (FK -> auth.users.id) | Who linked this card |
| `is_encrypted` | boolean | Default false. If true, backend decrypts before lookup |
| `last_scan` | timestamptz | Updated on every successful scan |
| `linked_at` | timestamptz | When card was linked to animal |
| `unlinked_at` | timestamptz | Null = active. Set when card is unlinked |
| `created_at` | timestamptz | Default now() |

### New Table: `livestock_scan_logs`

Audit trail for every scan attempt.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated |
| `card_id` | text | The scanned card ID |
| `scanned_by` | uuid | The user who scanned |
| `animal_id` | uuid | Null if card not found |
| `result` | text | 'success', 'not_found', 'access_denied', 'decryption_error' |
| `ip_address` | text | Optional, from request headers |
| `scanned_at` | timestamptz | Default now() |

### RLS Policies

- `livestock_rfid_cards`: Owners can manage their own cards. Users with `livestock_access` can read cards for animals they have access to.
- `livestock_scan_logs`: Insert-only for authenticated users (their own scans). Select for users viewing their own scan history.

## Edge Function: `scan-card`

**Path:** `POST /scan-card`

**Request body:**
```json
{
  "card_id": "CARD-001",
  "encrypted": false
}
```

**Logic flow:**
1. Validate JWT (get user from auth header)
2. If `encrypted: true`, decrypt `card_id` (placeholder for future encryption key integration)
3. Look up card in `livestock_rfid_cards` where `card_id` matches and `unlinked_at IS NULL`
4. If not found -> log "not_found", return 404
5. Check authorization: user must be the animal owner OR have an active `livestock_access` grant
6. If unauthorized -> log "access_denied", return 403
7. Update `last_scan` timestamp on the card
8. Fetch full animal profile (animal + weights + health records + notes + tags)
9. Log "success" in `livestock_scan_logs`
10. Return full animal profile JSON

**Response (success):**
```json
{
  "animal": { ... },
  "weights": [ ... ],
  "health_records": [ ... ],
  "notes": [ ... ],
  "tags": [ ... ],
  "scan_timestamp": "2026-02-14T..."
}
```

## Frontend Changes

### TagScanner.tsx Updates
- When a scan comes in, call the `scan-card` edge function instead of doing a direct client-side tag lookup
- Display the returned animal profile, or show the appropriate error ("Card not registered", "Access denied")
- Show `last_scan` info on the scan result

### LivestockPanel.tsx Updates
- Add a "Manage Cards" section within the animal profile where owners can:
  - Link a new RFID card to the animal (input card ID manually or scan)
  - Unlink an existing card
  - View scan history for the animal

### useLivestock.ts Updates
- Add `scanCard(cardId, encrypted?)` method that calls the edge function
- Add `linkCard(animalId, cardId)` and `unlinkCard(cardId)` methods for card management
- Add `getScanHistory(animalId?)` method

## Encryption Support (Future-Ready)

The `is_encrypted` flag and `encrypted` request param are included now but the actual decryption is a placeholder. When you're ready to add encryption:
1. Store an encryption key as a Supabase secret
2. The edge function reads the secret and decrypts the card ID before lookup
3. No schema changes needed -- just update the edge function logic

## Implementation Steps

1. **Database migration** -- Create `livestock_rfid_cards` and `livestock_scan_logs` tables with RLS
2. **Edge function** -- Create `scan-card` edge function with full validation, authorization, and audit logging
3. **Frontend hook** -- Update `useLivestock.ts` with card management and scan methods
4. **Frontend UI** -- Update `TagScanner.tsx` to use the edge function; add card management UI to `AnimalProfile.tsx`
5. **Config** -- Add `scan-card` to `supabase/config.toml` with `verify_jwt = false`

## Technical Notes

- The existing `livestock_tags` table handles visual/ear tags. RFID cards are a separate concept (one card = one animal link, with audit trail), hence the new table rather than reusing `livestock_tags`.
- The `has_livestock_access` database function already exists and will be reused by the edge function for authorization checks.
- All scan attempts (success or failure) are logged for audit compliance.
- The edge function uses the Supabase service role key to bypass RLS for the authorization check, then validates permissions in code.
