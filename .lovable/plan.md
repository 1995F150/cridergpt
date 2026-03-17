

# Upgrade Demo Chat to Drive Signups & Traffic

## Problem
Right now, unauthenticated visitors land on the full app UI, get 1 demo message (localStorage limit), and see a generic signup modal. There's no compelling reason to sign up. The demo-chat edge function allows 3 messages but ChatPanel doesn't even use it. The experience doesn't showcase CriderGPT's strengths.

## What We're Building

A proper **public demo experience** that lets visitors try 5 real AI messages without signing up, with a persistent chat thread, smart signup nudges, and a public-facing hero section that sells the app.

## Changes

### 1. Increase Demo Limit to 5 Messages
- **`src/hooks/useDemoMode.ts`**: Change `maxMessages` from 1 to 5
- **`supabase/functions/demo-chat/index.ts`**: Change server-side limit from 3 to 5
- More messages = more invested users = higher conversion

### 2. Route Demo Users Through the `demo-chat` Edge Function
- **`src/components/panels/ChatPanel.tsx`**: When `!user`, call `supabase.functions.invoke('demo-chat')` instead of `generateSmartResponse`. This uses the proper server-side tracking (IP, user agent, session) and prevents localStorage bypass.
- Show a persistent "messages remaining" counter in the chat header

### 3. Add a Public Welcome Hero for Guests
- **New: `src/components/GuestWelcomeHero.tsx`**: A compact hero card shown above the chat for unauthenticated users. Shows:
  - CriderGPT logo + tagline ("AI-powered farming, welding, FFA & more")
  - "Try it free — 5 messages, no signup" badge
  - 3-4 quick-start suggestion chips ("What's the best welding rod for mild steel?", "Help me plan a crop rotation", "Calculate voltage drop for 100ft wire", "What should I say in my FFA speech?")
  - These pre-fill the chat input so visitors immediately see value

### 4. Better Signup Conversion Modal
- **`src/components/DemoExhaustedModal.tsx`**: Update copy to be more compelling:
  - Show what they accomplished in the demo (e.g. "You asked about welding and farming!")
  - Highlight top features they haven't tried yet (calculators, FFA tools, livestock)
  - Add Google sign-in button directly in the modal (one-click signup)
  - "Takes 10 seconds" messaging

### 5. Progressive Signup Nudges
- **`src/components/panels/ChatPanel.tsx`**: After message 2, show a subtle inline banner: "Enjoying CriderGPT? Sign up to save your chats and unlock 30+ tools"
- After message 4, show a more prominent nudge with the signup CTA
- After message 5, show the exhausted modal

### 6. SEO Landing Content for Guests
- **`src/pages/Index.tsx`**: When `!user`, render a lightweight SEO section below the chat with:
  - "What is CriderGPT?" paragraph (crawlable text for Google)
  - Feature grid showing top tools (calculators, FFA, livestock, AI image gen)
  - This gives Google indexable content beyond just the app shell

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useDemoMode.ts` | Increase limit to 5 |
| `supabase/functions/demo-chat/index.ts` | Increase to 5, improve system prompt |
| `src/components/panels/ChatPanel.tsx` | Route demo through edge function, add nudges + counter |
| `src/components/GuestWelcomeHero.tsx` | **New** — hero card with quick-start chips |
| `src/components/DemoExhaustedModal.tsx` | Better copy, Google sign-in button, feature highlights |
| `src/pages/Index.tsx` | Add SEO content section for guests |

## Why This Works

- **5 messages** is the sweet spot — enough to show real value, not enough to satisfy ongoing need
- **Quick-start chips** eliminate the "what do I type?" blank page problem
- **Server-side tracking** prevents people from clearing localStorage to get unlimited demos
- **SEO content** gives Google something to index beyond the app shell, helping you rank for "AI farming assistant", "welding calculator", "FFA tools"
- **Progressive nudges** convert at the right moment — when users are engaged, not annoyed

