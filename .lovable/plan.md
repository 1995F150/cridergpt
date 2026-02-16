

# Pre-Generated Tag ID Pool and Scan-to-Register Workflow

## Current State

The database already has:
- `livestock_rfid_cards` table is already deleted
- `tag_id` column on `livestock_animals` with a UNIQUE index
- A trigger (`trg_generate_tag_id`) that auto-generates `CriderGPT-XXXXXX` IDs on insert
- The `scan-card` edge function looks up animals by `tag_id`
- Frontend is already simplified (no RFID card management UI)

What is missing: a pool of 100 pre-generated Tag IDs and a "scan-first" registration workflow where scanning an unknown tag automatically starts animal registration.

## Plan

### 1. Database: Create `livestock_tag_pool` Table

A new table holding 100 pre-generated `CriderGPT-XXXXXX` Tag IDs ready for assignment.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated |
| `tag_id` | text (UNIQUE) | e.g. `CriderGPT-A7X9K2` |
| `status` | text | `available`, `assigned`, or `reserved` |
| `assigned_to_animal` | uuid | FK to `livestock_animals.id`, null when available |
| `assigned_by` | uuid | The farmer who claimed this tag |
| `assigned_at` | timestamptz | When it was assigned |
| `created_at` | timestamptz | Default now() |

The migration will:
- Create the table with RLS policies (owners can view/claim tags)
- Insert 100 unique `CriderGPT-XXXXXX` IDs with status `available`
- Add a unique constraint so pool IDs and animal IDs never collide

### 2. Edge Function: Update `scan-card` for Scan-to-Register

Current behavior: scanning an unknown tag returns a 404 error.

New behavior:
1. Scan comes in with a tag ID
2. First, check `livestock_animals` for a match -- if found, return the profile (existing flow)
3. If not found, check `livestock_tag_pool` for a match
4. If the tag is in the pool and `available`, return `{ "status": "unregistered", "tag_id": "CriderGPT-...", "message": "Tag recognized. Ready to register a new animal." }`
5. If not in pool either, return 404 as before
6. This lets the frontend guide the farmer to fill in animal details

### 3. Frontend: Scan-to-Register Flow

**TagScanner.tsx** updates:
- When scan result returns `status: "unregistered"`, show a prompt: "Tag recognized! Tap below to register this animal."
- Button navigates to the Add Animal form, pre-filling the tag ID

**AddAnimalForm.tsx** updates:
- Accept an optional `prefillTagId` prop
- Show the tag ID as a read-only badge at the top when pre-filled
- On submit, the animal is created with that specific `tag_id` (the DB trigger skips generation when tag_id is provided)

**LivestockPanel.tsx** updates:
- Wire the scan-to-register flow: when TagScanner signals "unregistered", switch to the Add tab with the tag ID pre-filled

**useLivestock.ts** updates:
- Update `addAnimal` to accept optional `tag_id` parameter and pass it to the insert
- After animal creation with a pool tag, update the pool record to `assigned`

### 4. Data Integrity

- The `livestock_tag_pool.tag_id` has a UNIQUE constraint
- The `livestock_animals.tag_id` has a UNIQUE constraint
- A cross-table unique check ensures no ID exists in both tables simultaneously (when assigned from pool, the animal gets the ID and the pool record is marked `assigned`)
- All existing animal data fields remain untouched
- The tag_id links to all child tables (weights, health, notes, tags) via the animal's `id` primary key -- no changes needed there

### 5. Physical Tag Writing (Future-Ready)

The TagScanner component already supports NFC via `NDEFReader`. A new "Write Tag" button will be added to the AnimalProfile header that:
- Uses the Web NFC Write API to write the animal's `tag_id` to a physical NFC tag
- Shows instructions: "Hold your NFC tag/key fob to the phone"
- Confirms successful write

This is a UI-only addition -- no backend changes needed for writing.

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Create `livestock_tag_pool`, insert 100 IDs, add RLS |
| `supabase/functions/scan-card/index.ts` | Add pool lookup for unregistered tags |
| `src/hooks/useLivestock.ts` | Add `tag_id` to `addAnimal`, pool assignment |
| `src/components/livestock/TagScanner.tsx` | Add "unregistered tag" prompt with register button |
| `src/components/livestock/AddAnimalForm.tsx` | Accept `prefillTagId` prop |
| `src/components/panels/LivestockPanel.tsx` | Wire scan-to-register flow between tabs |
| `src/components/livestock/AnimalProfile.tsx` | Add "Write to NFC Tag" button |

## Scanning Workflow Summary

```text
Farmer scans NFC tag/key fob
        |
        v
  Edge function receives tag_id
        |
        v
  Found in livestock_animals? ----YES----> Return full animal profile
        |                                    (health, weight, notes, etc.)
        NO
        |
        v
  Found in tag_pool (available)? --YES----> Return "unregistered" status
        |                                    Frontend shows "Register Animal"
        NO                                   -> Pre-fills tag ID in Add form
        |                                    -> Farmer fills in details
        v                                    -> Animal created with that tag_id
  Return 404 "Unknown tag"
```

