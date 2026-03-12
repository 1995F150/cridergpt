

# Add AGI Capabilities to CriderGPT

CriderGPT already has strong foundations — memory system, agent swarm, pattern detection, predictive suggestions, and an autonomous agent mode. This plan unifies and upgrades these into a cohesive AGI-like experience.

---

## What "AGI Mode" Means for CriderGPT

A single toggle in the chat that transforms CriderGPT from a standard chatbot into an autonomous, tool-using, self-improving assistant that:
1. **Decides which tools to use** — web search, image gen, livestock lookup, calculations, document analysis — without the user needing to phrase things a specific way
2. **Chains multiple steps** — researches, reasons, acts, and reports back
3. **Remembers everything** — pulls from all memory sources automatically
4. **Learns continuously** — every interaction improves future responses

---

## Architecture

```text
User Message
    │
    ▼
┌───────────────┐
│  AGI Router   │  (new edge function: agi-chat)
│  (Tool-Call   │
│   Enabled)    │
└──────┬────────┘
       │ Tool calls decided by AI
       ▼
┌──────────────────────────────────────────┐
│  Available Tools (function calling)      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ web_search│ │livestock │ │ image_gen│ │
│  │          │ │ _lookup  │ │          │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │calculate │ │ memory   │ │ document │ │
│  │          │ │ _recall  │ │ _analyze │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐              │
│  │ffa_record│ │ task_mgmt│              │
│  │ _book    │ │          │              │
│  └──────────┘ └──────────┘              │
└──────────────────────────────────────────┘
       │
       ▼
  Final Response (multi-step reasoning visible)
```

---

## Implementation Plan

### 1. New Edge Function: `agi-chat`

A new edge function that uses the Lovable AI Gateway with **tool calling** (function calling). Instead of the current approach where ChatPanel.tsx does regex detection for images, PDFs, etc., the AI itself decides what tools to invoke.

**Tools defined via function calling schema:**
- `web_search` — search the web for current info (uses Perplexity or the AI's own knowledge)
- `livestock_lookup` — query the user's herd data from `livestock_animals`
- `memory_recall` — search `ai_memory` + `imported_messages` for relevant past context
- `generate_image` — call `generate-ai-image` to create images
- `analyze_document` — call `document-ai-analysis` for uploaded files
- `ffa_record_entry` — format messy input into structured FFA record book entries
- `calculate` — perform math/financial/ag calculations
- `create_task` — add items to the user's `pending_tasks`
- `save_memory` — explicitly store important info to `ai_memory`

The edge function handles the tool-call loop: AI responds with tool calls → function executes them → results fed back → AI produces final answer. Up to 5 iterations.

### 2. Update ChatPanel.tsx — AGI Mode Toggle

Replace the scattered regex-based routing (image detection, PDF detection, keyword routing) with a single code path when AGI mode is on:
- Send message to `agi-chat` instead of `chat-with-ai`
- The AI handles ALL routing decisions internally
- Keep the existing `chat-with-ai` path as fallback when AGI is off
- Show a "thinking" indicator that displays which tools the AI is using ("🔍 Searching memory...", "🐄 Looking up herd data...", "🎨 Generating image...")

### 3. Streaming Tool Status UI

Add a `ThinkingSteps` component that shows the AI's reasoning chain in real-time:
```
🧠 Thinking...
├── 🔍 Searching your memories for "calf weights"
├── 🐄 Found 12 animals in your herd
├── 📊 Calculating weight trends
└── ✅ Composing response
```

### 4. Enhanced Memory Integration

Update the `agi-chat` function to automatically:
- Pull last 30 `ai_memory` entries for the user
- Pull last 20 `imported_messages`
- Pull `writing_samples` for voice matching
- Pull `pending_tasks` so the AI knows what's outstanding
- After every response, auto-store key facts to `ai_memory`

### 5. Self-Improvement Loop

The existing `learning_queue` + `self-learn` pipeline stays. Additionally:
- When the AI uses a tool and gets a result, it stores the successful tool-use pattern in `ai_memory` with category `tool_pattern`
- Over time, the AI gets better at knowing which tools to use for which queries

---

## Files Changed/Created

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/agi-chat/index.ts` | **New** | Core AGI edge function with tool-calling loop |
| `supabase/config.toml` | Edit | Add `[functions.agi-chat]` config |
| `src/components/panels/ChatPanel.tsx` | Edit | Add AGI mode toggle, route to `agi-chat`, show thinking steps |
| `src/components/chat/ThinkingSteps.tsx` | **New** | UI component showing AI's tool-use chain |
| `src/hooks/useAGIMode.ts` | **New** | Hook to manage AGI mode state + localStorage persistence |

---

## What Stays the Same

- All existing chat functionality works as-is when AGI mode is off
- The system prompt, voice matching, memory system, and persona are preserved
- Agent Swarm remains a separate parallel-processing feature
- Demo mode limits still apply
- Plan-based rate limiting still enforced

---

## Technical Details

The `agi-chat` edge function uses the Lovable AI Gateway's tool-calling support. Each tool is defined as a JSON schema function. The AI model (`google/gemini-2.5-pro` for AGI mode — strongest reasoning) decides which tools to call. The function loops:

1. Send messages + tool definitions to AI
2. If AI returns `tool_calls` → execute each tool server-side
3. Append tool results as `tool` role messages
4. Re-send to AI for next step
5. Repeat until AI returns a final text response (max 5 iterations)

This eliminates all client-side regex routing and makes CriderGPT truly autonomous in deciding how to help.

