Chat rendering currently differs by provider, normal conversation history is built but omitted from inference, and history requests can race a conversation change. This adds shared safe Markdown and highlighted/copyable code, paginated owner-scoped history with replay, accurate stored model identity, save-only retry for unsaved replies, and a mobile composer that remains visible in a resized viewport.

Read-only production inspection also confirmed an active hourly job deleting chats after 24 hours. Two review-only migrations address parent-conversation ownership for direct Data API requests and preserve chat history while retaining unrelated cleanup. Neither migration was applied; storage growth and disposable-database tests are release gates.

Validation: 42 unit/rendering/Edge tests, 33 browser assertions, full-app synthetic-data smoke, TypeScript, focused chat lint and production build passed. Full-repository lint still fails (848 errors versus 856 on unchanged main). Browser iPhone dimensions used Chromium because WebKit is unavailable. Live model quality and authenticated cross-device production were not tested.

Dependency audit reports 26 advisories including one critical in the existing graph; selected highlight.js/DOMPurify have none reported. No broad dependency auto-fix was run.

No production deployment, merge, secret change, billing change, training or model checkpoint modification. See docs/v6 for architecture, measured verification, screenshots, rollout and rollback. Draft pending migration review, real Safari/device checks and resolution of public API connectivity.
