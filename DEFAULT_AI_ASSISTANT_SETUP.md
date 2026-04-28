# Setting CriderGPT as the Default AI Assistant

To make CriderGPT the phone's default AI assistant (the one that opens on long-press of the power/home button or "Hey Google/Siri"-style triggers), the native projects need extra configuration. Lovable cannot edit `android_app/` directly, so apply these manually.

---

## 🤖 Android — Default Digital Assistant

Android exposes the default-assistant slot through a `VoiceInteractionService`. Once installed, the user picks CriderGPT under **Settings → Apps → Default apps → Digital assistant app**.

### 1. `android_app/app/src/main/AndroidManifest.xml`

Add inside `<application>`:

```xml
<!-- Default Assistant Service -->
<service
    android:name=".assistant.CriderAssistantService"
    android:label="CriderGPT Assistant"
    android:permission="android.permission.BIND_VOICE_INTERACTION"
    android:exported="true">
    <meta-data
        android:name="android.voice_interaction"
        android:resource="@xml/assistant_interaction_service" />
    <intent-filter>
        <action android:name="android.service.voice.VoiceInteractionService" />
    </intent-filter>
</service>

<activity
    android:name=".assistant.CriderAssistantSession"
    android:exported="true"
    android:theme="@android:style/Theme.Translucent.NoTitleBar">
    <intent-filter>
        <action android:name="android.intent.action.ASSIST" />
        <action android:name="android.intent.action.VOICE_COMMAND" />
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>
</activity>
```

### 2. `android_app/app/src/main/res/xml/assistant_interaction_service.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<voice-interaction-service
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:sessionService=".assistant.CriderAssistantSession"
    android:recognitionService=".assistant.CriderRecognitionService"
    android:supportsAssist="true"
    android:supportsLaunchVoiceAssistFromKeyguard="true" />
```

### 3. Create the service classes

`android_app/app/src/main/java/com/cridergpt/android/assistant/CriderAssistantService.kt`

```kotlin
package com.cridergpt.android.assistant

import android.service.voice.VoiceInteractionService

class CriderAssistantService : VoiceInteractionService()
```

`CriderAssistantSession.kt` — a translucent activity that launches `MainActivity` straight into the chat tab with mic auto-armed:

```kotlin
package com.cridergpt.android.assistant

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.cridergpt.android.MainActivity

class CriderAssistantSession : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val launch = Intent(this, MainActivity::class.java).apply {
            action = "com.cridergpt.android.ASSIST"
            putExtra("auto_listen", true)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(launch)
        finish()
    }
}
```

### 4. Tell the user how to switch

After they install the new build, they go to:

**Settings → Apps → Default apps → Digital assistant app → CriderGPT**

(Some OEMs hide it under *Assist & voice input*.)

---

## 🍎 iOS — SiriKit Shortcut + "Type to Siri" hand-off

Apple does **not** allow third-party apps to fully replace Siri. The closest experience:

1. **Shortcuts donation** — register an `INIntent` so users can say *"Hey Siri, ask CriderGPT…"*.
2. **App Shortcuts** (iOS 16+) — surface CriderGPT as a top-level voice phrase without any setup.

### 1. Capacitor — install the SiriKit plugin

```bash
npm install @capacitor-community/intents
npx cap sync ios
```

### 2. Create an App Intent (Swift)

`ios/App/App/CriderGPTAppShortcuts.swift`:

```swift
import AppIntents

@available(iOS 16.0, *)
struct AskCriderGPTIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask CriderGPT"
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Question")
    var question: String

    func perform() async throws -> some IntentResult {
        UserDefaults.standard.set(question, forKey: "pending_cridergpt_query")
        return .result()
    }
}

@available(iOS 16.0, *)
struct CriderGPTShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AskCriderGPTIntent(),
            phrases: [
                "Ask \(.applicationName) a question",
                "Talk to \(.applicationName)",
                "Hey \(.applicationName)"
            ],
            shortTitle: "Ask CriderGPT",
            systemImageName: "bubble.left.and.bubble.right.fill"
        )
    }
}
```

### 3. Add the Intents capability in Xcode

Target → **Signing & Capabilities** → **+ Capability** → **Siri**.

### 4. Tell the user how to use it

* **Hey Siri, ask CriderGPT what's the cattle market today** — works automatically once the app is installed (iOS 16+).
* For lock-screen/long-press launch they assign CriderGPT to a **Back Tap** or **Action Button** shortcut in iOS Settings.

---

## ⚠️ Apple Policy Note

Apple App Store will reject apps that claim to *replace* Siri or that advertise themselves as "the default iOS assistant." Always describe CriderGPT as a "voice-enabled assistant you can launch with Siri." App Shortcuts is the supported, App-Store-safe path.
