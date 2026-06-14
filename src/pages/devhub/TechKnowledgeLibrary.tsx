import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Search } from "lucide-react";

type Chapter = {
  id: string;
  track: "Auth" | "Backend" | "Mobile" | "DevOps" | "Payments" | "Security" | "Frontend" | "AI" | "Hardware";
  title: string;
  oneLiner: string;
  readMinutes: number;
  body: string; // markdown-ish; rendered as preformatted plain text with headings preserved
};

const CHAPTERS: Chapter[] = [
  // ============== AUTH TRACK ==============
  {
    id: "auth-google-web-vs-android",
    track: "Auth",
    title: "Google Sign-In: Web Client ID vs Android Client ID (and why your APK keeps failing)",
    oneLiner: "The single biggest reason native Google sign-in fails: wrong client ID + missing SHA-1.",
    readMinutes: 12,
    body: `WHY THIS MATTERS
Google OAuth on the web and Google Sign-In on Android are TWO DIFFERENT flows that share
the same Google Cloud project but use DIFFERENT OAuth client IDs. Mixing them up is the #1
cause of "sign in failed" on a freshly built APK.

THE TWO CLIENT IDS YOU CREATE IN GOOGLE CLOUD
1. Web application client ID
   - Type: "Web application"
   - Used by: your website, your PWA, and SUPABASE'S OAUTH BRIDGE.
   - Needs: Authorized JavaScript origins + Authorized redirect URIs (your Supabase
     callback: https://<project-ref>.supabase.co/auth/v1/callback).
   - Has a client SECRET. You paste both the web client ID and the secret into
     Supabase Auth -> Providers -> Google. That is the only place the secret lives.

2. Android client ID
   - Type: "Android"
   - Used by: the native Android app when it calls Google Sign-In SDK directly.
   - Needs: package name (app.cridergpt.android) + SHA-1 fingerprint of the keystore
     that signs the APK. Has NO secret (Android can't keep a secret).
   - You can have multiple Android client IDs: one for your debug keystore, one for
     your release/upload keystore, one for the Play App Signing key.

WHICH ONE GOES IN THE ANDROID APP CODE?
This is where most people get it wrong. It depends on HOW you sign in:

A) If the Android app opens a Chrome Custom Tab and calls Supabase
   signInWithOAuth({ provider: 'google' }) (what CriderGPT does today):
   - The Android app does NOT need an Android client ID at all for sign-in.
   - Supabase uses your WEB client ID + secret internally.
   - Android only needs: the Supabase URL + anon key, a deep link redirect
     (cridergpt://auth-callback), and a Chrome Custom Tab.
   - Your APK fails most often because:
       * the redirect URL is not in Supabase Auth -> URL Configuration
       * the intent-filter for cridergpt:// is missing in AndroidManifest.xml
       * the package name registered with Google differs from what you actually ship.

B) If you use the native Google Sign-In SDK (GoogleSignInClient / Credential Manager):
   - You pass the WEB CLIENT ID as the serverClientId / setServerClientId(...).
     Yes, even on Android, the value you hand to the SDK is the WEB client ID.
   - The Android client ID itself is registered with Google so it will TRUST your
     APK's SHA-1 + package combo, but you never hardcode it. The SDK looks it up
     from google-services.json + your signing fingerprint.
   - You get back an ID token (JWT). You send it to Supabase:
        supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
   - Failure modes:
       * SHA-1 mismatch (debug vs release vs Play App Signing).
       * Wrong serverClientId (you put the Android client ID instead of Web).
       * Package name mismatch.
       * google-services.json from a different Firebase project.

WHICH SHA-1 DO YOU REGISTER?
You need ALL of these in Google Cloud -> Credentials -> your Android client:
- Debug keystore SHA-1 (so dev installs work)
- Your local release/upload keystore SHA-1 (the .jks you sign the AAB with)
- Play App Signing SHA-1 (Play Console -> App integrity). When you upload to Play,
  Google re-signs with its own key, and THAT fingerprint is what the installed app
  on a user's phone actually has.

If you only register the upload key, sign-in works on a sideloaded APK but breaks
the moment users install from the Play Store. That is the trap.

CHECKLIST FOR CRIDERGPT (FLOW A, CHROME CUSTOM TABS)
[ ] Supabase Auth -> URL Configuration -> Site URL = https://cridergpt.com
[ ] Supabase Auth -> URL Configuration -> Redirect URLs includes:
       https://cridergpt.com/**, cridergpt://auth-callback
[ ] Supabase Auth -> Providers -> Google: Web client ID + Web client secret pasted
[ ] Google Cloud OAuth consent screen: cridergpt.com under Authorized domains
[ ] Google Cloud Web client: Authorized redirect URI =
       https://udpldrrpebdyuiqdtqnq.supabase.co/auth/v1/callback
[ ] AndroidManifest.xml has an <intent-filter> for cridergpt://auth-callback
[ ] Same applicationId in build.gradle as the Android client in Google Cloud
[ ] Release SHA-1 + Play App Signing SHA-1 both registered

DEBUG STEPS WHEN IT FAILS
1. In the failing app, capture the exact URL the browser tab lands on. The query
   string almost always contains ?error=... with the real reason.
2. Check Supabase Auth Logs (Dashboard -> Logs -> Auth). Look for
   "redirect_uri_mismatch", "bad_oauth_callback", or "invalid_client".
3. Run "keytool -list -v -keystore <your.jks>" and confirm the SHA-1 matches
   Google Cloud.
4. If you switched to Play App Signing recently, ADD the new SHA-1; do not replace.`,
  },
  {
    id: "auth-supabase-sessions",
    track: "Auth",
    title: "How Supabase sessions actually work (JWT, refresh, getUser vs getSession)",
    oneLiner: "Tokens, refresh tokens, where they live, and why getUser() is the only one you should trust for permissions.",
    readMinutes: 9,
    body: `WHAT SUPABASE ACTUALLY GIVES YOU AT LOGIN
- An access token (a JWT, ~1 hour lifetime) signed by Supabase Auth.
- A refresh token (long-lived, one-time-use). Used silently to mint new access tokens.
- A user object (id, email, providers, metadata).

WHERE THEY LIVE
- Web: localStorage by default (key: sb-<project-ref>-auth-token).
- Native Android (your app): we store them in EncryptedSharedPreferences via
  SupabaseClient.kt so they survive app restarts and aren't readable by other apps.
- iOS (future): Keychain.

THE JWT IS THE KEY
Every authenticated request to PostgREST or an edge function sends the JWT in
the Authorization header. Postgres reads it, sets auth.uid() / auth.role(), and
THAT is what RLS policies check. If the JWT is missing or expired, the request
is treated as anon.

getSession() vs getUser() (THE ONE THAT BITES PEOPLE)
- getSession() reads what's in local storage. Fast, never hits the network.
  It can be stale, forged, or replayed. Use it ONLY to pull the access_token
  to attach to a request that will be re-verified server-side.
- getUser() calls Supabase Auth, validates the token against the server's
  signing key, and returns the real user. Use it any time you make an
  AUTHORIZATION decision in client code (e.g., "is this user the owner?").

REFRESH FLOW
- supabase-js auto-refreshes ~5 min before expiry.
- It fires an onAuthStateChange event (TOKEN_REFRESHED, SIGNED_IN, SIGNED_OUT,
  USER_UPDATED). Register the listener inside a useEffect and DO NOT call
  async work inside the callback synchronously (you'll deadlock the Auth
  client). Defer with setTimeout(..., 0).

COMMON BUGS
- "User logged out at random" -> two browser tabs, one signed out -> storage
  event clears the other. Listen for SIGNED_OUT and re-route.
- "RLS denies everything" -> you're calling from a service where the JWT
  didn't get attached. Check Network tab: the request must have
  Authorization: Bearer eyJ...
- "Edge function can't see user" -> in the function, read the JWT from the
  Authorization header and call supabase.auth.getUser(jwt). Never trust
  user_id from the request body.`,
  },
  {
    id: "auth-roles-rls",
    track: "Auth",
    title: "Roles done right: user_roles table, has_role(), and why role-on-profile is a bug",
    oneLiner: "Storing 'is_admin' on profiles is a privilege escalation waiting to happen.",
    readMinutes: 8,
    body: `THE WRONG WAY
profiles.is_admin = true
- If profiles has any policy that lets a user UPDATE their own row (very common),
  they can flip themselves to admin. Game over.

THE RIGHT WAY
1. Enum of roles: create type public.app_role as enum ('admin','moderator','user');
2. Separate table public.user_roles(user_id, role) with RLS.
3. SECURITY DEFINER function public.has_role(_uid, _role) that bypasses RLS to
   answer "does this user have this role?".
4. Policies on every other table call has_role(auth.uid(), 'admin') instead of
   reading from profiles.

WHY SECURITY DEFINER
Without it, an admin-check policy on table X would query user_roles, which
would trigger user_roles' own policies, which often reference X -> infinite
recursion -> "stack depth exceeded".

ADMIN ACTIONS FROM THE FRONTEND
Never gate "delete any row" purely with a frontend check. The policy on the
table must call has_role(auth.uid(), 'admin') so the database itself refuses
non-admins, even if the UI is bypassed.`,
  },

  // ============== BACKEND TRACK ==============
  {
    id: "backend-postgrest-pipeline",
    track: "Backend",
    title: "From button click to database row: the full Supabase request pipeline",
    oneLiner: "Trace one supabase.from('x').insert(...) call end-to-end and you'll never be confused about RLS again.",
    readMinutes: 11,
    body: `1. UI EVENT
   User clicks "Save". A React handler calls
   supabase.from('livestock_animals').insert({...}).

2. SUPABASE-JS BUILDS AN HTTP REQUEST
   POST https://<project>.supabase.co/rest/v1/livestock_animals
   Headers:
     apikey: <anon key>
     Authorization: Bearer <user JWT, if signed in, otherwise the anon JWT>
     Content-Type: application/json
     Prefer: return=representation

3. POSTGREST RECEIVES IT
   PostgREST is a thin layer that turns HTTP into SQL. It:
     - validates the JWT signature using Supabase's JWT secret
     - opens a database connection
     - SETs role = authenticated (or anon)
     - SETs request.jwt.claims so auth.uid() works
     - issues: INSERT INTO public.livestock_animals (...) VALUES (...) RETURNING *;

4. POSTGRES RUNS THE STATEMENT
   - Before INSERT, it checks: does the role have INSERT privilege on this table?
     (This is the GRANT step. Missing GRANT = "permission denied for table".)
   - Then it checks RLS: every policy of CMD = INSERT must pass its WITH CHECK.
   - Then it runs your BEFORE INSERT triggers (e.g., set updated_at).
   - Then it commits and returns the row.

5. POSTGREST SHAPES THE RESPONSE
   Returns JSON to the browser. supabase-js resolves the promise.

THE TWO LOCKS YOU MUST UNLOCK
- GRANT: a static, per-role privilege. "authenticated can INSERT".
- POLICY: a dynamic, per-row rule. "and only if user_id = auth.uid()".
Miss either one and the request fails. Both must exist.

WHEN TO USE EDGE FUNCTIONS INSTEAD
- When the operation needs the service role key (writing across many users'
  rows, ignoring RLS for admin tasks).
- When you need a secret (Stripe key, OpenAI key).
- When the operation must be ATOMIC across multiple tables/services.
- When you call a third-party API and want to hide its response shape.

EDGE FUNCTIONS ARE STILL REST
Internally they're Deno HTTP handlers deployed to a worker pool. The frontend
calls them via supabase.functions.invoke('name', { body }) which is just a
fetch to https://<project>.functions.supabase.co/name.`,
  },
  {
    id: "backend-table-design",
    track: "Backend",
    title: "Schema design patterns that scale (and how I'd lay out a brand-new feature)",
    oneLiner: "Naming, foreign keys, indexes, soft delete, audit columns, lookup tables.",
    readMinutes: 14,
    body: `THE STANDARD SHAPE OF EVERY USER-OWNED TABLE
id           uuid primary key default gen_random_uuid()
user_id      uuid not null references auth.users(id) on delete cascade
created_at   timestamptz not null default now()
updated_at   timestamptz not null default now()
... domain columns ...

WHY uuid + gen_random_uuid()
- Globally unique. Safe to expose in URLs (vs sequential IDs that leak count).
- No round-trip needed to insert (client can generate too).
- Slight perf cost vs bigint, irrelevant under ~10M rows.

WHY user_id REFERENCES auth.users
- ON DELETE CASCADE means deleting an account wipes their data automatically
  (GDPR + Play policy friendly).
- BUT you cannot query auth.users from supabase-js. If you need username, copy
  it into a public.profiles row keyed by the same id.

UPDATED_AT TRIGGER (always add this)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_touch before update on public.<table>
for each row execute function public.touch_updated_at();

INDEXES — THE 80/20
- Always index every foreign key column you filter on (user_id, especially).
- Index columns you ORDER BY in feeds (created_at desc).
- Use partial indexes for soft-delete: create index ... where deleted_at is null;
- Use a composite (user_id, created_at desc) for "my newest items" queries.

SOFT DELETE vs HARD DELETE
- Soft (deleted_at timestamptz null): keep history, simple "undo", but every
  query has to filter it out.
- Hard: simpler queries, no undo. Pair with an "archive" table for audit.

ENUMS vs LOOKUP TABLES
- Enum (create type) is fast and self-documenting but painful to change
  (alter type add value is non-transactional in older PG).
- Lookup table is flexible, but every query joins.
- Rule of thumb: <10 values that almost never change -> enum. Otherwise table.

ONE-TO-MANY vs JSONB
- If you'll query individual elements, filter, or update them -> child table.
- If it's truly opaque blob you only ever read whole -> jsonb column.
- Don't store user-editable lists as jsonb just to save a table. You'll regret
  it the day you need "find users whose third entry has X".`,
  },
  {
    id: "backend-edge-functions",
    track: "Backend",
    title: "Edge functions deep-dive: secrets, CORS, cold starts, idempotency",
    oneLiner: "Every gotcha I've hit shipping ~60 functions in this project.",
    readMinutes: 12,
    body: `ANATOMY OF A SUPABASE EDGE FUNCTION
- Runs on Deno (not Node). Imports use esm.sh or https URLs, not bare npm names.
- Each function = one Deno.serve() handler.
- Secrets via Deno.env.get('NAME'). They come from Supabase project secrets.
- Auto-deploys when the file changes in Lovable.

THE TWO HEADERS YOU ALWAYS PASS FROM THE CLIENT
- apikey: <anon key>
- Authorization: Bearer <user JWT or anon JWT>
supabase.functions.invoke does this for you. If you fetch() manually, do it
yourself or the function will treat the caller as anon.

CORS — THE MOST COMMON 5-MINUTE BUG
Every function must respond to OPTIONS preflight with:
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
  Access-Control-Allow-Methods: POST, GET, OPTIONS

Otherwise the browser blocks the actual request before it ever reaches your code.

VERIFYING THE USER INSIDE THE FUNCTION
const authHeader = req.headers.get('Authorization');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader! } }
});
const { data: { user } } = await supabase.auth.getUser();
- Never trust user_id from the body.
- For admin tasks, switch to the SERVICE ROLE key in a separate client instance.

SERVICE ROLE KEY RULES
- Lives in Deno.env.get('SUPABASE_SERVICE_ROLE_KEY').
- BYPASSES RLS. Treat like a nuke. Never log it. Never return it.
- Never accept it as a header. Never put it in the frontend bundle.

COLD STARTS
- First call after a few minutes of idle = ~500-1500 ms warmup.
- Mitigate by keeping the function small, lazy-importing heavy SDKs only when
  the request actually needs them.
- For latency-critical paths (chat streaming), keep a "ping" cron job hitting
  the function every 4 minutes.

IDEMPOTENCY (CRITICAL FOR PAYMENTS / WEBHOOKS)
- Stripe will retry a webhook up to 3 days. Your function MUST handle the same
  event_id twice safely.
- Pattern: insert event_id into a processed_events table with a unique constraint
  first, catch unique_violation, and exit early if it's a duplicate.

LOGGING
- console.log goes to function logs (Dashboard -> Functions -> Logs).
- For structured search use console.log(JSON.stringify({event, data})).
- Never log secrets, tokens, or full request bodies that may contain PII.`,
  },
  {
    id: "backend-realtime",
    track: "Backend",
    title: "Supabase Realtime without burning your wallet",
    oneLiner: "Subscribe in useEffect, scope channels narrowly, and unsubscribe — always.",
    readMinutes: 7,
    body: `HOW IT WORKS
Postgres logical replication streams row changes -> Realtime server -> websocket
to every subscribed client. Each table you want on the bus must be ADDED to the
supabase_realtime publication:
  alter publication supabase_realtime add table public.<table>;
And you must set REPLICA IDENTITY FULL if you want the OLD row in updates:
  alter table public.<table> replica identity full;

RLS STILL APPLIES
Subscribers only receive rows their JWT can SELECT. If your policy is broken,
you'll see "no events" with no error — because the events are silently filtered.

THE BILL TRAP
- A bare supabase.channel(...).subscribe() at component scope re-runs every
  render. React strict mode doubles it. You end up with hundreds of leaked
  channels per session.
- ALWAYS:
    useEffect(() => {
      const ch = supabase.channel('xyz').on(...).subscribe();
      return () => { supabase.removeChannel(ch); };
    }, [deps]);

SCOPE CHANNELS
- channel('chat:'+conversationId) and filter on the server side via
  on('postgres_changes', { event:'INSERT', schema:'public', table:'messages',
     filter:'conversation_id=eq.'+id }, ...)
- Don't subscribe to the whole table when you only need one row.

PRESENCE vs BROADCAST vs CHANGES
- postgres_changes: row-level events from the DB.
- broadcast: ephemeral pub/sub, not stored. Good for "user is typing".
- presence: "who's online in this room". State is reconciled across clients.`,
  },

  // ============== MOBILE TRACK ==============
  {
    id: "mobile-deep-links",
    track: "Mobile",
    title: "Deep links and OAuth callbacks on Android (intent-filter, App Links, custom schemes)",
    oneLiner: "Why your OAuth callback opens a browser instead of returning to your app.",
    readMinutes: 10,
    body: `THREE WAYS A LINK CAN OPEN YOUR APP
1. Custom scheme (cridergpt://auth-callback)
   - Easy. No domain ownership proof needed.
   - Downside: other apps can register the same scheme and hijack it.
   - Fine for OAuth callbacks because the OAuth token is single-use.

2. App Links (https://cridergpt.com/auth/callback that opens the app)
   - Requires hosting /.well-known/assetlinks.json on cridergpt.com listing your
     app's package + SHA-256.
   - The OS verifies that file once and then auto-opens your app for matching URLs.
   - Best UX, but more setup.

3. Web intent (any https URL — opens browser, user picks app)
   - Default fallback.

INTENT-FILTER FOR OAUTH CALLBACK
<activity android:name=".MainActivity" android:exported="true" android:launchMode="singleTask">
  <intent-filter android:autoVerify="false">
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    <data android:scheme="cridergpt" android:host="auth-callback"/>
  </intent-filter>
</activity>

WHY launchMode="singleTask"
Without it, the OAuth callback launches a NEW MainActivity on top of the existing
one. Your app's auth listener is on the old instance. Result: token never reaches
your code, sign-in silently fails.

HANDLING THE CALLBACK
override fun onNewIntent(intent: Intent) {
  super.onNewIntent(intent)
  intent.data?.let { uri ->
    // uri = cridergpt://auth-callback#access_token=...&refresh_token=...
    SupabaseClient.handleOAuthRedirect(uri.toString())
  }
}

COMMON FAILURES
- Browser stays open after auth -> intent-filter scheme/host mismatch.
- App opens but stays at login -> you handled the URL in onCreate but not
  onNewIntent (singleTask reuses the instance).
- "Chrome custom tab opens then closes immediately with no callback" -> the
  redirect URL isn't whitelisted in Supabase Auth -> URL Configuration.`,
  },
  {
    id: "mobile-android-keystores",
    track: "Mobile",
    title: "Android signing: debug key, upload key, Play App Signing — what's actually on the device",
    oneLiner: "Three keys exist. Only one is on the user's phone. Most sign-in bugs come from confusing them.",
    readMinutes: 9,
    body: `THE THREE KEYS
1. Debug keystore (~/.android/debug.keystore)
   - Auto-generated. Same on your machine across all projects.
   - Used when you Run/Debug from Android Studio.
   - SHA-1 is stable per machine. Different machines = different SHA-1.

2. Upload keystore (the .jks you create for releases)
   - YOU generate it. You guard it with your life.
   - The AAB you upload to Play is signed with this.
   - Lose it = you can never push another update under the same package name.

3. App Signing key (managed by Google when you enable Play App Signing)
   - Google strips your upload signature and re-signs the APK with this key
     before delivering to devices.
   - The SHA-1 / SHA-256 of THIS key is what your APK ON A USER'S PHONE has.
   - Find it: Play Console -> your app -> Setup -> App integrity -> App signing.

WHICH SHA TO REGISTER WHERE
Google Cloud OAuth (Android client) -> ALL THREE SHA-1s:
  debug + upload + Play app signing.
Firebase (if you use FCM/Crashlytics) -> same three, in Project Settings ->
  Your Android app -> SHA certificate fingerprints.

ROTATION
Play lets you rotate the upload key without losing your app. Rotating the
APP SIGNING key requires "upgrade signing key" and only newer Android versions
trust the new key — so don't do it casually.

LOST UPLOAD KEY
- If Play App Signing is enabled: contact Play support, prove ownership,
  they'll let you upload with a new key.
- If not: your only option is a new package name (= new listing).`,
  },
  {
    id: "mobile-play-billing",
    track: "Mobile",
    title: "Google Play Billing 6/7 end-to-end (CriderGPT Plus/Pro)",
    oneLiner: "BillingClient flow, server-side acknowledge, what verify-iap actually checks.",
    readMinutes: 13,
    body: `THE CONTRACT WITH PLAY
- All digital goods in an Android app MUST go through Play Billing. Stripe is
  forbidden for digital goods inside the Android app (it's fine on the web).
- You define products in Play Console:
    cridergpt_plus_monthly (auto-renewing subscription)
    cridergpt_pro_monthly  (auto-renewing subscription)
- Each subscription has base plans + offers (intro pricing, free trial).

THE BUY FLOW
1. App calls BillingClient.queryProductDetails(['cridergpt_plus_monthly']).
2. User taps "Subscribe" -> launchBillingFlow().
3. Google shows its own UI, takes payment, returns a Purchase object with
   purchaseToken and orderId.
4. App immediately calls your edge function verify-iap with:
       { package: 'app.cridergpt.android', productId, purchaseToken }
5. verify-iap calls Google's Android Publisher API
   (purchases.subscriptionsv2.get) using a service account, gets the canonical
   state (active? expiry? acknowledged?).
6. verify-iap writes to public.iap_purchases (user_id, product_id, expires_at)
   and updates the user's plan in profiles or user_subscriptions.
7. verify-iap returns ok -> the app calls BillingClient.acknowledgePurchase().
   IMPORTANT: if you don't acknowledge within 3 days, Google REFUNDS the user
   automatically.

WHY SERVER VERIFICATION IS NON-NEGOTIABLE
- The Purchase object on-device can be faked by a rooted phone with a hooking tool.
- Only Google's API can confirm "yes this purchaseToken is real and active".
- The service account JSON lives in a Supabase secret, never on the device.

RENEWALS, CANCELS, REFUNDS
- Set up a Real-time Developer Notification (RTDN) topic in Play Console.
- Play publishes events to a Pub/Sub topic -> a Cloud Run webhook -> your
  verify-iap (or a dedicated handler) updates iap_purchases.
- Without RTDN you'll miss cancels and your app keeps thinking the user is Pro.

TESTING
- Add yourself as a license tester in Play Console.
- Use an internal testing track. Real purchases are free for testers; renewals
  are accelerated (a "monthly" renews every ~5 min).`,
  },
  {
    id: "mobile-native-vs-hybrid",
    track: "Mobile",
    title: "Native Kotlin vs Capacitor vs React Native vs Flutter — the real trade-offs",
    oneLiner: "Why CriderGPT Android is pure Kotlin and what we give up by not using Capacitor.",
    readMinutes: 8,
    body: `NATIVE KOTLIN + COMPOSE (current CriderGPT)
+ Full access to every Android API: NFC, USB host, VoiceInteractionService,
  background services, foreground location, BLE, Bluetooth Classic, SAF.
+ Best performance, smallest install size, best Play Store policy posture.
- Two codebases (Kotlin + Swift) for iOS parity. More work to ship features.

CAPACITOR (what we removed)
+ Reuses the web app inside a WebView; one codebase for web + mobile.
- WebView is always one Chrome version behind the system, can break in subtle
  ways across OEM forks.
- Plugins for advanced hardware (NFC tag write, USB serial) are spotty.
- App size bloats because you ship a browser shell + the entire web bundle.
- Play Store reviewers increasingly downrank apps that are "just a website".

REACT NATIVE / EXPO
+ One JS/TS codebase across iOS + Android.
+ Big ecosystem, hot reload, OTA updates via Expo.
- JS bridge overhead on heavy animation or sensor streams.
- Native modules still needed for advanced hardware.

FLUTTER
+ Single Dart codebase, true native rendering via Skia.
+ Tooling and performance are excellent.
- Smaller library ecosystem than RN.
- Dart is yet another language for your team to learn.

WHEN TO CHOOSE WHICH (FOR YOUR PROJECTS)
- Hardware-heavy (NFC, BLE, USB, sensors, voice assistant) -> native.
- CRUD + dashboards + auth -> FlutterFlow or React Native, save time.
- Simple paid utility -> Rork or Bolt -> RN/Expo output.
- A pure content/web product you want installable -> PWA, don't ship native.`,
  },

  // ============== DEVOPS TRACK ==============
  {
    id: "devops-ci-signing",
    track: "DevOps",
    title: "Self-hosted Android Auto-Builder: how it actually signs an AAB on every web update",
    oneLiner: "The chain from 'I pressed Update' to a signed bundle ready for Play.",
    readMinutes: 9,
    body: `THE PIPELINE
1. Lovable webhook -> hits your Ubuntu builder (Cloudflare Tunnel).
2. build-daemon.py wakes up, pulls latest android_app/ from your repo.
3. Runs ./gradlew bundleRelease -- the standard Android Gradle task that:
     - compiles Kotlin
     - bundles resources
     - shrinks/obfuscates with R8 if minifyEnabled
     - produces app-release.aab (unsigned)
4. Signs with apksigner using your release keystore (path + password in env).
5. Outputs to /var/cridergpt/builds/<timestamp>/app-release.aab
6. Posts a row to build_logs in Supabase so the dashboard updates.

KEYSTORE STORAGE
- Keystore .jks file lives on the builder, mode 600, owned by the build user.
- Passwords in /etc/cridergpt/builder.env, also 600.
- NEVER commit the keystore. NEVER bake it into a Docker image you push.

REPRODUCIBLE BUILDS
- Pin Gradle version in gradle/wrapper/gradle-wrapper.properties.
- Pin AGP and Kotlin in libs.versions.toml or build.gradle.
- Pin compileSdk and minSdk explicitly.
- Without pinning, the build will succeed today and break in 3 months when
  Google rolls a new AGP.

WHAT THE WORKER LOGS
- exit code (0 = pass).
- duration.
- the last 200 lines of gradle output (truncated to fit a TEXT column).
- bundle size in MB.
Surface this in the Android Builder dashboard so failures are obvious.`,
  },
  {
    id: "devops-self-hosted-stack",
    track: "DevOps",
    title: "The four-container CriderGPT self-hosted stack and how it stays alive",
    oneLiner: "Docker compose layout, restart policies, volume mounts, and what to back up.",
    readMinutes: 8,
    body: `THE CONTAINERS
1. cridergpt-worker (Python Flask, exposes /command, /events).
   - Talks to Supabase, pulls jobs, writes to pc_events.
2. cridergpt-tts (XTTS-v2 voice engine on CPU).
3. cridergpt-music (MusicGen proxy).
4. cridergpt-builder (Android build daemon).

DOCKER-COMPOSE STAPLES
restart: unless-stopped     # come back on reboot, but not after manual stop
healthcheck:                # let docker know when the container is ready
  test: ["CMD","curl","-fs","http://localhost:8080/health"]
  interval: 30s
volumes:
  - ./data:/data            # persistent data outside the container
  - ./models:/models        # huge model files, never bake into image

WHAT TO BACK UP
- Supabase DB (already automated every 6h to /var/cridergpt/backups).
- /var/cridergpt/keystore/ (Android signing keys).
- /etc/cridergpt/*.env (secrets — encrypt before storing offsite).
- /var/cridergpt/builds/ (signed AABs, optional).

CLOUDFLARE TUNNEL
- The builder + worker are NOT exposed on a public port.
- cloudflared runs as a service and exposes specific hostnames
  (worker.cridergpt.com -> localhost:8080).
- Zero open inbound ports on your home router.

MONITORING
- A cron pings each container's /health every minute and writes to system_status.
- Server Health page reads system_status and shows red/green per container.
- An AI diagnoser reads the last 200 log lines on red and proposes a fix.`,
  },

  // ============== PAYMENTS TRACK ==============
  {
    id: "payments-stripe-vs-play",
    track: "Payments",
    title: "Stripe vs Play vs StoreKit — which one is allowed where, and what your DB has to track",
    oneLiner: "The rules that decide which checkout you can show, and the unified subscription table that handles all three.",
    readMinutes: 10,
    body: `THE PLATFORM RULES (2026)
- iOS app: digital goods/subscriptions MUST use StoreKit (App Store).
  Physical goods CAN use any payment. External link to web checkout is now
  allowed (per recent court rulings) but must follow Apple's link entitlement.
- Android app (Google Play distribution): digital goods MUST use Play Billing.
  Physical goods can use any payment. External offers allowed under the
  User Choice Billing program with revenue share.
- Web: anything you want. Stripe is the obvious choice.

YOUR THREE SKUS — SAME PRODUCT, THREE PRICE POINTS
Google adds a service fee. Apple too. Stripe is the cheapest. Common pattern:
  web:     $9.99 / mo (Stripe)
  Android: $9.99 / mo (Play takes 15-30%)
  iOS:     $9.99 / mo (Apple takes 15-30%)
Or charge slightly more on mobile to keep the same NET. Be transparent.

UNIFIED DB SHAPE
public.user_subscriptions
  user_id          uuid
  source           text   -- 'stripe' | 'play' | 'apple'
  external_id      text   -- stripe sub id, purchaseToken, originalTransactionId
  product_id       text   -- cridergpt_plus_monthly
  plan             text   -- plus | pro
  status           text   -- active | past_due | canceled | grace
  current_period_end timestamptz
  raw              jsonb  -- the last webhook payload for debugging

Then the app's "is this user Pro?" check is a single query that doesn't care
where the money came from.

WEBHOOK SOURCES
- Stripe: customer.subscription.created/updated/deleted, invoice.paid,
  invoice.payment_failed.
- Play: RTDN (subscription notifications via Pub/Sub).
- Apple: App Store Server Notifications V2.

ALL THREE WEBHOOKS SHOULD UPSERT INTO user_subscriptions WITH:
on conflict (source, external_id) do update set ... ;
That makes them naturally idempotent.`,
  },

  // ============== SECURITY TRACK ==============
  {
    id: "security-threat-model",
    track: "Security",
    title: "What a hostile user can actually do, and how RLS stops them",
    oneLiner: "Think like an attacker for 10 minutes and your policies will write themselves.",
    readMinutes: 9,
    body: `THE ATTACKER'S TOOLS
- DevTools open. They can see every network request.
- They can copy your anon key and JWT and replay any request with curl.
- They can change request bodies (insert user_id = '<someone else>').
- They can subscribe to Realtime channels they shouldn't.
- They can spam edge functions.

WHAT STOPS THEM
- RLS on every table.
- Policies that use auth.uid() and NEVER trust user_id from the request.
- has_role() for admin actions.
- Edge functions that re-derive user_id from the JWT, not the body.
- Rate limiting on expensive endpoints (a feature_throttles table or Upstash).

POLICY PATTERNS
SELECT  -- "you can read your own rows"
  using ( user_id = auth.uid() )

INSERT  -- "you can only insert rows owned by you"
  with check ( user_id = auth.uid() )

UPDATE  -- "you can update your own rows, and you can't change ownership"
  using       ( user_id = auth.uid() )
  with check  ( user_id = auth.uid() )

DELETE  -- "you can delete your own rows"
  using ( user_id = auth.uid() )

PUBLIC READ + PRIVATE WRITE
For e.g. seo_guides:
  policy "anyone can read"
    for select to anon, authenticated
    using ( true );
  policy "only admins can write"
    for all to authenticated
    using ( public.has_role(auth.uid(), 'admin') )
    with check ( public.has_role(auth.uid(), 'admin') );

SECRETS YOU MUST NEVER LEAK
- service_role key (frontend would bypass all RLS).
- third-party API keys (OpenAI, Stripe secret).
- Android upload keystore and password.
- Apple sign-in key file (.p8).

PII MINIMIZATION
- Don't store full credit cards (Stripe holds them).
- Hash IPs before logging.
- Strip EXIF/XMP from uploaded images (already a CriderGPT rule).
- For Guardian / minor data, encrypt at the row level with pgsodium.`,
  },

  // ============== FRONTEND TRACK ==============
  {
    id: "frontend-data-flow",
    track: "Frontend",
    title: "How data stays in sync between Supabase and your React UI",
    oneLiner: "React Query + Realtime + optimistic updates without the chaos.",
    readMinutes: 10,
    body: `THE THREE LAYERS
1. Server state: rows in Postgres.
2. Cache: React Query keeps the last fetched copy + freshness rules.
3. UI state: useState for what the user is typing right now.

DON'T put server data in useState. You'll fight cache invalidation forever.

PATTERN: LOAD A LIST
const { data, isLoading } = useQuery({
  queryKey: ['livestock', user.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('livestock_animals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
});

PATTERN: MUTATE + INVALIDATE
const qc = useQueryClient();
const addAnimal = useMutation({
  mutationFn: async (input) => {
    const { error } = await supabase.from('livestock_animals').insert(input);
    if (error) throw error;
  },
  onSuccess: () => qc.invalidateQueries({ queryKey: ['livestock', user.id] }),
});

PATTERN: REALTIME -> CACHE
useEffect(() => {
  const ch = supabase.channel('animals:'+user.id)
    .on('postgres_changes',
        { event:'*', schema:'public', table:'livestock_animals',
          filter:'user_id=eq.'+user.id },
        () => qc.invalidateQueries({ queryKey: ['livestock', user.id] }))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [user.id]);

That's it. The list re-fetches the moment any of the user's animals change,
from this device or any other.

OPTIMISTIC UPDATES (when latency matters)
useMutation has onMutate that lets you write to the cache BEFORE the request
returns, and onError that rolls back. Use for thumbs-up / favorites / "mark
read" actions where the user shouldn't wait.`,
  },

  // ============== AI TRACK ==============
  {
    id: "ai-rag-vs-finetune",
    track: "AI",
    title: "RAG vs fine-tuning vs system prompts — when to use which for CriderGPT's persona",
    oneLiner: "Your FFA voice doesn't need a fine-tune. It needs a tight system prompt and good memory retrieval.",
    readMinutes: 9,
    body: `THE THREE LEVERS
1. System prompt (cheapest, fastest, always tweakable).
   - Persona, tone, hard rules, output format.
   - 2-5KB is plenty. More than that and the model starts ignoring parts.

2. Retrieval-augmented generation (RAG).
   - You store knowledge as embeddings in a vector column (pgvector in Supabase).
   - At chat time you embed the user's question, find the top-k most similar
     chunks, paste them into the prompt as context.
   - Use this for: family history, livestock records, past conversations,
     uploaded docs. Anything that changes.

3. Fine-tuning.
   - Train a smaller model on Q/A pairs to bake in style or domain.
   - Expensive, slow to iterate, you have to re-do it when the base model
     ships a new version.
   - Almost never the right answer for a solo project. Skip it.

THE CRIDERGPT STACK TODAY
- System prompt assembles 7 components per request (persona, FFA rules,
  current sensor context, AI memory hits, etc.).
- ai_memory table acts as the long-term store. Patterns get summarized and
  stored, then retrieved by keyword + recency.
- For chat continuity, the last N messages of the current conversation are
  always included raw.

WHEN TO ADD pgvector
The day your "exact keyword" memory search starts missing obvious matches.
Until then, ILIKE + GIN trigram index is faster and simpler.`,
  },
  {
    id: "ai-token-budget",
    track: "AI",
    title: "Token budgets, streaming, and why your chat function sometimes truncates",
    oneLiner: "Every model has an input ceiling and an output ceiling. You usually hit the output one first.",
    readMinutes: 7,
    body: `KEY NUMBERS (2026)
- Gemini 2.5 Flash: ~1M input, ~8K output by default (configurable).
- Gemini 2.5 Pro: ~2M input, ~8K output.
- GPT-4.1: 128K input, 16K output.
- Claude Sonnet 4: 200K input, 64K output.

YOUR REAL CONSTRAINTS
- System prompt + memory + history = input tokens.
- Model's reply = output tokens.
- Edge function timeout (default 60s) — long replies time out.

STREAMING
- Use server-sent events. The client renders tokens as they arrive.
- UX feels 5x faster even though total latency is the same.
- Edge function sets headers:
    Content-Type: text/event-stream
    Cache-Control: no-cache
    Connection: keep-alive
- Client uses ReadableStream + TextDecoder, NOT fetch().json().

TRUNCATION CAUSES
- max_output_tokens too low.
- Model hit a stop sequence early.
- Edge function timed out before completion.
- Network dropped midway (mobile). Add a "continue" button that resends with
  the last partial reply as prefix.

COST CONTROL
- Cache common prompts (system prompts) via prompt caching where the provider
  supports it. Cuts cost by ~75% on repeated requests.
- For free-tier users, route to a smaller model (Flash) and cap output at
  1024 tokens.
- Track every request in ai_usage so you can see who's burning tokens.`,
  },

  // ============== HARDWARE TRACK ==============
  {
    id: "hardware-nfc-deep",
    track: "Hardware",
    title: "NFC on Android: NDEF, plain-text tags, why the iOS fallback is what it is",
    oneLiner: "How CriderGPT-XXXXXX tags work under the hood and what locking actually does.",
    readMinutes: 9,
    body: `THE NFC STACK
- Android exposes NFC via NfcAdapter + intent-filter (NDEF_DISCOVERED).
- Tags speak NDEF (NFC Data Exchange Format): records of (type, payload).
- CriderGPT uses TEXT records: payload is the literal string "CriderGPT-AB12CD".

WHY PLAIN TEXT (NOT URI)
- A URI record opens a browser tab. Distracting.
- A text record means our app captures it, looks it up in livestock_tag_pool,
  and routes to the right screen.
- Other apps that read the tag just see harmless text.

LOCKING
- NFC tags have a one-way "lock" bit. Once set, the tag is read-only forever.
- CriderGPT does NOT lock by default. Locking is irreversible and the user
  rarely wants it. Offered only behind an explicit confirmation.

iOS REALITY
- iOS supports NFC read in most apps, but NFC WRITE is restricted and reading
  background-launched intents like Android does is not allowed.
- Our iOS fallback: the user taps a button to start an NFC session, scans the
  tag, the app reads the text payload, and routes accordingly. For write,
  iOS users get a manual entry screen as a fallback (already a CriderGPT rule).

RASPBERRY PI SCANNER
- Edge device running scanner.py. Uses an ACR122U or PN532 over USB.
- Reads tag, posts {tag_id, scanner_id} to a Supabase edge function.
- Useful for chute-side scanning where the phone is impractical.

USB OTG ON ANDROID
- USB host mode lets the phone act as a host to a serial scanner / Pi shield.
- Permission is per-device, granted via intent-filter for USB_DEVICE_ATTACHED.
- We use this in the USB Data Hub for hardware that doesn't speak NFC.`,
  },
];

const TRACKS: { name: Chapter["track"]; color: string }[] = [
  { name: "Auth", color: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  { name: "Backend", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  { name: "Mobile", color: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
  { name: "DevOps", color: "bg-orange-500/10 text-orange-300 border-orange-500/30" },
  { name: "Payments", color: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" },
  { name: "Security", color: "bg-red-500/10 text-red-300 border-red-500/30" },
  { name: "Frontend", color: "bg-pink-500/10 text-pink-300 border-pink-500/30" },
  { name: "AI", color: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
  { name: "Hardware", color: "bg-lime-500/10 text-lime-300 border-lime-500/30" },
];

function trackColor(t: Chapter["track"]) {
  return TRACKS.find((x) => x.name === t)?.color ?? "";
}

export default function TechKnowledgeLibrary() {
  const [query, setQuery] = useState("");
  const [activeTrack, setActiveTrack] = useState<Chapter["track"] | "All">("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHAPTERS.filter((c) => {
      if (activeTrack !== "All" && c.track !== activeTrack) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.oneLiner.toLowerCase().includes(q) ||
        c.body.toLowerCase().includes(q)
      );
    });
  }, [query, activeTrack]);

  const totalMinutes = CHAPTERS.reduce((a, c) => a + c.readMinutes, 0);

  return (
    <DevHubGuard>
      <Helmet>
        <title>Tech Knowledge Library — CriderGPT Dev Hub</title>
        <meta
          name="description"
          content="Long-form, plain-English deep dives on auth, backend, mobile, payments, security, and AI for the CriderGPT stack."
        />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <Link to="/devhub">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dev Hub
              </Button>
            </Link>
            <Badge variant="secondary">{CHAPTERS.length} chapters · ~{totalMinutes} min read</Badge>
          </div>

          <header className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Tech Knowledge Library</h1>
            </div>
            <p className="text-muted-foreground">
              Long-form, plain-English deep dives on the parts of the stack that bite people most
              often — Google Sign-In on Android vs Web, how a button click reaches the database,
              edge functions, Play Billing, keystores, Realtime, RAG, and more. Written for you,
              not for a textbook.
            </p>
          </header>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chapters (e.g., SHA-1, RLS, Play Billing, deep link)..."
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTrack("All")}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    activeTrack === "All" ? "bg-primary/20 border-primary/40" : "border-border"
                  }`}
                >
                  All
                </button>
                {TRACKS.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setActiveTrack(t.name)}
                    className={`text-xs px-3 py-1 rounded-full border ${
                      activeTrack === t.name ? t.color : "border-border text-muted-foreground"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {filtered.map((c) => {
              const open = openId === c.id;
              return (
                <Card key={c.id} className="overflow-hidden">
                  <button
                    onClick={() => setOpenId(open ? null : c.id)}
                    className="w-full text-left"
                  >
                    <CardHeader className="pb-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-[10px] ${trackColor(c.track)}`}>
                              {c.track}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {c.readMinutes} min
                            </span>
                          </div>
                          <CardTitle className="text-base">{c.title}</CardTitle>
                          <CardDescription className="text-xs mt-1">{c.oneLiner}</CardDescription>
                        </div>
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                        )}
                      </div>
                    </CardHeader>
                  </button>
                  {open && (
                    <CardContent className="pt-0">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 border-t border-border pt-4">
                        {c.body}
                      </pre>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No chapters match that search.
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">More chapters I can add — say the word</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>· Apple Sign In on iOS (Service ID, return URLs, nonce, name-on-first-login bug)</p>
              <p>· Push notifications: FCM on Android, APNs on iOS, Supabase relay edge function</p>
              <p>· Background work: WorkManager, foreground services, doze mode, iOS BGTaskScheduler</p>
              <p>· Image pipeline: signed URLs, transform CDN, EXIF stripping, WebP/AVIF</p>
              <p>· Search: pg_trgm vs tsvector vs pgvector vs Meilisearch</p>
              <p>· Observability: Sentry, Posthog, Supabase logs, what to alert on</p>
              <p>· Play Store policy minefield (data safety, declared permissions, target SDK deadlines)</p>
              <p>· App Store review traps (account deletion, restore purchases, kids category)</p>
              <p>· Networking on mobile: timeouts, retries, offline queueing, connectivity callbacks</p>
              <p>· Performance: Compose recomposition, React render profiling, list virtualization</p>
              <p>· i18n: gettext vs ICU, RTL, plurals, what breaks with German</p>
              <p>· Accessibility: TalkBack, VoiceOver, dynamic type, color contrast</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DevHubGuard>
  );
}
