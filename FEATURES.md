# CriderGPT — Full Feature Inventory

_Auto-curated snapshot. Use this as a checklist for what's shipped, what's idle, and what's worth promoting on the Play Store / App Store._

## 🧠 AI Core
- **CriderGPT model lineup** (4.1, 5.0, 5.0 Pro, 5.0 Vision, 5.0 Reasoning) — all now routed through **Lovable AI Gateway → Google Gemini** by default (no OpenAI bill needed for chat)
- **AGI Mode** — autonomous multi-step reasoning loop with tool calling
- **Agent Swarm** — 150-agent parallel processing for heavy jobs
- **Multi-modal chat** — text, image upload, camera, speech-to-text, file analysis
- **Conversational continuity** — persistent memory across turns, implicit reference resolution
- **Jessie Crider persona** — Southern/Gen Z voice lock, anti-AI-detection writing samples
- **Free-will tool budget** — per-plan cap on autonomous reasoning steps (free 2 → lifetime 25)
- **Hybrid local-first router** — tries local Ollama first, falls back to cloud

## 🗣️ Voice & Calling
- **Call Mode** (OpenAI Realtime, WebRTC) — currently paused if OPENAI_API_KEY is unfunded
- **Text-to-speech** — XTTS-v2 self-hosted + browser TTS fallback
- **Speech-to-text** — browser SpeechRecognition + Whisper (when key present)

## 📦 Store & Commerce
- **Official Retail Platform** — physical Smart Tags + digital products
- **Stripe checkout** (physical/web goods) + **In-App Purchases** (mobile digital)
- **Cart, lead-time calculator, 10-unit reserve constraint**
- **Order lifecycle** — paid status gated by Stripe webhook
- **Snapchat Custom Filters** — pricing engine, BOGO rules
- **Subscription tiers** — Free / Plus / Pro / Lifetime

## 🐄 Livestock System
- **Scan-only registration** with `CriderGPT-XXXXXX` plain-text NFC tags
- **NFC tag writing** (Android default, iOS manual-entry fallback)
- **Raspberry Pi scanner** integration (Python edge device)
- **Tag lookup, breed index, animal records**

## 🌾 FFA & Education
- **Multi-chapter FFA platform** with linking
- **Two-tier event visibility** (Personal vs Chapter)
- **Calendar, events, leaderboard**
- **Guides, recipes, RDR2 gamer guide** (SEO magnet)
- **Public demo experience** — 5 free guest messages

## 🔌 Integrations
- **Snapchat** — Snap Kit OAuth, Bitmoji, AR lens strategy
- **TikTok** — Content Posting API, direct video upload
- **OAuth providers** — Google (popup), GitHub, X/Twitter, Spotify
- **ChatGPT import** — JSON conversation ingest
- **Self-hosted media engine** — XTTS-v2, MusicGen on AMD CPU

## 💻 Local PC & Hardware
- **Docker agent** — sandboxed CLI on user's PC
- **PC linking** (`/link-pc`, `/link-pc-token`) — one-way token-auth ingest, no inbound ports
- **PC Events Feed** (`/pc-feed`) — realtime stream + send-command outbox
- **USB Data Hub** — Web Serial / WebUSB hardware bridge
- **Sensor integration** — environmental data injected into prompts
- **Automated 6-hour DB backup** to local server

## 📱 Mobile
- **Android app** (`android_app/`) — Capacitor + native Kotlin, Google OAuth, NFC, FCM push
- **iOS strategy** — Capacitor + EAS Cloud Build (no Mac required)
- **PWA** — responsive, offline support, install prompt
- **VoiceInteractionService** — native Android assistant target

## 🛡️ Auth & Privacy
- **Popup OAuth only** — no full-page redirects
- **Developer identity verification** — Dev Panel locked to owner via RPC
- **Strict RLS** on every table
- **Never sell user data / cookies**
- **No GoGuardian bypass** assistance

## 🔧 Developer Tools (owner-only)
- **Developer code editor** — manual code editor
- **System diagnostics** page
- **CriderGPT public API** with API key minting + rate limits
- **MCP server** (cloud + local PC bridge)

## 💰 Funding-Ready (Pre-staged)
- **Subscription billing** via Stripe (live)
- **Snapchat filter checkout** (live)
- **Lifetime plan checkout** (live)
- **Referral system** with share-unlock rewards
- **AdMob slot** — see `ADMOB_SETUP.md` (post-18, Play Store launch)

---

## What's NOT being used yet (worth turning on for launch)
1. **Video ads (AdMob)** — pre-staged, waiting on Play Console account
2. **Snapchat AR lens** — marketing strategy doc exists, lens not deployed
3. **Native Android assistant intent** — wired but not registered as default
4. **TikTok auto-posting** — API connected, no scheduled posts queue yet

## Suggested launch order (June 18+)
1. Open Google Play Console ($25 one-time)
2. Build release APK from `android_app/`, sign with upload key
3. Wire AdMob app ID (see `ADMOB_SETUP.md`)
4. Submit closed track → open beta → production
5. Apple side: EAS Cloud Build for iOS, submit to App Store Connect
