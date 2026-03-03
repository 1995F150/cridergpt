package com.cridergpt.nativeandroid.ui.viewmodel

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Converted from React global state/providers to a central Android ViewModel with StateFlow.
 */
class MainViewModel : ViewModel() {
    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline
}
