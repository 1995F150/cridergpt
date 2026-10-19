# Website/native iOS parity — implementation and release gates

This update keeps SwiftUI as the native interface. It is not a pixel-identical web wrapper and does not claim every website tool has been rewritten natively.

| Area | Implemented in this proposal | Still requires verification/work |
| --- | --- | --- |
| Models | Native catalog from existing authenticated `public_models`; cloud labels generated from website definitions | Test account/plan gating and installed server catalog against real staging accounts |
| Conversation history | Same `chat-operations` endpoints as website; persisted user/assistant turns, titles, search, rename, deletion | Device/account tests; backend retention still matters, and separate local-server sync PR #7 is not activated by this work |
| Switching | Model per request, one conversation preserved, actual model saved independently, recent complete pairs reused | Real-model quality and context limits; no weights changed |
| Responses | Source/model/finish metadata, incomplete warning, safe source links, code-copy display, completed image-job polling | Full tables/math/syntax highlighting/attachments/streaming are not implemented natively; existing endpoint is nonstreaming |
| Unsaved replies | Visible save failure and idempotent save retry, no forced regeneration | Unsaved replies are in process memory until saved; do not close the app while an unsaved reply is shown |
| Navigation | Native Chat, Smart ID, Livestock, Calendar; More contains native Account/Profile plus 35 current website destinations | Website tools use Safari and may require separate sign-in; device-only tools depend on actual OS support |
| Billing | Registered product IDs retained; new purchases explicitly gated off, no finish after failed backend sync; revoked/expired/upgraded local transactions filtered | Existing verifier does not cryptographically verify Apple JWS and is malformed; backend entitlements, Apple notifications, restore/account binding, refunds and sandbox purchases must be repaired/tested before enabling sales |
| Brand | Existing transparent logo, dark styling | Physical device keyboard, accessibility, screen-reader and screenshot review |

Run `node scripts/sync-ios-catalog.mjs` after updating the website's cloud model definitions or route list, and commit the generated JSON files. Native checkpoint availability is fetched at runtime, not copied from a hardcoded version list. The website remains the feature/API source; new native UI still needs an app update. Cloud model generation snapshots include required-plan labels, but access remains a backend responsibility.

The simulator workflow now builds and runs XCTest fixtures for wire decoding, legacy records, asynchronous image jobs, safe source URLs, actual/requested model distinctions, history pairing and the billing release gate. Passing these tests is not a live backend integration test. Use separate test accounts to verify history appears on both clients and another user cannot read it, exact selected native checkpoints respond, offline failures remain recoverable and images/citations match recorded sources.

No cloud database/function deployment, existing production payment configuration, signing credentials, API keys, model checkpoints or training data is changed by this proposal. Do not enable App Store sales or submit an App Store release until the listed gates pass.
