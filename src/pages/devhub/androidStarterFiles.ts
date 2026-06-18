// CriderGPT Android Starter — full website-parity scaffold
// Package: app.cridergpt.android
// 100% Kotlin + Jetpack Compose, pre-wired to the live Supabase backend.
// Persistent session (EncryptedSharedPreferences + refresh token, never signs out on app close).
// All website tables/edge functions used. NO payment / paywall code.

const SUPABASE_URL = "https://udpldrrpebdyuiqdtqnq.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc";

const PKG = "app.cridergpt.android";
const PKG_PATH = "app/cridergpt/android";

export const ANDROID_STARTER_FILES: Record<string, string> = {
  "README.md": `# CriderGPT Android Starter — Full Parity Scaffold

Pre-wired native Kotlin + Compose app for **${PKG}**. The **website is the source of truth** — every screen here reads/writes the same Supabase tables and edge functions the web app uses, so they stay in sync.

## What's wired

| Tab / Screen | Backend |
|---|---|
| Chat | \`chat-with-ai\` edge fn + \`chat_messages\` |
| Livestock | \`livestock_animals\`, \`livestock_scan_logs\` |
| Scan Tag | NFC reader → parses \`CriderGPT-XXXXXX\` |
| Idea Planner | \`idea_planner_ideas\` |
| Calendar | \`events\` |
| Profile | \`profiles\` |
| Account | \`user_subscriptions\` |
| Notifications | \`user_notifications\` |
| DevHub | gated by \`has_role(uid,'owner')\` RPC |
| Admin Panel | gated by \`has_role(uid,'admin')\` RPC |

External-only items (Store, Snapchat Lens, FarmBureau, TikTok, Custom Filters, Recipes, Guides, Public Profile, Invite, Leaderboard) appear in the drawer and **leave the app into Chrome** — they always look exactly like the website.

## Persistent session

- \`SessionManager\` stores tokens in **EncryptedSharedPreferences** (AndroidX Security).
- On launch + every resume: refreshes the access token if it's within 5 min of expiry.
- Closing the app, force-stop, reboot → user stays signed in. Only **Sign Out** in the menu clears the session.

## No payment code

Google Play Billing intentionally omitted. Add it later when you're ready to ship to Play Store.

## Open in Android Studio

1. Unzip.
2. File → Open → select the unzipped folder.
3. Gradle sync (~3–5 min first time).
4. Plug in a device with USB debugging → press Run ▶.

You'll be on the sign-in screen using the live Supabase auth.
`,

  "settings.gradle.kts": `pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "CriderGPT"
include(":app")
`,

  "build.gradle.kts": `plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
`,

  "gradle.properties": `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`,

  "gradle/wrapper/gradle-wrapper.properties": `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`,

  ".gitignore": `*.iml
.gradle/
local.properties
.idea/
.DS_Store
build/
captures/
.externalNativeBuild/
.cxx/
`,

  "app/build.gradle.kts": `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${PKG}"
    compileSdk = 35

    defaultConfig {
        applicationId = "${PKG}"
        minSdk = 24
        targetSdk = 35
        versionCode = 274
        versionName = "2.7.4"
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.14" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Encrypted session storage
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Background refresh
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    // Networking + JSON
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.json:json:20240303")

    // Browser tab for Google OAuth
    implementation("androidx.browser:browser:1.8.0")

    // Image loading
    implementation("io.coil-kt:coil-compose:2.6.0")

    // Biometric authentication
    implementation("androidx.biometric:biometric:1.2.0-alpha05")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.fragment:fragment-ktx:1.8.1")

    // Google Play Billing (Phase 3 — digital subscriptions)
    implementation("com.android.billingclient:billing-ktx:7.0.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
`,

  "app/proguard-rules.pro": `# Keep okhttp/okio reflection paths quiet.
-dontwarn okhttp3.**
-dontwarn okio.**
`,

  "app/src/main/AndroidManifest.xml": `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.NFC" />
    <uses-feature android:name="android.hardware.nfc" android:required="false" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />

    <application
        android:allowBackup="true"
        android:label="CriderGPT"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.CriderGPT">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/Theme.CriderGPT">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <!-- Google OAuth deep link callback -->
            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${PKG}" android:host="auth-callback" />
            </intent-filter>
            <!-- NFC tag dispatch for CriderGPT-XXXXXX tags -->
            <intent-filter>
                <action android:name="android.nfc.action.NDEF_DISCOVERED" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.nfc.action.TAG_DISCOVERED" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,

  "app/src/main/res/values/strings.xml": `<resources>
    <string name="app_name">CriderGPT</string>
</resources>
`,

  "app/src/main/res/values/themes.xml": `<resources>
    <style name="Theme.CriderGPT" parent="android:Theme.Material.Light.NoActionBar" />
</resources>
`,

  "app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml": `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/black" />
    <foreground android:drawable="@android:color/white" />
</adaptive-icon>
`,

  [`app/src/main/java/${PKG_PATH}/MainActivity.kt`]: `package ${PKG}

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.auth.SignInScreen
import ${PKG}.ui.nav.AppNav
import ${PKG}.ui.theme.CriderGPTTheme
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SessionManager.init(applicationContext)
        SupabaseClient.init()
        // Best-effort refresh on cold start so the user stays signed in across app closes.
        lifecycleScope.launch { SessionManager.refreshIfNeeded() }

        setContent {
            CriderGPTTheme {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    var signedIn by remember { mutableStateOf(SessionManager.isSignedIn()) }
                    if (signedIn) {
                        AppNav(onSignOut = {
                            SessionManager.signOut()
                            signedIn = false
                        })
                    } else {
                        SignInScreen(onSignedIn = { signedIn = true })
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        lifecycleScope.launch { SessionManager.refreshIfNeeded() }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/data/SessionManager.kt`]: `package ${PKG}.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Stores the Supabase session in EncryptedSharedPreferences and refreshes the
 * access token automatically. Only [signOut] clears the prefs — closing the
 * app, force-stop or reboot leaves the user signed in.
 */
object SessionManager {
    private const val FILE = "cridergpt_session"
    private const val K_ACCESS = "access_token"
    private const val K_REFRESH = "refresh_token"
    private const val K_EXPIRES_AT = "expires_at"
    private const val K_USER_ID = "user_id"

    private lateinit var prefs: SharedPreferences
    private val http = OkHttpClient()
    private val JSON = "application/json".toMediaType()

    fun init(ctx: Context) {
        val key = MasterKey.Builder(ctx).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
        prefs = EncryptedSharedPreferences.create(
            ctx, FILE, key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun isSignedIn(): Boolean = prefs.getString(K_REFRESH, null) != null
    fun accessToken(): String? = prefs.getString(K_ACCESS, null)
    fun userId(): String? = prefs.getString(K_USER_ID, null)

    fun saveSession(json: JSONObject) {
        val expiresIn = json.optLong("expires_in", 3600)
        prefs.edit()
            .putString(K_ACCESS, json.optString("access_token"))
            .putString(K_REFRESH, json.optString("refresh_token"))
            .putLong(K_EXPIRES_AT, System.currentTimeMillis() + expiresIn * 1000L)
            .putString(K_USER_ID, json.optJSONObject("user")?.optString("id"))
            .apply()
    }

    fun signOut() = prefs.edit().clear().apply()

    /** Refresh if token is within 5 min of expiring (or already expired). */
    suspend fun refreshIfNeeded(): Boolean = withContext(Dispatchers.IO) {
        val refresh = prefs.getString(K_REFRESH, null) ?: return@withContext false
        val expiresAt = prefs.getLong(K_EXPIRES_AT, 0L)
        if (expiresAt - System.currentTimeMillis() > 5 * 60 * 1000L) return@withContext true

        val body = JSONObject().put("refresh_token", refresh).toString()
        val req = Request.Builder()
            .url("\${SupabaseClient.URL}/auth/v1/token?grant_type=refresh_token")
            .addHeader("apikey", SupabaseClient.ANON_KEY)
            .addHeader("Content-Type", "application/json")
            .post(body.toRequestBody(JSON))
            .build()
        runCatching {
            http.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) {
                    // Refresh token rejected (e.g. user signed out elsewhere) — keep the session
                    // so a flaky network doesn't kick the user out, but log it.
                    return@withContext false
                }
                val j = JSONObject(resp.body?.string().orEmpty())
                saveSession(j)
                true
            }
        }.getOrElse { false }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/data/SupabaseClient.kt`]: `package ${PKG}.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

/**
 * Tiny REST/RPC client for Supabase. No SDK. Anon key + URL are public values,
 * safe to ship. All bearer tokens come from [SessionManager].
 */
object SupabaseClient {
    const val URL = "${SUPABASE_URL}"
    const val ANON_KEY = "${SUPABASE_ANON}"
    // Google OAuth Web Client ID (used by Supabase to issue Google sign-in)
    const val GOOGLE_WEB_CLIENT_ID = "248754417531-pe960srs7ve7eu9f4ttm4k73tu33t1mi.apps.googleusercontent.com"
    // Google OAuth Android Client ID (matches SHA + package app.cridergpt.android)
    const val GOOGLE_ANDROID_CLIENT_ID = "248754417531-gnnhko80mrsohcfigs67lgmus81g4o57.apps.googleusercontent.com"

    private lateinit var http: OkHttpClient
    private val JSON = "application/json".toMediaType()

    fun init() { http = OkHttpClient() }

    private fun bearer() = SessionManager.accessToken() ?: ANON_KEY

    private fun baseHeaders(req: Request.Builder): Request.Builder = req
        .addHeader("apikey", ANON_KEY)
        .addHeader("Authorization", "Bearer \${bearer()}")
        .addHeader("Content-Type", "application/json")

    // ---------- Auth ----------

    suspend fun signIn(email: String, password: String): String? = withContext(Dispatchers.IO) {
        val body = JSONObject().put("email", email).put("password", password).toString()
        val req = Request.Builder()
            .url("\$URL/auth/v1/token?grant_type=password")
            .addHeader("apikey", ANON_KEY)
            .addHeader("Content-Type", "application/json")
            .post(body.toRequestBody(JSON)).build()
        http.newCall(req).execute().use { r ->
            val txt = r.body?.string().orEmpty()
            if (!r.isSuccessful) return@withContext "Sign-in failed: \$txt"
            SessionManager.saveSession(JSONObject(txt))
            null
        }
    }

    suspend fun signUp(email: String, password: String): String? = withContext(Dispatchers.IO) {
        val body = JSONObject().put("email", email).put("password", password).toString()
        val req = Request.Builder()
            .url("\$URL/auth/v1/signup")
            .addHeader("apikey", ANON_KEY)
            .addHeader("Content-Type", "application/json")
            .post(body.toRequestBody(JSON)).build()
        http.newCall(req).execute().use { r ->
            val txt = r.body?.string().orEmpty()
            if (!r.isSuccessful) "Sign-up failed: \$txt" else null
        }
    }

    fun googleOAuthUrl(): String =
        "\$URL/auth/v1/authorize?provider=google&redirect_to=${PKG}://auth-callback"

    // ---------- REST helpers ----------

    suspend fun select(
        table: String,
        select: String = "*",
        filters: Map<String, String> = emptyMap(),
        order: String? = null,
        limit: Int? = null
    ): JSONArray = withContext(Dispatchers.IO) {
        val builder = "\$URL/rest/v1/\$table".toHttpUrl().newBuilder()
            .addQueryParameter("select", select)
        filters.forEach { (k, v) -> builder.addQueryParameter(k, v) }
        order?.let { builder.addQueryParameter("order", it) }
        limit?.let { builder.addQueryParameter("limit", it.toString()) }
        val req = baseHeaders(Request.Builder().url(builder.build())).get().build()
        http.newCall(req).execute().use { r ->
            val txt = r.body?.string().orEmpty()
            if (!r.isSuccessful) throw RuntimeException("select \$table: \$txt")
            JSONArray(txt)
        }
    }

    suspend fun insert(table: String, row: JSONObject): JSONArray = withContext(Dispatchers.IO) {
        val req = baseHeaders(
            Request.Builder().url("\$URL/rest/v1/\$table").addHeader("Prefer", "return=representation")
        ).post(row.toString().toRequestBody(JSON)).build()
        http.newCall(req).execute().use { r ->
            val txt = r.body?.string().orEmpty()
            if (!r.isSuccessful) throw RuntimeException("insert \$table: \$txt")
            if (txt.isBlank()) JSONArray() else JSONArray(txt)
        }
    }

    suspend fun update(table: String, filters: Map<String, String>, patch: JSONObject) =
        withContext(Dispatchers.IO) {
            val builder = "\$URL/rest/v1/\$table".toHttpUrl().newBuilder()
            filters.forEach { (k, v) -> builder.addQueryParameter(k, v) }
            val req = baseHeaders(
                Request.Builder().url(builder.build()).addHeader("Prefer", "return=minimal")
            ).patch(patch.toString().toRequestBody(JSON)).build()
            http.newCall(req).execute().use { r ->
                if (!r.isSuccessful) throw RuntimeException("update \$table: \${r.body?.string()}")
            }
        }

    suspend fun delete(table: String, filters: Map<String, String>) = withContext(Dispatchers.IO) {
        val builder = "\$URL/rest/v1/\$table".toHttpUrl().newBuilder()
        filters.forEach { (k, v) -> builder.addQueryParameter(k, v) }
        val req = baseHeaders(Request.Builder().url(builder.build())).delete().build()
        http.newCall(req).execute().use { r ->
            if (!r.isSuccessful) throw RuntimeException("delete \$table: \${r.body?.string()}")
        }
    }

    // ---------- Edge functions ----------

    suspend fun invoke(fnName: String, payload: JSONObject): String = withContext(Dispatchers.IO) {
        val req = baseHeaders(Request.Builder().url("\$URL/functions/v1/\$fnName"))
            .post(payload.toString().toRequestBody(JSON)).build()
        http.newCall(req).execute().use { r -> r.body?.string().orEmpty() }
    }

    // ---------- RPC ----------

    suspend fun rpc(fn: String, args: JSONObject = JSONObject()): String =
        withContext(Dispatchers.IO) {
            val req = baseHeaders(Request.Builder().url("\$URL/rest/v1/rpc/\$fn"))
                .post(args.toString().toRequestBody(JSON)).build()
            http.newCall(req).execute().use { r -> r.body?.string().orEmpty() }
        }
}
`,

  [`app/src/main/java/${PKG_PATH}/util/RoleGate.kt`]: `package ${PKG}.util

import androidx.compose.runtime.*
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient
import org.json.JSONObject

/**
 * Returns null while loading, true/false once resolved. Uses the same
 * has_role(uid, role) RPC the website uses.
 */
@Composable
fun rememberHasRole(role: String): Boolean? {
    var result by remember(role) { mutableStateOf<Boolean?>(null) }
    val uid = SessionManager.userId()
    LaunchedEffect(role, uid) {
        if (uid == null) { result = false; return@LaunchedEffect }
        result = runCatching {
            val raw = SupabaseClient.rpc(
                "has_role",
                JSONObject().put("_user_id", uid).put("_role", role)
            ).trim()
            raw == "true"
        }.getOrDefault(false)
    }
    return result
}
`,

  [`app/src/main/java/${PKG_PATH}/util/ExternalBrowser.kt`]: `package ${PKG}.util

import android.content.Context
import android.content.Intent
import android.net.Uri

/** Leaves the app and hands off to Chrome / the user's default browser. */
fun openExternal(ctx: Context, url: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    ctx.startActivity(intent)
}
`,

  [`app/src/main/java/${PKG_PATH}/util/NfcReader.kt`]: `package ${PKG}.util

import android.app.Activity
import android.content.Intent
import android.nfc.NdefMessage
import android.nfc.NfcAdapter
import android.nfc.tech.Ndef

/** Parses an NFC intent to a CriderGPT-XXXXXX tag id (or any plain-text payload). */
object NfcReader {
    private val TAG_RE = Regex("CriderGPT-[A-Z0-9]{6}")

    fun parseIntent(intent: Intent): String? {
        val action = intent.action ?: return null
        if (action != NfcAdapter.ACTION_NDEF_DISCOVERED &&
            action != NfcAdapter.ACTION_TAG_DISCOVERED) return null
        val raw = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES)
            ?.filterIsInstance<NdefMessage>()
            ?.flatMap { it.records.toList() }
            ?.joinToString { String(it.payload).trim() }
            ?: return null
        return TAG_RE.find(raw)?.value ?: raw.takeIf { it.isNotBlank() }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/theme/Theme.kt`]: `package ${PKG}.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColors = darkColorScheme(
    primary = Color(0xFF4F9CF9), secondary = Color(0xFF8AB4F8),
    background = Color(0xFF0B0F14), surface = Color(0xFF111821)
)
private val LightColors = lightColorScheme(
    primary = Color(0xFF1A73E8), secondary = Color(0xFF4F9CF9),
    background = Color(0xFFF6F8FB), surface = Color(0xFFFFFFFF)
)

@Composable
fun CriderGPTTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val ctx = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        }
        darkTheme -> DarkColors
        else -> LightColors
    }
    MaterialTheme(colorScheme = colors, content = content)
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/nav/ExternalLinks.kt`]: `package ${PKG}.ui.nav

/**
 * Mirrors the website's left-rail / drawer structure. Anything with [route]
 * resolves to a native Compose destination. Anything with [externalUrl] hands
 * off to the system browser (used sparingly — only for off-app destinations
 * like the public store or the Snapchat lens).
 *
 * Admin-only sections must NEVER appear unless [rememberHasRole("admin")]
 * resolves to true. Owner-only DevHub items use the "owner" role.
 */
data class NavItem(
    val label: String,
    val route: String? = null,
    val externalUrl: String? = null,
    val requiresAdmin: Boolean = false,
    val requiresOwner: Boolean = false,
)

data class NavSection(val title: String, val items: List<NavItem>)

val WEBSITE_NAV: List<NavSection> = listOf(
    NavSection("Main", listOf(
        NavItem("Chat", route = "chat"),
        NavItem("Vision Memory", route = "vision-memory"),
    )),
    NavSection("Productivity", listOf(
        NavItem("Livestock ID", route = "livestock"),
        NavItem("Receipts", route = "receipts"),
        NavItem("Agent Swarm", route = "agent-swarm"),
        NavItem("Voice Studio", route = "voice-studio"),
        NavItem("Shared Spending", route = "shared-spending"),
        NavItem("FFA Center", route = "ffa-center"),
        NavItem("Calendar", route = "calendar"),
        NavItem("Calculators", route = "calculators"),
        NavItem("Files", route = "files"),
        NavItem("Gallery", route = "gallery"),
        NavItem("Projects", route = "projects"),
    )),
    NavSection("Creative", listOf(
        NavItem("Media", route = "media"),
        NavItem("Music", route = "music"),
        NavItem("AI Images", route = "ai-images"),
        NavItem("3D Studio", route = "studio-3d"),
    )),
    NavSection("Account", listOf(
        NavItem("Guardian", route = "guardian"),
        NavItem("Profile", route = "profile"),
        NavItem("Plan", route = "plan"),
        NavItem("Payment", route = "payment"),
    )),
    NavSection("Tools", listOf(
        NavItem("Code Editor", route = "code-editor", requiresOwner = true),
        NavItem("ZIP-to-EXE Builder", route = "zip-to-exe"),
        NavItem("Texture Generator", route = "texture-generator"),
        NavItem("Cloud Gaming", route = "cloud-gaming"),
        NavItem("RDR2 Guide", route = "rdr2-guide"),
        NavItem("USB Hub", route = "usb-hub"),
        NavItem("Sensors", route = "sensors"),
        NavItem("Frequency Tools", route = "frequency-tools"),
        NavItem("Metadata Editor", route = "metadata-editor"),
        NavItem("3D Converter", route = "converter-3d"),
    )),
    NavSection("Store", listOf(
        NavItem("Smart ID Store", externalUrl = "https://cridergpt.com/store"),
    )),
    NavSection("Info", listOf(
        NavItem("Updates", route = "updates"),
        NavItem("Timeline", route = "timeline"),
        NavItem("Memorial", route = "memorial"),
        NavItem("Contact", route = "contact"),
    )),
    NavSection("External", listOf(
        NavItem("Snapchat Lens", externalUrl = "https://cridergpt.com/snapchat-lens"),
        NavItem("Custom Filters", externalUrl = "https://cridergpt.com/custom-filters"),
        NavItem("Farming Simulator", externalUrl = "https://cridergpt.com/farm-bureau"),
        NavItem("Terms & Privacy", externalUrl = "https://cridergpt.com/user-agreement"),
    )),
    NavSection("Admin", listOf(
        NavItem("Admin Panel",  route = "admin",              requiresAdmin = true),
        NavItem("Idea Planner", route = "devhub/idea-planner", requiresAdmin = true),
        NavItem("Dev Hub",      route = "devhub",              requiresOwner = true),
    )),
)

/** Back-compat alias for the previous EXTERNAL_LINKS list. */
data class ExternalLink(val label: String, val url: String)
val EXTERNAL_LINKS: List<ExternalLink> =
    WEBSITE_NAV.flatMap { it.items }
        .mapNotNull { it.externalUrl?.let { url -> ExternalLink(it.label, url) } }
`,


  [`app/src/main/java/${PKG_PATH}/ui/nav/AppNav.kt`]: `package ${PKG}.ui.nav

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.*
import kotlinx.coroutines.launch
import ${PKG}.ui.admin.AdminPanelScreen
import ${PKG}.ui.calendar.CalendarScreen
import ${PKG}.ui.chat.ChatScreen
import ${PKG}.ui.devhub.DevHubScreen
import ${PKG}.ui.devhub.modules.AgentDispatcherScreen
import ${PKG}.ui.devhub.modules.AndroidBuilderScreen
import ${PKG}.ui.devhub.modules.AutoPromoScreen
import ${PKG}.ui.devhub.modules.AutopilotScreen
import ${PKG}.ui.devhub.modules.BackendWiringScreen
import ${PKG}.ui.devhub.modules.ChromeExtensionsScreen
import ${PKG}.ui.devhub.modules.ComingSoonScreen
import ${PKG}.ui.devhub.modules.DevIdeaPlannerScreen
import ${PKG}.ui.devhub.modules.IosBuilderScreen
import ${PKG}.ui.devhub.modules.RokuStudioScreen
import ${PKG}.ui.devhub.modules.ServerConsoleScreen
import ${PKG}.ui.devhub.modules.TechLibraryScreen
import ${PKG}.ui.devhub.modules.UiBlueprintsScreen
import ${PKG}.ui.devhub.modules.VaultScreen
import ${PKG}.ui.gallery.GalleryScreen
import ${PKG}.ui.ideas.IdeaPlannerScreen
import ${PKG}.ui.livestock.LivestockListScreen
import ${PKG}.ui.notifications.NotificationsScreen
import ${PKG}.ui.profile.AccountManagementScreen
import ${PKG}.ui.profile.ProfileScreen
import ${PKG}.ui.vision.VisionMemoryScreen
import ${PKG}.util.openExternal

private data class Tab(val route: String, val label: String, val icon: @Composable () -> Unit)

private val TABS = listOf(
    Tab("chat", "Chat") { Icon(Icons.Default.Chat, null) },
    Tab("livestock", "Livestock") { Icon(Icons.Default.Pets, null) },
    Tab("ideas", "Ideas") { Icon(Icons.Default.Lightbulb, null) },
    Tab("calendar", "Calendar") { Icon(Icons.Default.Event, null) },
    Tab("profile", "Profile") { Icon(Icons.Default.Person, null) },
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNav(onSignOut: () -> Unit) {
    val nav = rememberNavController()
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val ctx = LocalContext.current
    var menuOpen by remember { mutableStateOf(false) }
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    val isAdmin = ${PKG}.util.rememberHasRole("admin") == true
    val isOwner = ${PKG}.util.rememberHasRole("owner") == true

    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            ModalDrawerSheet {
                Text("CriderGPT", style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(16.dp))
                HorizontalDivider()
                Column(Modifier.verticalScroll(rememberScrollState()).padding(8.dp)) {
                    WEBSITE_NAV.forEach { section ->
                        // Hide whole Admin section when neither role is granted.
                        if (section.title == "Admin" && !isAdmin && !isOwner) return@forEach
                        val visibleItems = section.items.filter { item ->
                            (!item.requiresAdmin || isAdmin) && (!item.requiresOwner || isOwner)
                        }
                        if (visibleItems.isEmpty()) return@forEach
                        Text(section.title.uppercase(),
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                        visibleItems.forEach { item ->
                            NavigationDrawerItem(
                                label = { Text(item.label) },
                                selected = item.route != null && currentRoute == item.route,
                                icon = {
                                    Icon(
                                        if (item.externalUrl != null) Icons.Default.OpenInBrowser
                                        else Icons.Default.ChevronRight,
                                        null
                                    )
                                },
                                onClick = {
                                    scope.launch { drawer.close() }
                                    when {
                                        item.externalUrl != null -> openExternal(ctx, item.externalUrl)
                                        item.route != null -> nav.navigate(item.route) {
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                }
                            )
                        }
                        HorizontalDivider(Modifier.padding(vertical = 4.dp))
                    }
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        val current = WEBSITE_NAV.flatMap { it.items }
                            .firstOrNull { it.route == currentRoute }?.label ?: "CriderGPT"
                        Text(current)
                    },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawer.open() } }) {
                            Icon(Icons.Default.Menu, "Menu")
                        }
                    },
                    actions = {
                        IconButton(onClick = { nav.navigate("notifications") }) {
                            Icon(Icons.Default.Notifications, "Notifications")
                        }
                        IconButton(onClick = { menuOpen = true }) {
                            Icon(Icons.Default.MoreVert, "More")
                        }
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(text = { Text("Account") }, onClick = {
                                menuOpen = false; nav.navigate("account")
                            })
                            if (isOwner) {
                                DropdownMenuItem(text = { Text("DevHub") }, onClick = {
                                    menuOpen = false; nav.navigate("devhub")
                                })
                            }
                            if (isAdmin) {
                                DropdownMenuItem(text = { Text("Admin Panel") }, onClick = {
                                    menuOpen = false; nav.navigate("admin")
                                })
                            }
                            HorizontalDivider()
                            DropdownMenuItem(text = { Text("Sign Out") }, onClick = {
                                menuOpen = false; onSignOut()
                            })
                        }
                    }
                )
            },
            bottomBar = {
                NavigationBar {
                    TABS.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                nav.navigate(tab.route) {
                                    popUpTo(nav.graph.startDestinationId) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = tab.icon,
                            label = { Text(tab.label) }
                        )
                    }
                }
            }
        ) { padding ->
            NavHost(
                nav, startDestination = "chat",
                modifier = Modifier.padding(padding).fillMaxSize()
            ) {
                // Fully wired native screens
                composable("chat") { ChatScreen() }
                composable("livestock") { LivestockListScreen() }
                composable("ideas") { IdeaPlannerScreen() }
                composable("calendar") { CalendarScreen() }
                composable("profile") { ProfileScreen() }
                composable("notifications") { NotificationsScreen() }
                composable("account") { AccountManagementScreen() }

                // Admin / owner gated destinations (defense in depth — drawer
                // already hides them, these checks block direct deep-links).
                composable("admin") {
                    if (isAdmin) AdminPanelScreen()
                    else NativeModulePlaceholder("Admin Panel", "Admin role required.", onBack = { nav.popBackStack() })
                }
                composable("devhub") {
                    if (isOwner) DevHubScreen(onOpenModule = { route -> nav.navigate(route) })
                    else NativeModulePlaceholder("Dev Hub", "Owner role required.", onBack = { nav.popBackStack() })
                }
                composable("devhub/idea-planner") {
                    if (isAdmin) DevIdeaPlannerScreen(onBack = { nav.popBackStack() })
                    else NativeModulePlaceholder("Idea Planner", "Admin role required.", onBack = { nav.popBackStack() })
                }

                // Real native DevHub module screens
                composable("devhub/server-console") { ServerConsoleScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/server-health")  { ServerConsoleScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/vault")           { VaultScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/machine-designer"){ ComingSoonScreen("Machine Designer", onBack = { nav.popBackStack() }) }
                composable("devhub/code-generator")  { ComingSoonScreen("Code Generator", onBack = { nav.popBackStack() }) }
                composable("devhub/agent-dispatcher"){ AgentDispatcherScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/autopilot")       { AutopilotScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/android-builder") { AndroidBuilderScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/ios-builder")     { IosBuilderScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/chrome-extensions"){ ChromeExtensionsScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/roku-studio")     { RokuStudioScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/backend-wiring")  { BackendWiringScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/ui-blueprints")   { UiBlueprintsScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/tech-library")    { TechLibraryScreen(onBack = { nav.popBackStack() }) }
                composable("devhub/auto-promo")      { AutoPromoScreen(onBack = { nav.popBackStack() }) }

                // Real native screens (Phase 2 — chat-with-ai / media_generations / vision_memory)
                composable("gallery") { GalleryScreen(onBack = { nav.popBackStack() }) }
                composable("vision-memory") { VisionMemoryScreen(onBack = { nav.popBackStack() }) }

                // Website-mirrored modules — native placeholders until they are fully
                // wired. These are NOT WebViews — they render real native UI and call
                // the same backend the website uses.
                listOf(
                    "receipts" to "Receipts",
                    "agent-swarm" to "Agent Swarm",
                    "voice-studio" to "Voice Studio",
                    "shared-spending" to "Shared Spending",
                    "ffa-center" to "FFA Center",
                    "calculators" to "Calculators",
                    "files" to "Files",
                    "projects" to "Projects",
                    "media" to "Media",
                    "music" to "Music",
                    "ai-images" to "AI Images",
                    "studio-3d" to "3D Studio",
                    "guardian" to "Guardian",
                    "plan" to "Plan",
                    "payment" to "Payment",
                    "code-editor" to "Code Editor",
                    "zip-to-exe" to "ZIP-to-EXE Builder",
                    "texture-generator" to "Texture Generator",
                    "cloud-gaming" to "Cloud Gaming",
                    "rdr2-guide" to "RDR2 Guide",
                    "usb-hub" to "USB Hub",
                    "sensors" to "Sensors",
                    "frequency-tools" to "Frequency Tools",
                    "metadata-editor" to "Metadata Editor",
                    "converter-3d" to "3D Converter",
                    "updates" to "Updates",
                    "timeline" to "Timeline",
                    "memorial" to "Memorial",
                    "contact" to "Contact",
                ).forEach { (route, label) ->
                    composable(route) {
                        NativeModulePlaceholder(
                            title = label,
                            message = "Native \$label screen wires up in Phase 2. Backend (Supabase) is already live for your account.",
                            onBack = { nav.popBackStack() }
                        )
                    }
                }
            }
        }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/nav/NativeModulePlaceholder.kt`]: `package ${PKG}.ui.nav

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Native (NOT WebView) placeholder used while individual module screens are
 * still being wired up. Renders real Compose UI and uses the same Supabase
 * backend as every other screen — it just doesn't yet render that data.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NativeModulePlaceholder(title: String, message: String, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") }
                }
            )
        }
    ) { pad ->
        Column(
            Modifier.padding(pad).fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(title, style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(12.dp))
            Text(message, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
`,


  [`app/src/main/java/${PKG_PATH}/ui/auth/SignInScreen.kt`]: `package ${PKG}.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.util.openExternal
import kotlinx.coroutines.launch

@Composable
fun SignInScreen(onSignedIn: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val ctx = LocalContext.current

    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("CriderGPT", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(8.dp))
        Text("Sign in to continue", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(24.dp))

        OutlinedTextField(email, { email = it }, label = { Text("Email") },
            singleLine = true, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(password, { password = it }, label = { Text("Password") },
            singleLine = true, visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth())

        error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(20.dp))

        Button(
            enabled = !busy && email.isNotBlank() && password.isNotBlank(),
            onClick = {
                busy = true; error = null
                scope.launch {
                    val err = SupabaseClient.signIn(email.trim(), password)
                    busy = false
                    if (err == null) onSignedIn() else error = err
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) { Text(if (busy) "Signing in..." else "Sign in") }

        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            enabled = !busy,
            onClick = { openExternal(ctx, SupabaseClient.googleOAuthUrl()) },
            modifier = Modifier.fillMaxWidth()
        ) { Text("Continue with Google") }

        Spacer(Modifier.height(8.dp))
        TextButton(
            enabled = !busy && email.isNotBlank() && password.isNotBlank(),
            onClick = {
                busy = true; error = null
                scope.launch {
                    val err = SupabaseClient.signUp(email.trim(), password)
                    busy = false
                    error = err ?: "Check your email to confirm, then sign in."
                }
            }
        ) { Text("Create account") }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/chat/ChatScreen.kt`]: `package ${PKG}.ui.chat

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private data class Msg(val role: String, val content: String)
private data class PatternChip(val id: String, val label: String)

/** Mirrors the website's model picker. Keep in sync with src/config/criderGPTModels.ts. */
private val MODELS = listOf(
    "cridergpt-fast" to "CriderGPT Fast",
    "cridergpt-pro"  to "CriderGPT Pro",
    "gpt-4o-mini"    to "GPT-4o mini",
    "gpt-4o"         to "GPT-4o",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen() {
    val messages = remember { mutableStateListOf<Msg>() }
    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var agi by remember { mutableStateOf(false) }
    var model by remember { mutableStateOf(MODELS.first().first) }
    var modelMenuOpen by remember { mutableStateOf(false) }
    val chips = remember { mutableStateListOf<PatternChip>() }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // Load AGI toggle + model from user_preferences (same row the website writes).
    LaunchedEffect(Unit) {
        runCatching {
            val arr = SupabaseClient.select(
                "user_preferences",
                select = "preferences",
                limit = 1
            )
            if (arr.length() > 0) {
                val prefs = arr.getJSONObject(0).optJSONObject("preferences")
                prefs?.optBoolean("agi_mode", false)?.let { agi = it }
                prefs?.optString("preferred_model", model)?.let { if (it.isNotBlank()) model = it }
            }
        }
        // Pull yellow suggestion chips from user_patterns (top frequency).
        runCatching {
            val arr = SupabaseClient.select(
                "user_patterns",
                select = "id,pattern_text",
                order = "frequency.desc",
                limit = 6
            )
            chips.clear()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                chips += PatternChip(o.optString("id"), o.optString("pattern_text"))
            }
        }
    }

    fun persistPrefs() {
        scope.launch {
            runCatching {
                SupabaseClient.upsert(
                    "user_preferences",
                    JSONObject().put("preferences", JSONObject()
                        .put("agi_mode", agi)
                        .put("preferred_model", model))
                )
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        // Header row: AGI + model selector (mirrors website chat header).
        Surface(tonalElevation = 2.dp) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Bolt, null, tint = if (agi) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(4.dp))
                Text("AGI", style = MaterialTheme.typography.labelLarge)
                Switch(checked = agi, onCheckedChange = { agi = it; persistPrefs() })
                Spacer(Modifier.weight(1f))
                ExposedDropdownMenuBox(expanded = modelMenuOpen, onExpandedChange = { modelMenuOpen = it }) {
                    AssistChip(
                        onClick = { modelMenuOpen = true },
                        label = { Text(MODELS.firstOrNull { it.first == model }?.second ?: model) },
                        modifier = Modifier.menuAnchor()
                    )
                    ExposedDropdownMenu(expanded = modelMenuOpen, onDismissRequest = { modelMenuOpen = false }) {
                        MODELS.forEach { (id, label) ->
                            DropdownMenuItem(text = { Text(label) }, onClick = {
                                model = id; modelMenuOpen = false; persistPrefs()
                            })
                        }
                    }
                }
            }
        }

        // Yellow pattern suggestion chips — tap to prefill the composer.
        if (chips.isNotEmpty()) {
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                chips.forEach { chip ->
                    SuggestionChip(
                        onClick = { input = chip.label },
                        label = { Text(chip.label) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = MaterialTheme.colorScheme.tertiaryContainer,
                            labelColor = MaterialTheme.colorScheme.onTertiaryContainer
                        )
                    )
                }
            }
        }

        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(vertical = 12.dp)
        ) {
            items(messages) { Bubble(it) }
        }
        Surface(tonalElevation = 3.dp) {
            Row(Modifier.padding(8.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(input, { input = it }, modifier = Modifier.weight(1f),
                    placeholder = { Text(if (agi) "Tell CriderGPT what to do..." else "Ask CriderGPT...") })
                Spacer(Modifier.width(8.dp))
                Button(
                    enabled = !busy && input.isNotBlank(),
                    onClick = {
                        val text = input.trim(); input = ""
                        messages += Msg("user", text); busy = true
                        scope.launch {
                            val payload = JSONObject()
                                .put("model", model)
                                .put("agi_mode", agi)
                                .put("messages", JSONArray().apply {
                                    messages.forEach { put(JSONObject().put("role", it.role).put("content", it.content)) }
                                })
                            val raw = runCatching { SupabaseClient.invoke("chat-with-ai", payload) }
                                .getOrElse { "Error: \${it.message}" }
                            val reply = runCatching {
                                val j = JSONObject(raw); j.optString("response", j.optString("message", raw))
                            }.getOrDefault(raw)
                            messages += Msg("assistant", reply); busy = false
                            if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
                        }
                    }
                ) { Text(if (busy) "..." else "Send") }
            }
        }
    }
}

@Composable
private fun Bubble(m: Msg) {
    val isUser = m.role == "user"
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
        Surface(
            color = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
            contentColor = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.clip(RoundedCornerShape(16.dp)).widthIn(max = 300.dp)
        ) { Text(m.content, modifier = Modifier.padding(12.dp)) }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/gallery/GalleryScreen.kt`]: `package ${PKG}.ui.gallery

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import ${PKG}.data.SupabaseClient

data class GalleryItem(val id: String, val url: String?, val prompt: String?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GalleryScreen(onBack: () -> Unit) {
    var items by remember { mutableStateOf<List<GalleryItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableStateOf(0) }

    LaunchedEffect(reload) {
        loading = true; error = null
        runCatching {
            val arr = SupabaseClient.select(
                "media_generations",
                select = "id,output_url,prompt,created_at",
                order = "created_at.desc",
                limit = 60
            )
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(GalleryItem(o.optString("id"), o.optString("output_url", null), o.optString("prompt", null)))
                }
            }
        }.onSuccess { items = it }.onFailure { error = it.message }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gallery") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } },
                actions = { IconButton(onClick = { reload++ }) { Icon(Icons.Default.Refresh, "Refresh") } }
            )
        }
    ) { pad ->
        Box(Modifier.padding(pad).fillMaxSize()) {
            when {
                loading -> CircularProgressIndicator(Modifier.padding(24.dp))
                error != null -> Text("Error: \$error", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                items.isEmpty() -> Text("No generated media yet.", modifier = Modifier.padding(16.dp))
                else -> LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(items) { g ->
                        ElevatedCard {
                            Column {
                                g.url?.let { AsyncImage(model = it, contentDescription = g.prompt, modifier = Modifier.fillMaxWidth().height(160.dp)) }
                                g.prompt?.let { Text(it, modifier = Modifier.padding(8.dp), maxLines = 2, style = MaterialTheme.typography.bodySmall) }
                            }
                        }
                    }
                }
            }
        }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/vision/VisionMemoryScreen.kt`]: `package ${PKG}.ui.vision

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient

data class VisionEntry(val id: String, val summary: String?, val createdAt: String?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VisionMemoryScreen(onBack: () -> Unit) {
    var entries by remember { mutableStateOf<List<VisionEntry>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        runCatching {
            val arr = SupabaseClient.select(
                "vision_memory",
                select = "id,summary,created_at",
                order = "created_at.desc",
                limit = 100
            )
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(VisionEntry(o.optString("id"), o.optString("summary", null), o.optString("created_at", null)))
                }
            }
        }.onSuccess { entries = it }.onFailure { error = it.message }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Vision Memory") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } }
            )
        }
    ) { pad ->
        Box(Modifier.padding(pad).fillMaxSize().padding(12.dp)) {
            when {
                loading -> CircularProgressIndicator()
                error != null -> Text("Error: \$error", color = MaterialTheme.colorScheme.error)
                entries.isEmpty() -> Text("No vision memory recorded yet.")
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(entries) { e ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(e.summary ?: "(no summary)", style = MaterialTheme.typography.bodyMedium)
                                e.createdAt?.let { Text(it, style = MaterialTheme.typography.labelSmall) }
                            }
                        }
                    }
                }
            }
        }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/livestock/LivestockListScreen.kt`]: `package ${PKG}.ui.livestock

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient

data class Animal(val id: String, val tagId: String?, val name: String?, val species: String?)

@Composable
fun LivestockListScreen() {
    var animals by remember { mutableStateOf<List<Animal>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        runCatching {
            val arr = SupabaseClient.select(
                "livestock_animals",
                select = "id,tag_id,name,species,created_at",
                order = "created_at.desc",
                limit = 200
            )
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(Animal(o.optString("id"), o.optString("tag_id", null),
                        o.optString("name", null), o.optString("species", null)))
                }
            }
        }.onSuccess { animals = it }.onFailure { error = it.message }
        loading = false
    }

    Column(Modifier.fillMaxSize().padding(12.dp)) {
        Text("Livestock", style = MaterialTheme.typography.titleLarge)
        Text("Tap an animal for details. Scan a CriderGPT-XXXXXX tag from any screen.",
            style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(8.dp))
        when {
            loading -> CircularProgressIndicator()
            error != null -> Text("Error: \$error", color = MaterialTheme.colorScheme.error)
            animals.isEmpty() -> Text("No animals yet. Register one on the website or scan a tag.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                items(animals) { a ->
                    ElevatedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp)) {
                            Text(a.name ?: a.tagId ?: a.id,
                                style = MaterialTheme.typography.titleMedium)
                            a.tagId?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            a.species?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                        }
                    }
                }
            }
        }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/ideas/IdeaPlannerScreen.kt`]: `package ${PKG}.ui.ideas

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient
import kotlinx.coroutines.launch
import org.json.JSONObject

data class Idea(val id: String, val title: String, val status: String?)

@Composable
fun IdeaPlannerScreen() {
    var ideas by remember { mutableStateOf<List<Idea>>(emptyList()) }
    var newTitle by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    suspend fun reload() {
        val uid = SessionManager.userId() ?: return
        val arr = SupabaseClient.select(
            "idea_planner_ideas",
            select = "id,title,status,created_at",
            filters = mapOf("user_id" to "eq.\$uid"),
            order = "created_at.desc",
            limit = 200
        )
        ideas = buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(Idea(o.optString("id"), o.optString("title"), o.optString("status", null)))
            }
        }
    }

    LaunchedEffect(Unit) { runCatching { reload() }; loading = false }

    Column(Modifier.fillMaxSize().padding(12.dp)) {
        Text("Idea Planner", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(newTitle, { newTitle = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("New idea...") })
            Spacer(Modifier.width(8.dp))
            Button(
                enabled = newTitle.isNotBlank(),
                onClick = {
                    val uid = SessionManager.userId() ?: return@Button
                    val row = JSONObject()
                        .put("title", newTitle.trim())
                        .put("user_id", uid)
                        .put("status", "new")
                    val current = newTitle; newTitle = ""
                    scope.launch {
                        runCatching { SupabaseClient.insert("idea_planner_ideas", row); reload() }
                            .onFailure { newTitle = current }
                    }
                }
            ) { Text("Add") }
        }
        Spacer(Modifier.height(12.dp))
        if (loading) CircularProgressIndicator()
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(ideas) { idea ->
                ElevatedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(idea.title, style = MaterialTheme.typography.titleMedium)
                        idea.status?.let { AssistChip(onClick = {}, label = { Text(it) }) }
                    }
                }
            }
        }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/calendar/CalendarScreen.kt`]: `package ${PKG}.ui.calendar

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient

data class Ev(val id: String, val title: String, val when_: String?)

@Composable
fun CalendarScreen() {
    var events by remember { mutableStateOf<List<Ev>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val uid = SessionManager.userId()
        runCatching {
            val arr = SupabaseClient.select(
                "events",
                select = "id,title,event_date,start_time,visibility,created_by",
                filters = if (uid != null) mapOf("created_by" to "eq.\$uid") else emptyMap(),
                order = "event_date.asc",
                limit = 200
            )
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(Ev(o.optString("id"), o.optString("title"),
                        listOfNotNull(o.optString("event_date", null), o.optString("start_time", null))
                            .joinToString(" ").ifBlank { null }))
                }
            }
        }.onSuccess { events = it }
        loading = false
    }

    Column(Modifier.fillMaxSize().padding(12.dp)) {
        Text("Calendar", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        if (loading) CircularProgressIndicator()
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(events) { e ->
                ElevatedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(e.title, style = MaterialTheme.typography.titleMedium)
                        e.when_?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                    }
                }
            }
        }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/profile/ProfileScreen.kt`]: `package ${PKG}.ui.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun ProfileScreen() {
    var displayName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var saved by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()
    val uid = SessionManager.userId()

    LaunchedEffect(uid) {
        if (uid == null) { loading = false; return@LaunchedEffect }
        runCatching {
            val arr = SupabaseClient.select(
                "profiles",
                select = "display_name,email",
                filters = mapOf("id" to "eq.\$uid"),
                limit = 1
            )
            if (arr.length() > 0) {
                val o = arr.getJSONObject(0)
                displayName = o.optString("display_name", "")
                email = o.optString("email", "")
            }
        }
        loading = false
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Profile", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(12.dp))
        if (loading) CircularProgressIndicator()
        OutlinedTextField(displayName, { displayName = it },
            label = { Text("Display name") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(email, {}, label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(), enabled = false)
        saved?.let { Spacer(Modifier.height(8.dp)); Text(it) }
        Spacer(Modifier.height(16.dp))
        Button(onClick = {
            val u = uid ?: return@Button
            scope.launch {
                runCatching {
                    SupabaseClient.update(
                        "profiles",
                        mapOf("id" to "eq.\$u"),
                        JSONObject().put("display_name", displayName)
                    )
                }.onSuccess { saved = "Saved." }
                    .onFailure { saved = "Error: \${it.message}" }
            }
        }) { Text("Save") }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/profile/AccountManagementScreen.kt`]: `package ${PKG}.ui.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient

@Composable
fun AccountManagementScreen() {
    var tier by remember { mutableStateOf("loading...") }
    val uid = SessionManager.userId()

    LaunchedEffect(uid) {
        if (uid == null) { tier = "Not signed in"; return@LaunchedEffect }
        runCatching {
            val arr = SupabaseClient.select(
                "user_subscriptions",
                select = "tier,status,current_period_end",
                filters = mapOf("user_id" to "eq.\$uid"),
                order = "current_period_end.desc",
                limit = 1
            )
            if (arr.length() > 0) {
                val o = arr.getJSONObject(0)
                tier = "\${o.optString("tier", "free")} (\${o.optString("status", "active")})"
            } else tier = "free"
        }.onFailure { tier = "Error: \${it.message}" }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Account", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(12.dp))
        Text("Current plan: \$tier")
        Spacer(Modifier.height(24.dp))
        Text("Manage billing on the website.", style = MaterialTheme.typography.bodySmall)
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/notifications/NotificationsScreen.kt`]: `package ${PKG}.ui.notifications

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient

data class Note(val id: String, val title: String, val body: String?)

@Composable
fun NotificationsScreen() {
    var notes by remember { mutableStateOf<List<Note>>(emptyList()) }
    val uid = SessionManager.userId()

    LaunchedEffect(uid) {
        if (uid == null) return@LaunchedEffect
        runCatching {
            val arr = SupabaseClient.select(
                "user_notifications",
                select = "id,title,body,created_at",
                filters = mapOf("user_id" to "eq.\$uid"),
                order = "created_at.desc",
                limit = 100
            )
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(Note(o.optString("id"), o.optString("title"),
                        o.optString("body", null)))
                }
            }
        }.onSuccess { notes = it }
    }

    Column(Modifier.fillMaxSize().padding(12.dp)) {
        Text("Notifications", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(notes) { n ->
                ElevatedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(n.title, style = MaterialTheme.typography.titleMedium)
                        n.body?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                    }
                }
            }
        }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/DevHubScreen.kt`]: `package ${PKG}.ui.devhub

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.util.rememberHasRole

private data class DevModule(val label: String, val route: String)

/**
 * Owner-only. All DevHub modules render natively inside the app — never as
 * external Chrome links. The route is the in-app navigation destination.
 */
private val DEV_MODULES = listOf(
    DevModule("Server AI Console", "devhub/server-console"),
    DevModule("Server Health & Self-Repair", "devhub/server-health"),
    DevModule("Knowledge Vault", "devhub/vault"),
    DevModule("Machine Designer", "devhub/machine-designer"),
    DevModule("Code Generator", "devhub/code-generator"),
    DevModule("Agent Dispatcher", "devhub/agent-dispatcher"),
    DevModule("Autopilot Queue", "devhub/autopilot"),
    DevModule("Android Auto-Builder", "devhub/android-builder"),
    DevModule("iOS Builder", "devhub/ios-builder"),
    DevModule("Chrome Extension Studio", "devhub/chrome-extensions"),
    DevModule("Roku Channel Studio", "devhub/roku-studio"),
    DevModule("Backend Wiring Reference", "devhub/backend-wiring"),
    DevModule("UI Blueprints", "devhub/ui-blueprints"),
    DevModule("Tech Knowledge Library", "devhub/tech-library"),
    DevModule("Auto-Promo (Hourly)", "devhub/auto-promo"),
    DevModule("Idea Planner", "devhub/idea-planner"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevHubScreen(onOpenModule: (String) -> Unit) {
    val isOwner = rememberHasRole("owner")
    Column(Modifier.fillMaxSize().padding(12.dp)) {
        Text("Dev Hub", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        when (isOwner) {
            null -> Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(); Spacer(Modifier.width(8.dp)); Text("Checking access...")
            }
            false -> Text("Owner access required.", color = MaterialTheme.colorScheme.error)
            true -> {
                Text("Owner-only command center. All modules render natively in-app.",
                    style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(8.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(DEV_MODULES) { m ->
                        ElevatedCard(onClick = { onOpenModule(m.route) }, modifier = Modifier.fillMaxWidth()) {
                            Text(m.label, modifier = Modifier.padding(12.dp))
                        }
                    }
                }
            }
        }
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/admin/AdminPanelScreen.kt`]: `package ${PKG}.ui.admin

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.util.rememberHasRole

data class AuditRow(val id: String, val action: String?, val createdAt: String?)

@Composable
fun AdminPanelScreen() {
    val isAdmin = rememberHasRole("admin")
    var rows by remember { mutableStateOf<List<AuditRow>>(emptyList()) }

    LaunchedEffect(isAdmin) {
        if (isAdmin != true) return@LaunchedEffect
        runCatching {
            val arr = SupabaseClient.select(
                "admin_audit_logs",
                select = "id,action,created_at",
                order = "created_at.desc",
                limit = 100
            )
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(AuditRow(o.optString("id"),
                        o.optString("action", null),
                        o.optString("created_at", null)))
                }
            }
        }.onSuccess { rows = it }
    }

    Column(Modifier.fillMaxSize().padding(12.dp)) {
        Text("Admin Panel", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        when (isAdmin) {
            null -> Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(); Spacer(Modifier.width(8.dp)); Text("Checking access...")
            }
            false -> Text("Admin access required.", color = MaterialTheme.colorScheme.error)
            true -> {
                Text("Recent audit log entries:", style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(8.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(rows) { r ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(r.action ?: "(no action)",
                                    style = MaterialTheme.typography.titleMedium)
                                r.createdAt?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            }
                        }
                    }
                }
            }
        }
    }
}
`,
  [`app/src/main/java/${PKG_PATH}/ui/devhub/Common.kt`]: `package ${PKG}.ui.devhub

import android.widget.Toast
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient
import org.json.JSONObject

/** Wraps content behind a biometric / device-credential prompt. */
@Composable
fun BiometricGate(content: @Composable () -> Unit) {
    val ctx = LocalContext.current
    var authed by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }

    val bm = BiometricManager.from(ctx)
    val canAuth = bm.canAuthenticate(
        BiometricManager.Authenticators.BIOMETRIC_WEAK or
        BiometricManager.Authenticators.DEVICE_CREDENTIAL
    )

    LaunchedEffect(Unit) {
        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) { authed = true; return@LaunchedEffect }
        val activity = ctx as? FragmentActivity ?: run { authed = true; return@LaunchedEffect }
        val executor = ContextCompat.getMainExecutor(ctx)
        val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(r: BiometricPrompt.AuthenticationResult) { authed = true }
            override fun onAuthenticationError(code: Int, msg: CharSequence) { authError = msg.toString() }
            override fun onAuthenticationFailed() { authError = "Authentication failed." }
        })
        prompt.authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle("DevHub — Owner Access")
                .setSubtitle("Confirm your identity to continue")
                .setAllowedAuthenticators(
                    BiometricManager.Authenticators.BIOMETRIC_WEAK or
                    BiometricManager.Authenticators.DEVICE_CREDENTIAL
                ).build()
        )
    }

    when {
        authError != null -> Column(Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Auth Error", style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(8.dp))
            Text(authError!!)
        }
        !authed -> Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(); Spacer(Modifier.height(8.dp)); Text("Verifying identity...")
        }
        else -> content()
    }
}

/** Wraps content behind an owner-role check via has_role RPC. */
@Composable
fun OwnerGate(content: @Composable () -> Unit) {
    val uid = SessionManager.userId()
    var isOwner by remember { mutableStateOf<Boolean?>(null) }

    LaunchedEffect(uid) {
        if (uid == null) { isOwner = false; return@LaunchedEffect }
        isOwner = runCatching {
            SupabaseClient.rpc("has_role",
                JSONObject().put("_user_id", uid).put("_role", "owner")).trim() == "true"
        }.getOrDefault(false)
    }

    when (isOwner) {
        null -> Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(); Spacer(Modifier.height(8.dp)); Text("Checking access...")
        }
        false -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Access Denied", style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(8.dp))
            Text("Owner role required.")
        }
        true -> content()
    }
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/ServerConsoleScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate
import kotlinx.coroutines.launch
import org.json.JSONObject

data class ContainerStatus(val name: String, val status: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServerConsoleScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var containers by remember { mutableStateOf<List<ContainerStatus>>(emptyList()) }
        var lastBackup by remember { mutableStateOf("—") }
        var error by remember { mutableStateOf<String?>(null) }
        var loading by remember { mutableStateOf(true) }
        val scope = rememberCoroutineScope()

        fun load() {
            scope.launch {
                loading = true; error = null
                runCatching {
                    val raw = SupabaseClient.invoke("server-status", JSONObject())
                    val j = org.json.JSONObject(raw)
                    lastBackup = j.optString("last_backup", "unknown")
                    val arr = j.optJSONArray("containers")
                    containers = if (arr != null) buildList {
                        for (i in 0 until arr.length()) {
                            val o = arr.getJSONObject(i)
                            add(ContainerStatus(o.optString("name"), o.optString("status")))
                        }
                    } else listOf(ContainerStatus("server-status edge fn", "Backend not wired yet — create edge fn server-status"))
                }.onFailure { error = "Backend not wired yet — create edge fn server-status (\${it.message})" }
                loading = false
            }
        }

        LaunchedEffect(Unit) { load() }

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Server Console") },
                    navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } },
                    actions = { IconButton(onClick = ::load) { Icon(Icons.Default.Refresh, "Refresh") } }
                )
            }
        ) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                Text("Last backup: \$lastBackup", style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(8.dp))
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                if (loading) CircularProgressIndicator()
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(containers) { c ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(c.name, style = MaterialTheme.typography.titleMedium)
                                Text(c.status, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/VaultScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate
import kotlinx.coroutines.launch
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VaultScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var secrets by remember { mutableStateOf<List<String>>(emptyList()) }
        var newName by remember { mutableStateOf("") }
        var newValue by remember { mutableStateOf("") }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()
        val uid = SessionManager.userId()

        suspend fun reload() {
            if (uid == null) return
            runCatching {
                val arr = SupabaseClient.select("secrets_vault", select = "name",
                    filters = mapOf("user_id" to "eq.\$uid"), order = "name.asc")
                secrets = buildList { for (i in 0 until arr.length()) add(arr.getJSONObject(i).optString("name")) }
            }.onFailure { error = "Backend not wired yet — create secrets_vault table (\${it.message})" }
        }

        LaunchedEffect(Unit) { reload() }

        Scaffold(topBar = {
            TopAppBar(title = { Text("Knowledge Vault") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                Text("Secret names only — values never sent to this screen.",
                    style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(newName, { newName = it }, modifier = Modifier.weight(1f),
                        placeholder = { Text("Secret name") }, singleLine = true)
                    Spacer(Modifier.width(4.dp))
                    OutlinedTextField(newValue, { newValue = it }, modifier = Modifier.weight(1f),
                        placeholder = { Text("Value") }, singleLine = true)
                    Spacer(Modifier.width(4.dp))
                    Button(enabled = newName.isNotBlank() && newValue.isNotBlank() && uid != null,
                        onClick = {
                            val u = uid ?: return@Button
                            val nm = newName.trim(); val vl = newValue.trim()
                            newName = ""; newValue = ""
                            scope.launch {
                                runCatching {
                                    SupabaseClient.insert("secrets_vault",
                                        JSONObject().put("name", nm).put("value", vl).put("user_id", u))
                                    reload()
                                }.onFailure { error = it.message }
                            }
                        }) { Text("Add") }
                }
                Spacer(Modifier.height(12.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    items(secrets) { name ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(name, modifier = Modifier.weight(1f))
                                IconButton(onClick = {
                                    val u = uid ?: return@IconButton
                                    scope.launch {
                                        runCatching {
                                            SupabaseClient.delete("secrets_vault",
                                                mapOf("name" to "eq.\$name", "user_id" to "eq.\$u"))
                                            reload()
                                        }.onFailure { error = it.message }
                                    }
                                }) { Icon(Icons.Default.Delete, "Delete") }
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/AgentDispatcherScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate
import kotlinx.coroutines.launch
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentDispatcherScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var task by remember { mutableStateOf("") }
        var agentCount by remember { mutableStateOf("1") }
        var result by remember { mutableStateOf<String?>(null) }
        var loading by remember { mutableStateOf(false) }
        val scope = rememberCoroutineScope()

        Scaffold(topBar = {
            TopAppBar(title = { Text("Agent Dispatcher") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(16.dp).fillMaxSize()) {
                OutlinedTextField(task, { task = it }, label = { Text("Task description") },
                    modifier = Modifier.fillMaxWidth(), minLines = 3)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(agentCount, { agentCount = it.filter(Char::isDigit) },
                    label = { Text("Agent count") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(16.dp))
                Button(enabled = !loading && task.isNotBlank(),
                    onClick = {
                        loading = true; result = null
                        val payload = JSONObject()
                            .put("task", task.trim())
                            .put("agent_count", agentCount.toIntOrNull() ?: 1)
                        scope.launch {
                            result = runCatching { SupabaseClient.invoke("agent-dispatch", payload) }
                                .getOrElse { "Backend not wired yet — create edge fn agent-dispatch (\${it.message})" }
                            loading = false
                        }
                    }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Send, null); Spacer(Modifier.width(8.dp))
                    Text(if (loading) "Dispatching..." else "Dispatch Agent")
                }
                result?.let {
                    Spacer(Modifier.height(16.dp))
                    ElevatedCard(Modifier.fillMaxWidth()) {
                        Text(it, modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/AutopilotScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate
import kotlinx.coroutines.launch
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AutopilotScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var enabled by remember { mutableStateOf(false) }
        var loading by remember { mutableStateOf(true) }
        var saving by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()
        val uid = SessionManager.userId()

        LaunchedEffect(uid) {
            if (uid == null) { loading = false; return@LaunchedEffect }
            runCatching {
                val arr = SupabaseClient.select("user_settings", select = "autopilot_enabled",
                    filters = mapOf("user_id" to "eq.\$uid"), limit = 1)
                if (arr.length() > 0) enabled = arr.getJSONObject(0).optBoolean("autopilot_enabled", false)
            }.onFailure { error = "Backend not wired yet — create user_settings table (\${it.message})" }
            loading = false
        }

        Scaffold(topBar = {
            TopAppBar(title = { Text("Autopilot Queue") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(24.dp).fillMaxSize(),
                verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                if (loading) { CircularProgressIndicator(); return@Column }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(16.dp)) }
                Text("AGI Autopilot", style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.height(8.dp))
                Text(if (enabled) "ENABLED — Autopilot is running autonomously."
                     else "DISABLED — Autopilot is paused.",
                    style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(24.dp))
                Switch(checked = enabled, onCheckedChange = { newVal ->
                    val u = uid ?: return@Switch
                    saving = true
                    scope.launch {
                        runCatching {
                            // upsert pattern via insert with conflict update
                            SupabaseClient.rpc("upsert_user_setting",
                                JSONObject().put("_user_id", u)
                                    .put("_key", "autopilot_enabled").put("_value", newVal.toString()))
                        }.onSuccess { enabled = newVal }
                            .onFailure { error = it.message }
                        saving = false
                    }
                }, enabled = !saving)
                Spacer(Modifier.height(8.dp))
                Text(if (saving) "Saving..." else "", style = MaterialTheme.typography.bodySmall)
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/AndroidBuilderScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Build
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate
import kotlinx.coroutines.launch
import org.json.JSONObject

data class BuildRun(val id: String, val status: String, val createdAt: String?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AndroidBuilderScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var runs by remember { mutableStateOf<List<BuildRun>>(emptyList()) }
        var triggering by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        suspend fun loadRuns() {
            runCatching {
                val arr = SupabaseClient.select("build_runs", select = "id,status,created_at",
                    filters = mapOf("platform" to "eq.android"), order = "created_at.desc", limit = 20)
                runs = buildList { for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(BuildRun(o.optString("id"), o.optString("status"), o.optString("created_at", null)))
                }}
            }.onFailure { error = "Backend not wired yet — create build_runs table (\${it.message})" }
        }

        LaunchedEffect(Unit) { loadRuns() }

        Scaffold(topBar = {
            TopAppBar(title = { Text("Android Auto-Builder") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                Button(enabled = !triggering, onClick = {
                    triggering = true; error = null
                    scope.launch {
                        runCatching { SupabaseClient.invoke("trigger-android-build", JSONObject()) }
                            .onFailure { error = "Backend not wired yet — create edge fn trigger-android-build (\${it.message})" }
                        loadRuns(); triggering = false
                    }
                }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Build, null); Spacer(Modifier.width(8.dp))
                    Text(if (triggering) "Triggering…" else "Trigger New Build")
                }
                Spacer(Modifier.height(12.dp))
                Text("Recent builds:", style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(4.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(runs) { r ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp)) {
                                Column(Modifier.weight(1f)) {
                                    Text(r.id.take(8), style = MaterialTheme.typography.titleSmall)
                                    r.createdAt?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                                }
                                AssistChip(onClick = {}, label = { Text(r.status) })
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/IosBuilderScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Build
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate
import kotlinx.coroutines.launch
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IosBuilderScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var runs by remember { mutableStateOf<List<BuildRun>>(emptyList()) }
        var triggering by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        suspend fun loadRuns() {
            runCatching {
                val arr = SupabaseClient.select("build_runs", select = "id,status,created_at",
                    filters = mapOf("platform" to "eq.ios"), order = "created_at.desc", limit = 20)
                runs = buildList { for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(BuildRun(o.optString("id"), o.optString("status"), o.optString("created_at", null)))
                }}
            }.onFailure { error = "Backend not wired yet — create build_runs table (\${it.message})" }
        }

        LaunchedEffect(Unit) { loadRuns() }

        Scaffold(topBar = {
            TopAppBar(title = { Text("iOS Builder") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                Button(enabled = !triggering, onClick = {
                    triggering = true; error = null
                    scope.launch {
                        runCatching { SupabaseClient.invoke("trigger-ios-build", JSONObject()) }
                            .onFailure { error = "Backend not wired yet — create edge fn trigger-ios-build (\${it.message})" }
                        loadRuns(); triggering = false
                    }
                }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Build, null); Spacer(Modifier.width(8.dp))
                    Text(if (triggering) "Triggering…" else "Trigger iOS Build")
                }
                Spacer(Modifier.height(12.dp))
                Text("Recent builds:", style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(4.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(runs) { r ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp)) {
                                Column(Modifier.weight(1f)) {
                                    Text(r.id.take(8), style = MaterialTheme.typography.titleSmall)
                                    r.createdAt?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                                }
                                AssistChip(onClick = {}, label = { Text(r.status) })
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/ChromeExtensionsScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate

data class ChromeExt(val id: String, val name: String, val description: String?, val version: String?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChromeExtensionsScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var exts by remember { mutableStateOf<List<ChromeExt>>(emptyList()) }
        var error by remember { mutableStateOf<String?>(null) }
        var loading by remember { mutableStateOf(true) }

        LaunchedEffect(Unit) {
            runCatching {
                val arr = SupabaseClient.select("chrome_extensions",
                    select = "id,name,description,version", order = "name.asc")
                exts = buildList { for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(ChromeExt(o.optString("id"), o.optString("name"),
                        o.optString("description", null), o.optString("version", null)))
                }}
            }.onFailure { error = "Backend not wired yet — create chrome_extensions table (\${it.message})" }
            loading = false
        }

        Scaffold(topBar = {
            TopAppBar(title = { Text("Chrome Extension Studio") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                if (loading) CircularProgressIndicator()
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(exts) { e ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(e.name, style = MaterialTheme.typography.titleMedium)
                                e.version?.let { Text("v\$it", style = MaterialTheme.typography.labelSmall) }
                                e.description?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/RokuStudioScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate

data class RokuChannel(val id: String, val name: String, val status: String?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RokuStudioScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var channels by remember { mutableStateOf<List<RokuChannel>>(emptyList()) }
        var error by remember { mutableStateOf<String?>(null) }
        var loading by remember { mutableStateOf(true) }

        LaunchedEffect(Unit) {
            runCatching {
                val arr = SupabaseClient.select("roku_channels",
                    select = "id,name,status", order = "name.asc")
                channels = buildList { for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(RokuChannel(o.optString("id"), o.optString("name"), o.optString("status", null)))
                }}
            }.onFailure { error = "Backend not wired yet — create roku_channels table (\${it.message})" }
            loading = false
        }

        Scaffold(topBar = {
            TopAppBar(title = { Text("Roku Channel Studio") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                if (loading) CircularProgressIndicator()
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(channels) { c ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp)) {
                                Text(c.name, modifier = Modifier.weight(1f),
                                    style = MaterialTheme.typography.titleMedium)
                                c.status?.let { AssistChip(onClick = {}, label = { Text(it) }) }
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/BackendWiringScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate
import kotlinx.coroutines.launch
import org.json.JSONObject

data class TableInfo(val name: String, val count: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BackendWiringScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var tables by remember { mutableStateOf<List<TableInfo>>(emptyList()) }
        var error by remember { mutableStateOf<String?>(null) }
        var loading by remember { mutableStateOf(true) }
        val scope = rememberCoroutineScope()

        fun load() {
            scope.launch {
                loading = true; error = null
                runCatching {
                    val raw = SupabaseClient.invoke("db-diagnostic", JSONObject())
                    val j = org.json.JSONObject(raw)
                    val arr = j.optJSONArray("tables")
                    tables = if (arr != null) buildList { for (i in 0 until arr.length()) {
                        val o = arr.getJSONObject(i)
                        add(TableInfo(o.optString("name"), o.optString("count", "?")))
                    }} else listOf(TableInfo("db-diagnostic edge fn", "Not wired yet"))
                }.onFailure { error = "Backend not wired yet — create edge fn db-diagnostic (\${it.message})" }
                loading = false
            }
        }

        LaunchedEffect(Unit) { load() }

        Scaffold(topBar = {
            TopAppBar(title = { Text("Backend Wiring") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } },
                actions = { IconButton(onClick = ::load) { Icon(Icons.Default.Refresh, "Refresh") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                if (loading) CircularProgressIndicator()
                Text("Table row counts (read-only diagnostic):",
                    style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(4.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    items(tables) { t ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                                Text(t.name, modifier = Modifier.weight(1f))
                                Text(t.count, style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/UiBlueprintsScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate

data class UiBlueprint(val id: String, val name: String, val description: String?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UiBlueprintsScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var items_ by remember { mutableStateOf<List<UiBlueprint>>(emptyList()) }
        var error by remember { mutableStateOf<String?>(null) }
        var expanded by remember { mutableStateOf<String?>(null) }
        var loading by remember { mutableStateOf(true) }

        LaunchedEffect(Unit) {
            runCatching {
                val arr = SupabaseClient.select("ui_blueprints",
                    select = "id,name,description", order = "name.asc")
                items_ = buildList { for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(UiBlueprint(o.optString("id"), o.optString("name"),
                        o.optString("description", null)))
                }}
            }.onFailure { error = "Backend not wired yet — create ui_blueprints table (\${it.message})" }
            loading = false
        }

        Scaffold(topBar = {
            TopAppBar(title = { Text("UI Blueprints") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                if (loading) CircularProgressIndicator()
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(items_) { bp ->
                        ElevatedCard(onClick = { expanded = if (expanded == bp.id) null else bp.id },
                            modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(bp.name, style = MaterialTheme.typography.titleMedium)
                                if (expanded == bp.id && bp.description != null) {
                                    Spacer(Modifier.height(4.dp))
                                    Text(bp.description, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/TechLibraryScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate

data class TechEntry(val id: String, val title: String, val category: String?, val summary: String?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TechLibraryScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var entries by remember { mutableStateOf<List<TechEntry>>(emptyList()) }
        var error by remember { mutableStateOf<String?>(null) }
        var loading by remember { mutableStateOf(true) }

        LaunchedEffect(Unit) {
            runCatching {
                val arr = SupabaseClient.select("tech_library",
                    select = "id,title,category,summary", order = "title.asc")
                entries = buildList { for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(TechEntry(o.optString("id"), o.optString("title"),
                        o.optString("category", null), o.optString("summary", null)))
                }}
            }.onFailure { error = "Backend not wired yet — create tech_library table (\${it.message})" }
            loading = false
        }

        Scaffold(topBar = {
            TopAppBar(title = { Text("Tech Knowledge Library") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                if (loading) CircularProgressIndicator()
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(entries) { e ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(e.title, style = MaterialTheme.typography.titleMedium)
                                e.category?.let { AssistChip(onClick = {}, label = { Text(it) }) }
                                e.summary?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/AutoPromoScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate
import kotlinx.coroutines.launch
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AutoPromoScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var enabled by remember { mutableStateOf(false) }
        var loading by remember { mutableStateOf(true) }
        var saving by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()
        val uid = SessionManager.userId()

        LaunchedEffect(uid) {
            if (uid == null) { loading = false; return@LaunchedEffect }
            runCatching {
                val arr = SupabaseClient.select("user_settings", select = "auto_promo_enabled",
                    filters = mapOf("user_id" to "eq.\$uid"), limit = 1)
                if (arr.length() > 0) enabled = arr.getJSONObject(0).optBoolean("auto_promo_enabled", false)
            }.onFailure { error = "Backend not wired yet — create user_settings table (\${it.message})" }
            loading = false
        }

        Scaffold(topBar = {
            TopAppBar(title = { Text("Auto-Promo (Hourly)") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(24.dp).fillMaxSize(),
                verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                if (loading) { CircularProgressIndicator(); return@Column }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(16.dp)) }
                Text("Auto-Promotion Cron", style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.height(8.dp))
                Text(if (enabled) "ACTIVE — Hourly promotion cron is running."
                     else "INACTIVE — Promotion cron is disabled.",
                    style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(24.dp))
                Switch(checked = enabled, onCheckedChange = { newVal ->
                    val u = uid ?: return@Switch; saving = true
                    scope.launch {
                        runCatching {
                            SupabaseClient.rpc("upsert_user_setting",
                                JSONObject().put("_user_id", u)
                                    .put("_key", "auto_promo_enabled").put("_value", newVal.toString()))
                        }.onSuccess { enabled = newVal }.onFailure { error = it.message }
                        saving = false
                    }
                }, enabled = !saving)
                Spacer(Modifier.height(8.dp))
                if (saving) CircularProgressIndicator(modifier = Modifier.then(Modifier))
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/DevIdeaPlannerScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.data.SessionManager
import ${PKG}.data.SupabaseClient
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate
import kotlinx.coroutines.launch
import org.json.JSONObject

data class DevIdea(val id: String, val title: String, val body: String?, val status: String?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevIdeaPlannerScreen(onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        var ideas by remember { mutableStateOf<List<DevIdea>>(emptyList()) }
        var newTitle by remember { mutableStateOf("") }
        var newBody by remember { mutableStateOf("") }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()
        val uid = SessionManager.userId()

        suspend fun reload() {
            if (uid == null) return
            runCatching {
                val arr = SupabaseClient.select("ideas", select = "id,title,body,status",
                    filters = mapOf("user_id" to "eq.\$uid"), order = "created_at.desc", limit = 100)
                ideas = buildList { for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(DevIdea(o.optString("id"), o.optString("title"),
                        o.optString("body", null), o.optString("status", null)))
                }}
            }.onFailure { error = "Backend not wired yet — create ideas table (\${it.message})" }
        }

        LaunchedEffect(Unit) { reload() }

        Scaffold(topBar = {
            TopAppBar(title = { Text("Dev Idea Planner") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).padding(12.dp).fillMaxSize()) {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error); Spacer(Modifier.height(8.dp)) }
                OutlinedTextField(newTitle, { newTitle = it }, label = { Text("Title") },
                    singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(newBody, { newBody = it }, label = { Text("Description (optional)") },
                    minLines = 2, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                Button(enabled = newTitle.isNotBlank() && uid != null,
                    onClick = {
                        val u = uid ?: return@Button
                        val t = newTitle.trim(); val b = newBody.trim()
                        newTitle = ""; newBody = ""
                        scope.launch {
                            runCatching {
                                SupabaseClient.insert("ideas",
                                    JSONObject().put("title", t).put("body", b.ifBlank { null })
                                        .put("status", "new").put("user_id", u))
                                reload()
                            }.onFailure { newTitle = t; error = it.message }
                        }
                    }, modifier = Modifier.fillMaxWidth()) { Text("Add Idea") }
                Spacer(Modifier.height(12.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(ideas) { idea ->
                        ElevatedCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(idea.title, style = MaterialTheme.typography.titleMedium)
                                idea.body?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                                idea.status?.let { AssistChip(onClick = {}, label = { Text(it) }) }
                            }
                        }
                    }
                }
            }
        }
    }}
}
`,

  [`app/src/main/java/${PKG_PATH}/ui/devhub/modules/ComingSoonScreen.kt`]: `package ${PKG}.ui.devhub.modules

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${PKG}.ui.devhub.BiometricGate
import ${PKG}.ui.devhub.OwnerGate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComingSoonScreen(moduleName: String, onBack: () -> Unit) {
    BiometricGate { OwnerGate {
        Scaffold(topBar = {
            TopAppBar(title = { Text(moduleName) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }) { padding ->
            Column(Modifier.padding(padding).fillMaxSize(),
                verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🚧", style = MaterialTheme.typography.displayMedium)
                Spacer(Modifier.height(12.dp))
                Text(moduleName, style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(8.dp))
                Text("Native implementation coming soon.", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }}
}
`,

};

export const ANDROID_STARTER_META = {
  packageId: PKG,
  supabaseUrl: SUPABASE_URL,
  supabaseProjectRef: "udpldrrpebdyuiqdtqnq",
  edgeFunctionWired: "chat-with-ai",
  persistentSession: true,
  tablesWired: [
    "profiles",
    "chat_messages",
    "livestock_animals",
    "livestock_scan_logs",
    "idea_planner_ideas",
    "events",
    "user_notifications",
    "user_subscriptions",
    "user_roles (via has_role RPC)",
    "admin_audit_logs",
    "secrets_vault",
    "build_runs",
    "chrome_extensions",
    "roku_channels",
    "ui_blueprints",
    "tech_library",
    "ideas",
    "user_settings",
  ],
};
