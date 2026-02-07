

# Database and Feature Cleanup Plan

## Summary of Findings

After analyzing all 90+ database tables and their activity, I found a large number of completely unused tables and features that are consuming backend resources. Here's the breakdown:

## TIER 1: Tables with ZERO rows and ZERO activity ever (safe to delete)

These tables have never had a single row inserted, updated, or deleted. They exist purely as dead weight.

| Table | Purpose | Frontend Component |
|-------|---------|-------------------|
| `activity_logs` | General activity tracking | None active |
| `analysis_logs` | Analysis logging | None active |
| `audit_log` | Audit trail | None active |
| `background_datasets` | Background data | None active |
| `calculator_records` | Calculator history | CalculatorPanel (local storage only) |
| `calendar_events` | Calendar events | CalendarPanel (no DB writes happening) |
| `categorized_interactions` | AI categorization | None active |
| `category_definitions` | Category config | None active |
| `chapter_documents` | FFA chapter docs | DocumentationCenter |
| `child_activity_logs` | Guardian monitoring | GuardianPanel |
| `creator_interactions` | Creator tracking | None active |
| `crider_chat_messages` | Social chat messages | SocialChatInterface |
| `documents` | Document storage | DocumentAIPanel |
| `feedback` | User feedback | FeedbackModal |
| `ffa_projects` | FFA project tracking | FFARecordBook |
| `google_integrations` | Google API connections | GoogleIntegrationsSettings |
| `google_integration_activity` | Google API logs | GoogleIntegrationsSettings |
| `invoices` | Invoice records | InvoiceSystem |
| `memories` | Old memory system | Replaced by ai_memory |
| `monitoring_logs` | System monitoring | fixxy-autonomous |
| `function_error_analysis` | Error tracking | fixxy-autonomous |
| `openai_requests` | OpenAI request log | None active |
| `profiles_old` | Old profiles backup | None (backup table) |
| `support_tickets` | Support system | None active |
| `text_to_speech_requests` | TTS tracking | Unused (tts_requests also empty) |
| `tts_requests` | TTS monthly tracking | Unused |
| `uploaded_files` | File uploads metadata | FilesPanel (has 26 rows but 0 inserts in stats) |
| `usage_log` | Usage logging | None active |
| `user_agreements` | User agreements | UserAgreement page |
| `user_chats` | Old chat system | Replaced by chat_messages |
| `user_subscriptions_backup` | Backup table | None |
| `subscription_payments` | Payment tracking | None active |

## TIER 2: Tables with data but LAST ACTIVITY over 4 months ago (stale)

These tables haven't been touched since before October 2025 (4+ months ago from Feb 2026):

| Table | Rows | Last Activity | Status |
|-------|------|---------------|--------|
| `system_updates` | 3 | Jul 13, 2025 | 7+ months stale |
| `reviews` | 1 | Jul 14, 2025 | 7+ months stale |
| `user_tiers` | 3 | Jul 14, 2025 | 7+ months stale (replaced by profiles.tier) |
| `relationships` | 1 | Aug 27, 2025 | 5+ months stale |
| `vehicle_designs` | 1 | Sep 20, 2025 | 4+ months stale |
| `checkout_sessions` | 4 | Sep 21, 2025 | 4+ months stale |
| `friend_requests` | 14 | Sep 21, 2025 | 4+ months stale |
| `friendships` | 4 | Sep 22, 2025 | 4+ months stale |
| `direct_messages` | 49 | Sep 24, 2025 | 4+ months stale |
| `autonomous_tasks` | 3 | Sep 26, 2025 | 4+ months stale |
| `user_updates` | 2 | Sep 26, 2025 | 4+ months stale |
| `feature_usage` | 4 | Sep 27, 2025 | 4+ months stale |
| `autonomous_fixes` | 0 | Never | Dead |
| `autonomous_updates` | 0 | Never | Dead |

## TIER 3: Duplicate/redundant tables (consolidate)

| Table | Redundant With | Notes |
|-------|---------------|-------|
| `memories` | `ai_memory` | Old system, ai_memory has 1,406 rows and is actively used |
| `user_chats` | `chat_messages` | Old system, chat_messages has 1,247 rows |
| `profiles_old` | `profiles` | Backup from migration |
| `user_subscriptions_backup` | `user_subscriptions` | Backup |
| `user_tiers` | `profiles.tier` | Tier stored in profiles now |
| `tts_requests` | None active | Both tts tracking tables empty |
| `text_to_speech_requests` | None active | Duplicate of above |
| `ai_requests` | None active | Tracked in ai_usage instead |
| `openai_requests` | None active | Tracked in ai_usage instead |

## Frontend Features to Remove

These features have corresponding empty/stale tables and no user engagement:

### 1. Social Panel (entire section)
- **Components:** `SocialChatInterface`, `FriendshipManager`, `UserDirectory`, `StoryManager`, `SnapchatLikeInterface`, `VideoCallInterface`
- **Tables:** `stories`, `story_views`, `user_follows`, `blocked_users`, `direct_messages`, `direct_conversations`, `friend_requests`, `friendships`, `crider_chat_messages`, `crider_chat_users`, `relationships`
- **Why:** Social features had brief activity in Sep 2025 then went completely dead. Zero user engagement for 4+ months.

### 2. Google Integrations
- **Components:** `GoogleIntegrationsSettings`, `GoogleSheetsPanel`
- **Tables:** `google_integrations`, `google_integration_activity`
- **Edge Function:** `sync-buyers-to-sheets`
- **Why:** Zero rows ever. Never used.

### 3. Invoice System
- **Components:** `InvoiceSystem`, `InvoiceCreator`, `InvoiceList`, `InvoiceTemplates`
- **Tables:** `invoices`
- **Why:** Zero rows ever. Never used.

### 4. Fixxy Autonomous System
- **Components:** `FixxyBot`, `FixxyBotTrigger`
- **Edge Function:** `fixxy-autonomous`
- **Tables:** `autonomous_tasks`, `autonomous_fixes`, `autonomous_updates`, `monitoring_logs`, `function_error_analysis`
- **Why:** 3 tasks logged in Sep 2025 then never used again.

### 5. Reviews Panel
- **Components:** `ReviewsPanel`
- **Tables:** `reviews`
- **Why:** 1 review from Jul 2025. Dead for 7 months.

### 6. Categorize Interactions System
- **Edge Function:** `categorize-interactions`
- **Tables:** `categorized_interactions`, `category_definitions`
- **Why:** Zero rows. Never used.

### 7. Old/Duplicate Edge Functions to Delete
- `add-training-data` - `cridergpt_training_data` last used Jan 2026 but only 11 rows total
- `categorize-interactions` - Zero data ever
- `convert-3d-model` - No evidence of use
- `deploy-changes` - No evidence of use
- `execute-sql` - Security risk, should be removed
- `migrate-character-photos` - One-time migration, done

## Edge Functions to Delete

| Function | Reason |
|----------|--------|
| `categorize-interactions` | Zero data, unused |
| `convert-3d-model` | No usage |
| `deploy-changes` | No usage |
| `execute-sql` | Security risk + unused |
| `migrate-character-photos` | One-time migration complete |
| `sync-buyers-to-sheets` | Google Sheets integration unused |

## What STAYS (actively used)

These are your core features with real recent activity:

| Feature | Table | Recent Activity |
|---------|-------|----------------|
| AI Chat | `chat_messages` (1,247 rows) | Feb 6, 2026 |
| AI Memory | `ai_memory` (1,406 rows) | Feb 6, 2026 |
| AI Feedback/Learning | `ai_feedback` (854 rows) | Feb 6, 2026 |
| AI Interactions | `ai_interactions` (983 rows) | Feb 6, 2026 |
| User Patterns | `user_patterns` (24 rows) | Feb 6, 2026 |
| User Preferences | `user_preferences` (16 rows) | Feb 6, 2026 |
| Media Generations | `media_generations` (129 rows) | Jan 23, 2026 |
| Profiles | `profiles` (46 rows) | Active |
| User Roles | `user_roles` | Active |
| Buyers | `buyers` (50 rows) | Active |
| Demo Usage | `demo_usage` (12 rows) | Dec 30, 2025 |
| FFA Chapters | `chapters` (346 rows) | Active |
| Plan Configurations | `plan_configurations` | Active (core pricing) |
| Stripe (checkout, webhooks) | Various | Active |

## Implementation Steps

### Step 1: Database cleanup (migration)
Drop all Tier 1 tables (33 tables with zero activity)

### Step 2: Drop Tier 2 stale tables
Drop the 14 tables with no activity in 4+ months. For tables with small amounts of data (like `direct_messages` with 49 rows), the data will be lost but it's been untouched for months.

### Step 3: Remove frontend components
- Delete the Social Panel and all sub-components (6 files)
- Delete Invoice system components (4 files)
- Delete Google integration components (2 files)
- Delete FixxyBot components (2 files)
- Delete ReviewsPanel (1 file)
- Remove references from `Index.tsx`, `NavigationSidebar.tsx`, `MobileNavigation.tsx`

### Step 4: Remove edge functions
Delete 6 unused edge functions from `supabase/functions/`

### Step 5: Clean up related hooks
Remove hooks that only serve deleted features (e.g., `useGoogleIntegrations`, `useEvents`)

### Step 6: Update navigation
Remove deleted panels from the sidebar and mobile navigation menus

### Technical Notes

- Database drops will use `CASCADE` to handle any foreign key constraints
- The `profiles_old` and `user_subscriptions_backup` tables will be dropped since they're just old backups
- Edge function deletions will be deployed automatically
- Related database functions/triggers that reference dropped tables will also be cleaned up
- No data migration needed since all tables being dropped are either empty or stale

### Estimated Impact
- Approximately 47 database tables removed
- 15+ frontend component files deleted
- 6 edge functions removed
- Significantly reduced backend complexity and Supabase resource usage

