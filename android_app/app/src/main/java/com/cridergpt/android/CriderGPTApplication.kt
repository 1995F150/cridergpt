package com.cridergpt.android

import android.app.Application
import com.cridergpt.android.data.SupabaseClient

class CriderGPTApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize Supabase client
        SupabaseClient.client
    }
}