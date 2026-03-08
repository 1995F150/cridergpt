

# Self-Learning Pipeline: Learning Queue + Self-Learn Function + Admin Dashboard

## Overview
Build a knowledge gap detection and self-learning system with three parts: a database table to track gaps, an edge function to process them, and an admin UI to manage it all.

## 1. Database Migration: `learning_queue` table

```sql
CREATE TABLE public.learning_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  gap_description text,
  priority integer DEFAULT 5,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'learned', 'dismissed')),
  source text DEFAULT 'auto',  -- 'auto' or 'manual'
  learned_data text,
  detected_from text,  -- conversation excerpt that triggered detection
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.learning_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only access via has_role
CREATE POLICY "Admins can manage learning queue"
  ON public.learning_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

## 2. Gap Detection in `chat-with-ai/index.ts`

After generating the AI response (line ~774), add a lightweight check:

```typescript
// Gap detection — log when AI hedges
const hedgePhrases = ["i'm not sure", "i don't have", "i cannot confirm", "i'm unable to verify"];
const lowerResponse = aiResponse.toLowerCase();
const detectedHedge = hedgePhrases.find(p => lowerResponse.includes(p));

if (detectedHedge && userId) {
  await supabase.from('learning_queue').insert({
    topic: message?.substring(0, 200) || 'unknown',
    gap_description: `AI hedged with: "${detectedHedge}" — topic may need training data`,
    detected_from: message?.substring(0, 500),
    user_id: userId,
    source: 'auto',
    priority: 5
  });
}
```

This is non-blocking and only fires when the AI admits uncertainty.

## 3. New Edge Function: `self-learn`

**File:** `supabase/functions/self-learn/index.ts`

- Fetches up to 20 pending items from `learning_queue`
- For each, calls the AI gateway with a research prompt: "Provide a comprehensive, factual summary about: {topic}"
- Stores the result in `cridergpt_training_corpus` (existing table) with category `self-learned`
- Updates `learning_queue` status to `learned` with `resolved_at`
- Logs actions to `system_logs`
- Admin-only (checks `has_role` via auth header)
- Max 20 items per invocation (safety cap)

**Config:** Add `[functions.self-learn] verify_jwt = false` to `supabase/config.toml`

## 4. Admin Dashboard Component: `LearningDashboard.tsx`

**File:** `src/components/admin/LearningDashboard.tsx`

Features:
- Stats cards: pending count, learned count, dismissed count
- Table of queue items with columns: topic, status, priority, created date
- Actions per row: Dismiss, Prioritize (set priority 1), View learned data
- "Run Learning Cycle" button that invokes the `self-learn` edge function
- "Add Manual Gap" form to insert topics manually

## 5. Wire into Admin Panel

Add a new tab in `AdminPanel.tsx`:
- Icon: `Brain` from lucide-react
- Label: "Learning"
- Renders `<LearningDashboard />`

## Files Changed/Created

| File | Action |
|------|--------|
| New migration | Create `learning_queue` table + RLS |
| `supabase/functions/chat-with-ai/index.ts` | Add gap detection after line ~774 |
| `supabase/functions/self-learn/index.ts` | **New** edge function |
| `supabase/config.toml` | Register `self-learn` |
| `src/components/admin/LearningDashboard.tsx` | **New** admin component |
| `src/components/panels/AdminPanel.tsx` | Add Learning tab |

## Safety Constraints
- All items visible in admin panel before processing
- Max 20 items per learning cycle
- No external scraping — AI synthesis only
- All actions logged to `system_logs`
- Admin-only RLS on the table

