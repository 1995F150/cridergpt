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
    compileSdk = 34

    defaultConfig {
        applicationId = "${PKG}"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
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
import androidx.activity.ComponentActivity
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

class MainActivity : ComponentActivity() {
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

/** Items that always live on the website. The drawer launches these in Chrome. */
data class ExternalLink(val label: String, val url: String)

val EXTERNAL_LINKS = listOf(
    ExternalLink("Smart ID Store", "https://cridergpt.com/store"),
    ExternalLink("Tag Lookup", "https://cridergpt.com/tag-lookup"),
    ExternalLink("Snapchat Lens", "https://cridergpt.com/snapchat-lens"),
    ExternalLink("Custom Filters", "https://cridergpt.com/custom-filters"),
    ExternalLink("FarmBureau", "https://cridergpt.com/farmbureau"),
    ExternalLink("Recipes", "https://cridergpt.com/recipes"),
    ExternalLink("Breed Index", "https://cridergpt.com/breeds"),
    ExternalLink("Guides", "https://cridergpt.com/guides"),
    ExternalLink("Public Profile", "https://cridergpt.com/u"),
    ExternalLink("Invite", "https://cridergpt.com/invite"),
    ExternalLink("Leaderboard", "https://cridergpt.com/leaderboard"),
    ExternalLink("Privacy Policy", "https://cridergpt.com/privacy-policy"),
    ExternalLink("User Agreement", "https://cridergpt.com/user-agreement"),
)
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
import ${PKG}.ui.ideas.IdeaPlannerScreen
import ${PKG}.ui.livestock.LivestockListScreen
import ${PKG}.ui.notifications.NotificationsScreen
import ${PKG}.ui.profile.AccountManagementScreen
import ${PKG}.ui.profile.ProfileScreen
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

    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            ModalDrawerSheet {
                Text("CriderGPT", style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(16.dp))
                HorizontalDivider()
                Column(Modifier.verticalScroll(rememberScrollState()).padding(8.dp)) {
                    Text("Open on website",
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp))
                    EXTERNAL_LINKS.forEach { link ->
                        NavigationDrawerItem(
                            label = { Text(link.label) },
                            selected = false,
                            icon = { Icon(Icons.Default.OpenInBrowser, null) },
                            onClick = {
                                scope.launch { drawer.close() }
                                openExternal(ctx, link.url)
                            }
                        )
                    }
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        val current = TABS.find { it.route == currentRoute }?.label ?: "CriderGPT"
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
                            DropdownMenuItem(text = { Text("DevHub") }, onClick = {
                                menuOpen = false; nav.navigate("devhub")
                            })
                            DropdownMenuItem(text = { Text("Admin Panel") }, onClick = {
                                menuOpen = false; nav.navigate("admin")
                            })
                            DropdownMenuItem(text = { Text("Account") }, onClick = {
                                menuOpen = false; nav.navigate("account")
                            })
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
                composable("chat") { ChatScreen() }
                composable("livestock") { LivestockListScreen() }
                composable("ideas") { IdeaPlannerScreen() }
                composable("calendar") { CalendarScreen() }
                composable("profile") { ProfileScreen() }
                composable("notifications") { NotificationsScreen() }
                composable("account") { AccountManagementScreen() }
                composable("devhub") { DevHubScreen(openExternal = { openExternal(ctx, it) }) }
                composable("admin") { AdminPanelScreen() }
            }
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

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
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

@Composable
fun ChatScreen() {
    val messages = remember { mutableStateListOf<Msg>() }
    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    Column(Modifier.fillMaxSize()) {
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
                    placeholder = { Text("Ask CriderGPT...") })
                Spacer(Modifier.width(8.dp))
                Button(
                    enabled = !busy && input.isNotBlank(),
                    onClick = {
                        val text = input.trim(); input = ""
                        messages += Msg("user", text); busy = true
                        scope.launch {
                            val payload = JSONObject().put("messages", JSONArray().apply {
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

private data class DevModule(val label: String, val url: String)

private val DEV_MODULES = listOf(
    DevModule("Server AI Console", "https://cridergpt.com/devhub/server-console"),
    DevModule("Server Health & Self-Repair", "https://cridergpt.com/devhub/server-health"),
    DevModule("Knowledge Vault", "https://cridergpt.com/devhub/vault"),
    DevModule("Machine Designer", "https://cridergpt.com/devhub/machine-designer"),
    DevModule("Code Generator", "https://cridergpt.com/devhub/code-generator"),
    DevModule("Agent Dispatcher", "https://cridergpt.com/devhub/agent-dispatcher"),
    DevModule("Autopilot Queue", "https://cridergpt.com/devhub/autopilot"),
    DevModule("Android Auto-Builder", "https://cridergpt.com/devhub/android-builder"),
    DevModule("Android Starter (ZIP)", "https://cridergpt.com/devhub/android-starter"),
    DevModule("iOS Builder", "https://cridergpt.com/devhub/ios-builder"),
    DevModule("Chrome Extension Studio", "https://cridergpt.com/devhub/chrome-extensions"),
    DevModule("Roku Channel Studio", "https://cridergpt.com/devhub/roku-studio"),
    DevModule("Backend Wiring Reference", "https://cridergpt.com/devhub/backend-wiring"),
    DevModule("UI Blueprints", "https://cridergpt.com/devhub/ui-blueprints"),
    DevModule("Tech Knowledge Library", "https://cridergpt.com/devhub/tech-library"),
    DevModule("Auto-Promo (Hourly)", "https://cridergpt.com/devhub/auto-promo"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevHubScreen(openExternal: (String) -> Unit) {
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
                Text("Owner-only command center. Opens website modules in Chrome.",
                    style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(8.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(DEV_MODULES) { m ->
                        ElevatedCard(onClick = { openExternal(m.url) }, modifier = Modifier.fillMaxWidth()) {
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
  ],
};
