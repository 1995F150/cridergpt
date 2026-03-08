

# Add Agent Mode Toggle to Chat UI

## What We're Building
An Agent Mode toggle button in both chat input components (`ModernChatInput.tsx` and `ChatInput.tsx`) that lets users switch between standard chat and the autonomous agent execution mode.

## Design

- **Icon**: `Bot` from lucide-react (robot head) — directly represents the automation agent
- **Placement**: Next to the Plus/Paperclip button in the input area
- **Visual States**:
  - OFF: `variant="ghost"`, muted/greyed-out appearance
  - ON: Solid fill with brand color (`bg-[#D8B142]`), distinct glow effect
- **Tooltip**: OFF = "Toggle CriderGPT Agent Mode", ON = "Agent Mode Active. Click to exit."
- **Toast on activation**: "CriderGPT Agent Mode Activated. Send a task."
- **Toast on deactivation**: "Agent Mode Deactivated."

## Props Changes

Both components will:
1. Add `agentMode` state (`useState<boolean>(false)`)
2. Pass agent mode status along with messages when sending (add `isAgentMode?: boolean` to the `onSendMessage`/`onSend` callback or expose via a new prop)
3. Show the toggle button with tooltip wrapping

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ModernChatInput.tsx` | Add Agent Mode toggle button next to Plus button, manage state, fire toast |
| `src/components/chat/ChatInput.tsx` | Add Agent Mode toggle button next to Paperclip button, manage state, fire toast |

## Implementation Details

- Import `Bot` from `lucide-react` and `Tooltip` components
- Add the toggle between the Plus/Paperclip and the textarea
- When clicked: toggle state, show confirmation toast
- When agent mode is ON and user sends a message, prepend `[AGENT_MODE]` to the message or pass as metadata (keeping it simple — prepend approach so downstream `chat-with-ai` can detect it)
- Wrap button in `Tooltip` for hover labels

No other files need changes — the agent mode flag will flow through the existing message pipeline.

