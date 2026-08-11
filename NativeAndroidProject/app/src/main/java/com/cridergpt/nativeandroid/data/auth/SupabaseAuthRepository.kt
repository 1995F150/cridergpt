package com.cridergpt.nativeandroid.data.auth

import com.cridergpt.nativeandroid.data.supabase.SupabaseProvider
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.gotrue.providers.builtin.IDToken
import io.github.jan.supabase.gotrue.user.UserSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Native auth repository backed by Supabase GoTrue.
 */
class SupabaseAuthRepository {
    private val _session = MutableStateFlow<UserSession?>(null)
    val session: StateFlow<UserSession?> = _session

    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated

    suspend fun signInWithEmail(email: String, password: String): Result<Unit> = runCatching {
        SupabaseProvider.client.auth.signInWith(io.github.jan.supabase.gotrue.providers.builtin.Email) {
            this.email = email
            this.password = password
        }
        syncSession()
    }

    /**
     * Native Google sign-in entry for Supabase using an ID token produced by Android Credential Manager.
     */
    suspend fun signInWithGoogleIdToken(idToken: String): Result<Unit> = runCatching {
        SupabaseProvider.client.auth.signInWith(IDToken) {
            provider = Google
            this.idToken = idToken
        }
        syncSession()
    }

    suspend fun signOut(): Result<Unit> = runCatching {
        SupabaseProvider.client.auth.signOut()
        _session.value = null
        _isAuthenticated.value = false
    }

    suspend fun syncSession() {
        val active = SupabaseProvider.client.auth.currentSessionOrNull()
        _session.value = active
        _isAuthenticated.value = active != null
    }
}
