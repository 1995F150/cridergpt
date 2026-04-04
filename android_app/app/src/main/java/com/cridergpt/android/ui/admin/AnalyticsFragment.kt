package com.cridergpt.android.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import android.widget.TextView
import com.cridergpt.android.R
import com.cridergpt.android.viewmodels.AdminViewModel

class AnalyticsFragment : Fragment() {

    private val adminViewModel: AdminViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return inflater.inflate(R.layout.fragment_analytics, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val backButton = view.findViewById<View>(R.id.btn_back_from_analytics)
        backButton?.setOnClickListener {
            findNavController().navigateUp()
        }

        val refreshButton = view.findViewById<View>(R.id.btn_refresh_analytics)
        refreshButton?.setOnClickListener {
            // Load analytics data
        }

        val analyticsText = view.findViewById<TextView>(R.id.analytics_text)
        analyticsText?.text = """
            📊 System Analytics
            
            Total Users: Loading...
            Active Subscriptions: Loading...
            Total Messages: Loading...
            System Uptime: 99.9%
            
            Recent Activity:
            • Last 24 hours: Monitoring...
            • Peak Times: Analyzing...
            • User Engagement: Tracking...
        """.trimIndent()

        adminViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            view.findViewById<View>(R.id.loading_progress).isVisible = isLoading
        }
    }
}
