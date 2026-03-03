package com.cridergpt.nativeandroid

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.cridergpt.nativeandroid.ui.CriderGptApp
import com.cridergpt.nativeandroid.ui.theme.CriderGptTheme

/**
 * Converted from web entrypoint (src/main.tsx + src/App.tsx): launches the app shell and navigation graph.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CriderGptTheme {
                CriderGptApp()
            }
        }
    }
}
