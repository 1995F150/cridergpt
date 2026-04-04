package com.cridergpt.android.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cridergpt.android.data.SupabaseClient
import com.stripe.android.PaymentConfiguration
import com.stripe.android.Stripe
import kotlinx.coroutines.launch

class PaymentViewModel : ViewModel() {

    private val supabase = SupabaseClient.client
    
    private val _paymentState = MutableLiveData<PaymentState>()
    val paymentState: LiveData<PaymentState> = _paymentState

    private val _subscriptionStatus = MutableLiveData<String?>()
    val subscriptionStatus: LiveData<String?> = _subscriptionStatus

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _paymentError = MutableLiveData<String?>()
    val paymentError: LiveData<String?> = _paymentError

    // Stripe configuration
    private var stripe: Stripe? = null

    // Temporary note: Using Stripe until June 2026, then migrate to Play Billing
    init {
        loadSubscriptionStatus()
    }

    fun initializeStripe(publishableKey: String) {
        PaymentConfiguration.init(publishableKey)
        stripe = Stripe(publishableKey = publishableKey)
    }

    fun loadSubscriptionStatus() {
        viewModelScope.launch {
            _isLoading.value = true
            _paymentError.value = null
            try {
                val session = supabase.auth.currentSession
                if (session != null) {
                    // Query subscription status from profiles table
                    val profiles = supabase.postgrest["profiles"]
                        .select()
                        .decodeList<ProfileData>()
                    
                    val subscription = profiles.firstOrNull()?.subscription_status ?: "free"
                    _subscriptionStatus.value = subscription
                    _paymentState.value = when (subscription) {
                        "active" -> PaymentState.SubscriptionActive
                        "canceled" -> PaymentState.SubscriptionCanceled
                        "past_due" -> PaymentState.PaymentFailed
                        else -> PaymentState.NoSubscription
                    }
                } else {
                    _paymentError.value = "Not authenticated"
                    _paymentState.value = PaymentState.NotAuthenticated
                }
            } catch (e: Exception) {
                _paymentError.value = e.message ?: "Failed to load subscription"
                _paymentState.value = PaymentState.Error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun createPaymentIntent(planId: String, amount: Int) {
        viewModelScope.launch {
            _isLoading.value = true
            _paymentError.value = null
            try {
                val session = supabase.auth.currentSession
                if (session == null) {
                    _paymentError.value = "Not authenticated"
                    _paymentState.value = PaymentState.NotAuthenticated
                    return@launch
                }

                // Call edge function to create payment intent with Stripe
                val response = supabase.functions.invoke(
                    "create-payment-intent",
                    mapOf(
                        "planId" to planId,
                        "amount" to amount
                    )
                )

                _paymentState.value = PaymentState.PaymentIntentCreated(
                    clientSecret = response.toString()
                )
            } catch (e: Exception) {
                _paymentError.value = e.message ?: "Failed to create payment intent"
                _paymentState.value = PaymentState.Error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun openCustomerPortal() {
        viewModelScope.launch {
            _isLoading.value = true
            _paymentError.value = null
            try {
                val session = supabase.auth.currentSession
                if (session == null) {
                    _paymentError.value = "Not authenticated"
                    _paymentState.value = PaymentState.NotAuthenticated
                    return@launch
                }

                // Call edge function to get customer portal URL
                val response = supabase.functions.invoke(
                    "customer-portal",
                    emptyMap()
                )

                val portalUrl = response.toString()
                _paymentState.value = PaymentState.PortalURLReady(portalUrl)
            } catch (e: Exception) {
                _paymentError.value = e.message ?: "Failed to open customer portal"
                _paymentState.value = PaymentState.Error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun cancelSubscription() {
        viewModelScope.launch {
            _isLoading.value = true
            _paymentError.value = null
            try {
                val session = supabase.auth.currentSession
                if (session == null) {
                    _paymentError.value = "Not authenticated"
                    return@launch
                }

                // Call edge function to cancel subscription
                supabase.functions.invoke(
                    "cancel-subscription",
                    emptyMap()
                )

                _subscriptionStatus.value = "canceled"
                _paymentState.value = PaymentState.SubscriptionCanceled
            } catch (e: Exception) {
                _paymentError.value = e.message ?: "Failed to cancel subscription"
                _paymentState.value = PaymentState.Error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearError() {
        _paymentError.value = null
    }

    sealed class PaymentState {
        object NotAuthenticated : PaymentState()
        object NoSubscription : PaymentState()
        object SubscriptionActive : PaymentState()
        object SubscriptionCanceled : PaymentState()
        object PaymentFailed : PaymentState()
        data class PaymentIntentCreated(val clientSecret: String) : PaymentState()
        data class PortalURLReady(val url: String) : PaymentState()
        object Error : PaymentState()
    }

    data class ProfileData(
        val id: String,
        val stripe_customer_id: String? = null,
        val subscription_status: String? = null
    )
}
