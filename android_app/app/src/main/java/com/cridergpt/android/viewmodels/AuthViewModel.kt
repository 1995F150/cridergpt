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
            try {
                auth.signInWithPassword(email, password)
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            auth.signOut()
        }
    }
}