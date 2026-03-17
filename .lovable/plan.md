

# Add App Feature Tools to AGI Mode

## What You're Asking For

You want CriderGPT's AI to be able to **use** the app's own features — calendar, calculators, FFA records, etc. — as tools during conversation. Instead of just talking about them, the AI can actually read/write calendar events, run calculations through the real calculators, look up FFA data, etc.

## Current State

The **AGI Mode** (`agi-chat/index.ts`) already has a tool-calling loop with 7 tools: `memory_recall`, `livestock_lookup`, `save_memory`, `calculate`, `create_task`, `ffa_record_entry`, `get_pending_tasks`. This is the right place to add new feature tools since it already supports the tool-calling pattern.

The regular `chat-with-ai` does NOT have tool-calling — it's just a straight prompt/response. We'll leave that as-is and focus on AGI mode.

## New Tools to Add to AGI Mode

| Tool | What It Does | DB Table |
|------|-------------|----------|
| `calendar_read` | Fetch upcoming events for the user | `calendar_events` |
| `calendar_create` | Add a new event to the user's calendar | `calendar_events` |
| `ffa_profile_lookup` | Read user's FFA chapter, SAE data | `ffa_profiles` |
| `spending_summary` | Get shared spending group totals | `spending_groups` / `spending_expenses` |
| `usage_check` | Check user's plan limits and current usage | `usage_controls` via `get_usage_summary()` |

**Excluded** (per your request): Payment processing — not a tool the AI should touch.

## Changes

### `supabase/functions/agi-chat/index.ts`

1. **Add 5 new tool definitions** to the `AGI_TOOLS` array with proper schemas
2. **Add 5 new cases** to the `executeTool` switch statement, each querying the relevant Supabase table
3. **Update the system prompt** to tell the AI about its new capabilities and when to use each one

### Example: Calendar Tool

```typescript
// Tool definition
{
  type: "function",
  function: {
    name: "calendar_read",
    description: "Read the user's upcoming calendar events. Use when they ask about their schedule, what's coming up, or when something is.",
    parameters: {
      type: "object",
      properties: {
        days_ahead: { type: "number", description: "How many days ahead to look (default 7)" }
      }
    }
  }
}

// Execution
case "calendar_read": {
  const daysAhead = args.days_ahead || 7;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const { data, error } = await supabaseAdmin
    .from("calendar_events")
    .select("title, description, start_time, end_time, location")
    .eq("user_id", userId)
    .gte("start_time", new Date().toISOString())
    .lte("start_time", futureDate.toISOString())
    .order("start_time", { ascending: true })
    .limit(20);
  // format and return
}
```

## What This Means for Users

When AGI Mode is on, a user can say things like:
- "What do I have going on this week?" → AI calls `calendar_read`
- "Add a vet appointment for Friday at 2pm" → AI calls `calendar_create`
- "How's my FFA chapter looking?" → AI calls `ffa_profile_lookup`
- "How much have we spent this month?" → AI calls `spending_summary`
- "Am I close to my daily limit?" → AI calls `usage_check`

The AI chains these with existing tools naturally — e.g., reading calendar + creating a task reminder in one response.

## File Modified

| File | Change |
|------|--------|
| `supabase/functions/agi-chat/index.ts` | Add 5 new tool definitions, 5 new executeTool cases, update system prompt |

