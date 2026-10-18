# Public Local Chat layout verification

Start Vite bound to loopback (`npm run dev -- --host 127.0.0.1 --port 5187 --strictPort`), then run `node tests/ui/local-chat-layout.cjs`. Override the origin with `CHAT_UI_TEST_URL` if needed.

The Playwright check uses mocked guest Supabase responses, checks desktop 1440px and mobile 390px layouts, verifies no horizontal page overflow, one model selector at the composer, a functional model dialog, and no uncaught browser exceptions. It does not test real accounts, subscriptions, inference, iPhone keyboard behavior or history persistence. Existing account, plan gating, model selection, message handling and attachment flows remain in their current components.

The public chat workspace uses scoped dark Local Chat colors, bounded transcript width, plain assistant replies, rounded user messages, a rounded composer, and an always visible model label. The platform header/navigation and non-chat pages retain their existing branding. The large footer is omitted only on the chat route; other pages keep it. No operational dashboard, API credentials or administrative controls are exposed to public users.

Review desktop/mobile screenshots and authenticated behavior before production deployment. Build warnings about large bundles and old Browserslist data predate this change. Targeted lint comparison reports the same 17 pre-existing errors and two hook warnings in the four edited components; this is not a clean lint baseline.
