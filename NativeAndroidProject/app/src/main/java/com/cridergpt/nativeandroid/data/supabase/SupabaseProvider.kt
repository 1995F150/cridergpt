package com.cridergpt.nativeandroid.data.supabase

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest

/**
 * Native Supabase client wiring requested by user.
 */
object SupabaseProvider {
    val client = createSupabaseClient(
        supabaseUrl = SupabaseConfig.URL,
        supabaseKey = SupabaseConfig.PUBLISHABLE_KEY
    ) {
        install(Postgrest)
    }
}
