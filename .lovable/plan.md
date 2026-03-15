

# Add Sarah Davis as Character Reference for AI Image Generation

## What We're Doing

Adding Sarah Davis (Jessie Crider's girlfriend) as a new character in the AI image generation system using the uploaded photos. Two of the 8 uploaded photos are in JPG format and can be used directly. The 6 HEIC files are not browser-compatible and cannot be displayed -- you'll need to convert those to JPG/PNG and re-upload them later if you want more references.

## Implementation

### 1. Copy the 2 usable JPG photos to `public/`
- `user-uploads://IMG_20260315_115114.jpg` → `public/sarah-davis-reference-1.jpg`
- `user-uploads://IMG_20260315_114830.jpg` → `public/sarah-davis-reference-2.jpg`

### 2. Database Migration
Insert Sarah Davis into `character_references` table with two reference entries:

```sql
INSERT INTO character_references (slug, name, pronouns, era, description, traits, context, reference_photo_url, is_primary, is_system)
VALUES
  ('sarah-davis', 'Sarah Davis', 'she/her', 'Modern',
   'Sarah Davis - Jessie Crider''s girlfriend',
   'Young woman, light hair, soft features, casual style',
   'Always generate with accurate likeness matching reference photos. Jessie''s girlfriend.',
   '/sarah-davis-reference-1.jpg', true, true),
  ('sarah-davis-2', 'Sarah Davis', 'she/her', 'Modern',
   'Sarah Davis - Jessie Crider''s girlfriend',
   'Young woman, light hair, nose ring, bold lashes, expressive',
   'Always generate with accurate likeness matching reference photos. Jessie''s girlfriend.',
   '/sarah-davis-reference-2.jpg', false, true);
```

### 3. No code changes needed
The existing `useMediaSystem.ts` and `generate-ai-image` edge function already fetch all characters from `character_references` and use them for generation. Sarah Davis will automatically appear in the character selector.

## Note on HEIC files
6 of the 8 uploaded files are HEIC format, which browsers cannot display. Convert them to JPG on your phone or PC and re-upload them to add more reference photos later.

## Files

| File | Action |
|------|--------|
| `public/sarah-davis-reference-1.jpg` | Copy from upload |
| `public/sarah-davis-reference-2.jpg` | Copy from upload |
| DB migration | Insert 2 rows into `character_references` |

