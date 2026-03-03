package com.cridergpt.nativeandroid.data.pricing

import com.cridergpt.nativeandroid.data.supabase.SupabaseProvider
import io.github.jan.supabase.postgrest.decodeList
import io.github.jan.supabase.postgrest.from

class PlanRepository {
    suspend fun getPlans(): List<PlanConfiguration> {
        return SupabaseProvider.client
            .from("plan_configurations")
            .select()
            .decodeList<PlanConfiguration>()
            .sortedBy { it.sort_order }
    }
}
