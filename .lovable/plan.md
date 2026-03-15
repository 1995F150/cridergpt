

# Add FFA Belt Buckle to Jessie Crider's AI Image Generation Dataset

## Overview

Adding the FFA belt buckle photo as a secondary reference for Jessie Crider in the character-based AI image generation system. This will help the AI recognize and generate accurate FFA-related details (like the belt buckle) when creating images of Jessie in agricultural/FFA contexts.

## What I See

The uploaded image shows:
- Blue jeans with orange stitching
- Ornate FFA belt buckle (bronze/gold colored)
- Classic FFA emblem design with decorative border
- Authentic agricultural/FFA styling

## Technical Implementation

### 1. Copy Image to Public Folder
Copy `user-uploads://PXL_20260315_165420654.jpg` → `public/jessie-ffa-buckle.jpg`

### 2. Database Migration
Add a new row to `character_references` table for Jessie with the belt buckle reference:

```sql
INSERT INTO public.character_references (
  slug, 
  name, 
  pronouns, 
  era, 
  description, 
  traits, 
  context, 
  reference_photo_url, 
  is_primary, 
  is_system
) VALUES (
  'jessie-ffa-buckle',
  'Jessie Crider',
  'he/him',
  'Modern',
  'Jessie Crider - FFA belt buckle detail reference',
  'FFA belt buckle, ornate bronze/gold design, classic FFA emblem, decorative border, worn with blue jeans',
  'Use this reference for FFA formal wear details. The belt buckle is an authentic FFA accessory worn with official dress (blue jeans, belt, FFA jacket). Include when generating FFA-related scenes or formal agricultural contexts.',
  '/jessie-ffa-buckle.jpg',
  false,
  true
);
```

### 3. How It Works

The existing `useMediaSystem.ts` hook already:
- Fetches all character references from the database dynamically
- Sends multiple reference images to the `generate-ai-image` edge function
- Parses character mentions in prompts (e.g., "Jessie", "me", "creator")

When the AI generates an image mentioning Jessie in an FFA context, it will now have access to:
1. Main face reference (`/jessie-crider-reference-1.jpg`)
2. FFA belt buckle detail (`/jessie-ffa-buckle.jpg`)

This gives the AI model more accurate visual data for FFA accessories.

## Files Modified

| File | Action |
|------|--------|
| `public/jessie-ffa-buckle.jpg` | Copy uploaded image |
| `supabase/migrations/[timestamp]_add_jessie_ffa_buckle.sql` | Insert new reference row |

## No Code Changes Needed

The media generation system already supports multiple references per character via the `character_references` table. The AI will automatically detect and use this reference when generating images of Jessie.

