package com.cridergpt.android.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cridergpt.android.data.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch

data class AdminUser(
    val id: String,
    val email: String,
    val role: String,
    val createdAt: String
)

data class UserSubscription(
    val userId: String,
    val email: String,
    val plan: String,
    val tokensUsed: Int,
    val limit: Int
)

data class AuditLog(
    val id: String,
    val adminId: String,
    val action: String,
    val targetType: String,
    val details: String,
    val createdAt: String
)

data class UserReport(
    val id: String,
    val reporterEmail: String,
    val reportType: String,
    val description: String,
    val status: String,
    val createdAt: String
)

class AdminViewModel : ViewModel() {

    private val supabase = SupabaseClient.client

    private val _isAdmin = MutableLiveData<Boolean>()
    val isAdmin: LiveData<Boolean> = _isAdmin

    private val _adminUsers = MutableLiveData<List<AdminUser>>()
    val adminUsers: LiveData<List<AdminUser>> = _adminUsers

    private val _subscriptions = MutableLiveData<List<UserSubscription>>()
    val subscriptions: LiveData<List<UserSubscription>> = _subscriptions

    private val _auditLogs = MutableLiveData<List<AuditLog>>()
    val auditLogs: LiveData<List<AuditLog>> = _auditLogs

    private val _userReports = MutableLiveData<List<UserReport>>()
    val userReports: LiveData<List<UserReport>> = _userReports

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _errorMessage = MutableLiveData<String?>()
    val errorMessage: LiveData<String?> = _errorMessage

    init {
        checkAdminStatus()
    }

    fun checkAdminStatus() {
        viewModelScope.launch {
            try {
                // Check if user has admin role using the has_role RPC
                val result = supabase.postgrest.rpc("has_role", mapOf("_role" to "admin"))
                _isAdmin.value = result.toString().toBoolean()
            } catch (e: Exception) {
                _isAdmin.value = false
                _errorMessage.value = "Failed to verify admin status: ${e.message}"
            }
        }
    }

    fun loadAdminUsers() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val result = supabase.postgrest["user_roles"]
                    .select {
                        filter {
                            eq("role", "admin")
                        }
                    }

                // For now, returning empty list as we'd need to join with auth.users
                // In a real implementation, you'd call a stored procedure or edge function
                _adminUsers.value = emptyList()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to load admin users: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadSubscriptions() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val result = supabase.postgrest["ai_usage"]
                    .select {
                        limit(100)
                    }

                // Parse and map to UserSubscription (would need actual table structure)
                _subscriptions.value = emptyList()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to load subscriptions: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadAuditLogs() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val result = supabase.postgrest["admin_audit_logs"]
                    .select {
                        order("created_at", ascending = false)
                        limit(50)
                    }

                // Parse results
                _auditLogs.value = emptyList()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to load audit logs: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadUserReports() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val result = supabase.postgrest["user_reports"]
                    .select {
                        filter {
                            eq("status", "pending")
                        }
                        limit(50)
                    }

                // Parse results
                _userReports.value = emptyList()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to load user reports: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateReportStatus(reportId: String, newStatus: String) {
        viewModelScope.launch {
            try {
                supabase.postgrest["user_reports"]
                    .update({
                        set("status", newStatus)
                        set("reviewed_at", "now()")
                    }) {
                        filter {
                            eq("id", reportId)
                        }
                    }
                // Refresh reports
                loadUserReports()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to update report: ${e.message}"
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }
}
