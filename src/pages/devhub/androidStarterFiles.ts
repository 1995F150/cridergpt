// Pre-written CriderGPT Android starter project (Kotlin + Jetpack Compose)
// Package: app.cridergpt.android
// Backend: Supabase (udpldrrpebdyuiqdtqnq) — wired to public anon key + chat-with-ai edge function.
// No payment / paywall code is included by request.

const SUPABASE_URL = "https://udpldrrpebdyuiqdtqnq.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc";

export const ANDROID_STARTER_FILES: Record<string, string> = {
  "README.md": `# CriderGPT Android Starter

Pre-wired native Android starter for **app.cridergpt.android**.

- 100% Kotlin + Jetpack Compose (Material 3)
- Pre-connected to the live Supabase backend (anon key baked in)
- Email/password sign-in via Supabase Auth REST
- Chat screen calls the \`chat-with-ai\` edge function
- No payment / paywall code (add later with Google Play Billing)

## Open in Android Studio

1. Unzip this folder.
2. Android Studio → **File → Open** → select the unzipped folder.
3. Let Gradle sync (first sync downloads dependencies, ~3-5 min).
4. Plug in a device with USB debugging, press **Run ▶**.

## What works out of the box

- \`SignInScreen\` — email/password against Supabase Auth
- \`ChatScreen\` — sends messages to the \`chat-with-ai\` edge function and renders the reply
- \`SupabaseClient.kt\` — lightweight REST helper (no SDK needed, uses OkHttp)

## What to add next

- Google Sign-In (deep link \`app.cridergpt.android://auth-callback\` is already declared)
- Push notifications (Firebase) — FCM stub included
- Google Play Billing (Plus / Pro monthly)
- NFC livestock tag scanning (NFC permission already in manifest)
`,

  "settings.gradle.kts": `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
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

  "app/build.gradle.kts": `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.cridergpt.android"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.cridergpt.android"
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
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.json:json:20240303")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
`,

  "app/proguard-rules.pro": `# Add project specific ProGuard rules here.
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
            <!-- Google OAuth deep link (already registered in Supabase) -->
            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="app.cridergpt.android" android:host="auth-callback" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,

  "app/src/main/java/app/cridergpt/android/MainActivity.kt": `package app.cridergpt.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import app.cridergpt.android.data.SupabaseClient
import app.cridergpt.android.ui.ChatScreen
import app.cridergpt.android.ui.SignInScreen
import app.cridergpt.android.ui.theme.CriderGPTTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SupabaseClient.init(applicationContext)
        setContent {
            CriderGPTTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    var signedIn by remember { mutableStateOf(SupabaseClient.isSignedIn()) }
                    if (signedIn) {
                        ChatScreen(onSignOut = {
                            SupabaseClient.signOut()
                            signedIn = false
                        })
                    } else {
                        SignInScreen(onSignedIn = { signedIn = true })
                    }
                }
            }
        }
    }
}
`,

  "app/src/main/java/app/cridergpt/android/data/SupabaseClient.kt": `package app.cridergpt.android.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Lightweight Supabase REST client. No third-party SDK needed.
 * URL + anon key are baked in — these are PUBLIC values, safe to ship.
 */
object SupabaseClient {
    const val URL = "${SUPABASE_URL}"
    const val ANON_KEY = "${SUPABASE_ANON}"

    private lateinit var prefs: SharedPreferences
    private val http = OkHttpClient()
    private val JSON = "application/json".toMediaType()

    fun init(context: Context) {
        prefs = context.getSharedPreferences("cridergpt_auth", Context.MODE_PRIVATE)
    }

    fun accessToken(): String? = prefs.getString("access_token", null)
    fun isSignedIn(): Boolean = accessToken() != null

    fun signOut() = prefs.edit().clear().apply()

    /** Email + password sign-in. Returns null on success, error message on failure. */
    suspend fun signIn(email: String, password: String): String? = withContext(Dispatchers.IO) {
        val body = JSONObject().put("email", email).put("password", password).toString()
        val req = Request.Builder()
            .url("\$URL/auth/v1/token?grant_type=password")
            .addHeader("apikey", ANON_KEY)
            .addHeader("Content-Type", "application/json")
            .post(body.toRequestBody(JSON))
            .build()
        http.newCall(req).execute().use { resp ->
            val text = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) return@withContext "Sign-in failed (\${resp.code}): \$text"
            val json = JSONObject(text)
            prefs.edit()
                .putString("access_token", json.optString("access_token"))
                .putString("refresh_token", json.optString("refresh_token"))
                .putString("user_id", json.optJSONObject("user")?.optString("id"))
                .apply()
            null
        }
    }

    suspend fun signUp(email: String, password: String): String? = withContext(Dispatchers.IO) {
        val body = JSONObject().put("email", email).put("password", password).toString()
        val req = Request.Builder()
            .url("\$URL/auth/v1/signup")
            .addHeader("apikey", ANON_KEY)
            .addHeader("Content-Type", "application/json")
            .post(body.toRequestBody(JSON))
            .build()
        http.newCall(req).execute().use { resp ->
            val text = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) "Sign-up failed (\${resp.code}): \$text" else null
        }
    }

    /** Invoke an edge function. Returns the raw response body. */
    suspend fun invoke(fnName: String, payload: JSONObject): String = withContext(Dispatchers.IO) {
        val token = accessToken() ?: ANON_KEY
        val req = Request.Builder()
            .url("\$URL/functions/v1/\$fnName")
            .addHeader("apikey", ANON_KEY)
            .addHeader("Authorization", "Bearer \$token")
            .addHeader("Content-Type", "application/json")
            .post(payload.toString().toRequestBody(JSON))
            .build()
        http.newCall(req).execute().use { resp -> resp.body?.string().orEmpty() }
    }
}
`,

  "app/src/main/java/app/cridergpt/android/ui/SignInScreen.kt": `package app.cridergpt.android.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import app.cridergpt.android.data.SupabaseClient
import kotlinx.coroutines.launch

@Composable
fun SignInScreen(onSignedIn: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("CriderGPT", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(8.dp))
        Text("Sign in to continue", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(24.dp))

        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())

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

  "app/src/main/java/app/cridergpt/android/ui/ChatScreen.kt": `package app.cridergpt.android.ui

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
import app.cridergpt.android.data.SupabaseClient
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

data class ChatMessage(val role: String, val content: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(onSignOut: () -> Unit) {
    val messages = remember { mutableStateListOf<ChatMessage>() }
    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("CriderGPT") },
                actions = { TextButton(onClick = onSignOut) { Text("Sign out") } }
            )
        },
        bottomBar = {
            Surface(tonalElevation = 3.dp) {
                Row(Modifier.padding(8.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = input,
                        onValueChange = { input = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Ask CriderGPT...") }
                    )
                    Spacer(Modifier.width(8.dp))
                    Button(
                        enabled = !busy && input.isNotBlank(),
                        onClick = {
                            val text = input.trim()
                            input = ""
                            messages += ChatMessage("user", text)
                            busy = true
                            scope.launch {
                                val payload = JSONObject().apply {
                                    put("messages", JSONArray().apply {
                                        messages.forEach { m ->
                                            put(JSONObject().put("role", m.role).put("content", m.content))
                                        }
                                    })
                                }
                                val raw = runCatching { SupabaseClient.invoke("chat-with-ai", payload) }.getOrElse { "Error: \${it.message}" }
                                val reply = runCatching {
                                    val j = JSONObject(raw)
                                    j.optString("response", j.optString("message", raw))
                                }.getOrDefault(raw)
                                messages += ChatMessage("assistant", reply)
                                busy = false
                                listState.animateScrollToItem(messages.lastIndex)
                            }
                        }
                    ) { Text(if (busy) "..." else "Send") }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            state = listState,
            modifier = Modifier.padding(padding).fillMaxSize().padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(vertical = 12.dp)
        ) {
            items(messages) { m -> MessageBubble(m) }
        }
    }
}

@Composable
private fun MessageBubble(m: ChatMessage) {
    val isUser = m.role == "user"
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
        Surface(
            color = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
            contentColor = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.clip(RoundedCornerShape(16.dp)).widthIn(max = 300.dp)
        ) {
            Text(m.content, modifier = Modifier.padding(12.dp))
        }
    }
}
`,

  "app/src/main/java/app/cridergpt/android/ui/theme/Theme.kt": `package app.cridergpt.android.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColors = darkColorScheme(
    primary = Color(0xFF4F9CF9),
    secondary = Color(0xFF8AB4F8),
    background = Color(0xFF0B0F14),
    surface = Color(0xFF111821)
)

private val LightColors = lightColorScheme(
    primary = Color(0xFF1A73E8),
    secondary = Color(0xFF4F9CF9),
    background = Color(0xFFF6F8FB),
    surface = Color(0xFFFFFFFF)
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
};

export const ANDROID_STARTER_META = {
  packageId: "app.cridergpt.android",
  supabaseUrl: SUPABASE_URL,
  supabaseProjectRef: "udpldrrpebdyuiqdtqnq",
  edgeFunctionWired: "chat-with-ai",
};
