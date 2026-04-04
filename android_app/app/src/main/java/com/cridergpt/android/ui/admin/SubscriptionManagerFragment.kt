package com.cridergpt.android.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import android.widget.ArrayAdapter
import android.widget.ListView
import com.cridergpt.android.R
import com.cridergpt.android.viewmodels.AdminViewModel

class SubscriptionManagerFragment : Fragment() {

    private val adminViewModel: AdminViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return inflater.inflate(R.layout.fragment_subscription_manager, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val listView = view.findViewById<ListView>(R.id.subscription_list)

        val backButton = view.findViewById<View>(R.id.btn_back_from_subscriptions)
        backButton?.setOnClickListener {
            findNavController().navigateUp()
        }

        val refreshButton = view.findViewById<View>(R.id.btn_refresh_subscriptions)
        refreshButton?.setOnClickListener {
            adminViewModel.loadSubscriptions()
        }

        adminViewModel.subscriptions.observe(viewLifecycleOwner) { subscriptions ->
            val subscriptionStrings = subscriptions.map { 
                "${it.email} - ${it.plan} (${it.tokensUsed}/${it.limit})"
            }
            val adapter = ArrayAdapter(
                requireContext(),
                android.R.layout.simple_list_item_1,
                subscriptionStrings
            )
            listView.adapter = adapter
        }

        adminViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            view.findViewById<View>(R.id.loading_progress).isVisible = isLoading
        }

        adminViewModel.errorMessage.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(requireContext(), it, Toast.LENGTH_LONG).show()
                adminViewModel.clearError()
            }
        }

        adminViewModel.loadSubscriptions()
    }
}
