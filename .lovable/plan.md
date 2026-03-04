

# Integrate CriderGPT Conversational Continuity System Prompt

## What's Needed

Add the conversational continuity directives (context tracking, implicit reference resolution, assumption policy, multi-turn awareness) into the existing `chat-with-ai` edge function's `SYSTEM_PROMPT`.

## Changes

### 1. Update `supabase/functions/chat-with-ai/index.ts`

Insert the conversational continuity block into the `SYSTEM_PROMPT` function, right after the date/time awareness section (line 33) and before the existing CriderGPT identity block. This includes:

- **Conversation State Tracking** — instruct the AI to maintain running context of topic, referenced assets, user intent, and assumptions
- **Implicit Reference Resolution** — resolve "all", "it", "that", "everything" from recent context instead of asking clarifying questions
- **Assumption Policy** — make reasonable assumptions and state them briefly, keep moving
- **Follow-up Handling** — treat every message as a continuation, interpret short replies ("yes", "do it") in context
- **Clarification Rule** — only ask if multiple interpretations are equally likely AND materially affect the outcome; ask ONE question max
- **Multi-Turn Task Support** — track progress across messages, avoid re-asking resolved questions
- **Internal Reasoning Mode** — complex reasoning stays internal, only show the final confident answer

### 2. Increase conversation history window

Currently the function only sends the last 10 messages of `conversation_history` (line 582). Increase to **20** to give the AI more context for continuity.

### 3. Deploy the updated edge function

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/chat-with-ai/index.ts` | Add continuity prompt block + increase history window |

