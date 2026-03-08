

# Fix Issues + Add ChatGPT Conversation Import

You raised several issues and feature requests. Here's the plan, organized by priority:

---

## Issue 1: Model Selector Always Shows "Free Plan" (Bug Fix)

**Root cause:** Both `ModelSelector.tsx` and `AISettings.tsx` read the plan from `user?.app_metadata?.plan`, which is never set by Supabase. The actual plan lives in the `profiles.tier` or `ai_usage.user_plan` tables.

**Fix:** Replace the broken `app_metadata` check with the existing `useSubscriptionStatus()` hook that already queries the real plan from the database.

| File | Change |
|------|--------|
| `src/components/ModelSelector.tsx` | Replace `user?.app_metadata?.plan` with `useSubscriptionStatus().plan`. Also fix typo: `'plu'` should be `'plus'` in `planHierarchy`. |
| `src/components/profile/AISettings.tsx` | Same fix — use `useSubscriptionStatus()` instead of `app_metadata`. |

---

## Issue 2: Writing Samples Detected as 100% AI

**Root cause:** The `writing_samples` table currently contains AI-generated text, not your real writing. The system prompt in `chat-with-ai` feeds these samples directly as tone reference.

**Fix:** This is a data issue, not a code issue. You need to replace the content in the `writing_samples` table with your actual writing (text messages, social media posts, emails you've written). I can add an admin tool to make this easier:

| File | Change |
|------|--------|
| `src/components/admin/LearningDashboard.tsx` | Add a "Writing Samples" management section where you can view, delete, and paste in real writing samples. |

---

## Feature 3: ChatGPT Conversation JSON Import

Create a new table and import pipeline so CriderGPT can learn from your ChatGPT conversation exports.

**New table:** `conversation_imports`
```text
id, user_id, source ('chatgpt', 'other'), filename,
message_count, imported_at, status, raw_json (jsonb)
```

**New table:** `imported_messages` (parsed from JSON)
```text
id, import_id, role, content, timestamp
```

**Implementation:**
- New admin component `ConversationImporter.tsx` with a file upload that accepts `.json`
- Parses ChatGPT export format (array of conversations with `mapping` objects)
- Stores raw JSON in `conversation_imports`, parsed messages in `imported_messages`
- Update `chat-with-ai` edge function to optionally pull from `imported_messages` as additional context (same as it does with `writing_samples` and `ai_memory`)

| File | Action |
|------|--------|
| New migration | Create `conversation_imports` + `imported_messages` tables with admin RLS |
| `src/components/admin/ConversationImporter.tsx` | **New** — upload + parse ChatGPT JSON |
| `src/components/panels/AdminPanel.tsx` | Add "Imports" tab |
| `supabase/functions/chat-with-ai/index.ts` | Fetch from `imported_messages` for learning context |

---

## Feature 4: Native Android Build System (Deferred — Needs Separate Plan)

You want a system that reads all web code and generates real native Android (Kotlin/Java) code — not a Capacitor web wrapper. This is a massive undertaking (essentially an AI-powered transpiler). It would require:
- An edge function that reads the full codebase
- AI prompts that convert React components to Android XML layouts + Kotlin activities
- A build pipeline that compiles without Android Studio (using command-line Gradle)

This is too large to bundle here. I recommend we tackle it as a dedicated plan after the above fixes ship.

---

## Files Changed/Created Summary

| File | Action |
|------|--------|
| `src/components/ModelSelector.tsx` | Fix plan detection (use DB, not app_metadata) |
| `src/components/profile/AISettings.tsx` | Fix plan detection |
| New migration | `conversation_imports` + `imported_messages` tables |
| `src/components/admin/ConversationImporter.tsx` | **New** — ChatGPT JSON import UI |
| `src/components/panels/AdminPanel.tsx` | Add Imports tab |
| `supabase/functions/chat-with-ai/index.ts` | Pull imported conversation context |

