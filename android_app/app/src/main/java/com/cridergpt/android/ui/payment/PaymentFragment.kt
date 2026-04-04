package com.cridergpt.android.ui.payment

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.cridergpt.android.R
import com.cridergpt.android.databinding.FragmentPaymentBinding
import com.cridergpt.android.viewmodels.PaymentViewModel
import com.stripe.android.PaymentConfiguration

class PaymentFragment : Fragment() {

    private var _binding: FragmentPaymentBinding? = null
    private val binding get() = _binding!!
    private val paymentViewModel: PaymentViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPaymentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Initialize Stripe with live publishable key
        val publishableKey = "pk_live_51RekRVP90uC07RqGYRkKlmLsiLZmARTDDeIs2vXZrgR1tbwTJJhS9MZoId5LmW7r3b1AQPeXinndKlmNFn4YgUvo00LSihA1B5"
        paymentViewModel.initializeStripe(publishableKey)

        setupObservers()
        setupClickListeners()
        paymentViewModel.loadSubscriptionStatus()
    }

    private fun setupObservers() {
        paymentViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.buttonManageSubscription.isEnabled = !isLoading
            binding.buttonUpgradePlan.isEnabled = !isLoading
            binding.buttonCancelSubscription.isEnabled = !isLoading
        }

        paymentViewModel.subscriptionStatus.observe(viewLifecycleOwner) { status ->
            updateSubscriptionUI(status)
        }

        paymentViewModel.paymentError.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(requireContext(), it, Toast.LENGTH_LONG).show()
                paymentViewModel.clearError()
            }
        }

        paymentViewModel.paymentState.observe(viewLifecycleOwner) { state ->
            when (state) {
                is PaymentViewModel.PaymentState.PortalURLReady -> {
                    // Open Stripe Customer Portal
                    openURL(state.url)
                }
                is PaymentViewModel.PaymentState.PaymentIntentCreated -> {
                    // Handle payment sheet presentation
                    showPaymentSheet(state.clientSecret)
                }
                is PaymentViewModel.PaymentState.SubscriptionCanceled -> {
                    Toast.makeText(requireContext(), "Subscription canceled", Toast.LENGTH_SHORT).show()
                }
                else -> {} // Handle other states as needed
            }
        }
    }

    private fun setupClickListeners() {
        binding.buttonUpgradePlan.setOnClickListener {
            // Upgrade plan - opens payment sheet
            paymentViewModel.createPaymentIntent("premium_monthly", 999) // $9.99
        }

        binding.buttonManageSubscription.setOnClickListener {
            // Open Stripe Customer Portal
            paymentViewModel.openCustomerPortal()
        }

        binding.buttonCancelSubscription.setOnClickListener {
            // Cancel subscription
            paymentViewModel.cancelSubscription()
        }
    }

    private fun updateSubscriptionUI(status: String?) {
        when (status) {
            "active" -> {
                binding.subscriptionStatusText.text = "Premium Subscriber"
                binding.subscriptionStatusText.setTextColor(requireContext().getColor(R.color.green_500))
                binding.buttonUpgradePlan.text = "Upgrade Plan"
                binding.buttonManageSubscription.visibility = View.VISIBLE
                binding.buttonCancelSubscription.visibility = View.VISIBLE
            }
            "canceled" -> {
                binding.subscriptionStatusText.text = "Subscription Canceled"
                binding.subscriptionStatusText.setTextColor(requireContext().getColor(R.color.red_500))
                binding.buttonUpgradePlan.text = "Resubscribe"
                binding.buttonManageSubscription.visibility = View.GONE
                binding.buttonCancelSubscription.visibility = View.GONE
            }
            "past_due" -> {
                binding.subscriptionStatusText.text = "Payment Failed"
                binding.subscriptionStatusText.setTextColor(requireContext().getColor(R.color.orange_500))
                binding.buttonManageSubscription.text = "Update Payment Method"
                binding.buttonManageSubscription.visibility = View.VISIBLE
            }
            else -> {
                binding.subscriptionStatusText.text = "Free Plan"
                binding.subscriptionStatusText.setTextColor(requireContext().getColor(R.color.grey_500))
                binding.buttonUpgradePlan.text = "Upgrade to Premium"
                binding.buttonManageSubscription.visibility = View.GONE
                binding.buttonCancelSubscription.visibility = View.GONE
            }
        }
    }

    private fun openURL(url: String) {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse(url)
        }
        startActivity(intent)
    }

    private fun showPaymentSheet(clientSecret: String) {
        // Implementation will depend on Stripe Payment Sheet library
        // This is a placeholder for the payment sheet integration
        Toast.makeText(requireContext(), "Payment sheet ready: $clientSecret", Toast.LENGTH_SHORT).show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
