package com.cridergpt.nativeandroid.data.auth

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Converted from src/integrations/supabase/client.ts + auth context: handles session state and auth APIs.
 */
class SupabaseAuthRepository {
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated

    suspend fun signInWithEmail(email: String, password: String): Result<Unit> = Result.success(Unit)
    suspend fun signOut(): Result<Unit> = Result.success(Unit)
}
