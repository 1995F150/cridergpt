package com.cridergpt.android.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cridergpt.android.data.SupabaseClient
import io.github.jan.supabase.auth.user.UserInfo
import kotlinx.coroutines.launch

class AuthViewModel : ViewModel() {

    private val auth = SupabaseClient.client.auth
    private val _user = MutableLiveData<UserInfo?>()
    val user: LiveData<UserInfo?> = _user

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _authError = MutableLiveData<String?>()
    val authError: LiveData<String?> = _authError

    init {
        // Observe auth state changes
        viewModelScope.launch {
            auth.sessionStatus.collect { status ->
                _user.value = status
            }
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _authError.value = null
            try {
                auth.signInWithPassword(email, password)
            } catch (e: Exception) {
                _authError.value = e.message ?: "Sign in failed"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signUp(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _authError.value = null
            try {
                auth.signUpWith(email, password)
            } catch (e: Exception) {
                _authError.value = e.message ?: "Sign up failed"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _authError.value = null
            try {
                auth.signInWithIdToken(
                    provider = "google",
                    token = idToken
                )
            } catch (e: Exception) {
                _authError.value = e.message ?: "Google sign-in failed"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signInWithOAuth(provider: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _authError.value = null
            try {
                auth.signInWith(provider)
            } catch (e: Exception) {
                _authError.value = e.message ?: "$provider sign-in failed"
            } finally {
                _isLoading.value = false
            }
        }
    }

    // OAuth Provider Methods
    fun signInWithGitHub() {
        signInWithOAuth("github")
    }

    fun signInWithTwitter() {
        signInWithOAuth("twitter")
    }

    fun signInWithSnapchat() {
        signInWithOAuth("snapchat")
    }

    fun signInWithSpotify() {
        signInWithOAuth("spotify")
    }

    fun signOut() {
        viewModelScope.launch {
            try {
                auth.signOut()
                _authError.value = null
            } catch (e: Exception) {
                _authError.value = e.message ?: "Sign out failed"
            }
        }
    }

    fun clearError() {
        _authError.value = null
    }
}