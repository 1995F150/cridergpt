package com.cridergpt.nativeandroid.data.supabase

/**
 * Centralized Supabase configuration for the native Android module.
 *
 * Keep these values in one place so they can be replaced with build config or secure storage later
 * without touching feature code.
 */
object SupabaseConfig {
    const val URL = "https://udpldrrpebdyuiqdtqnq.supabase.co"
    const val PUBLISHABLE_KEY = "sb_publishable_jK0QrNtV6HytstYsr5HRsA_E7B3PLKL"
    const val CHAT_WITH_AI_PATH = "/functions/v1/chat-with-ai"
}
