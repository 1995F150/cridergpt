package com.cridergpt.nativeandroid.data.supabase

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest

/**
 * Native Supabase client wiring requested by user.
 */
object SupabaseProvider {
    val client = createSupabaseClient(
        supabaseUrl = "https://udpldrrpebdyuiqdtqnq.supabase.co",
        supabaseKey = "sb_publishable_jK0QrNtV6HytstYsr5HRsA_E7B3PLKL"
    ) {
        install(Postgrest)
    }
}
