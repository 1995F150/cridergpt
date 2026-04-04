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
import com.cridergpt.android.databinding.FragmentAdminBinding
import com.cridergpt.android.viewmodels.AdminViewModel

class AdminFragment : Fragment() {

    private var _binding: FragmentAdminBinding? = null
    private val binding get() = _binding!!
    private val adminViewModel: AdminViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAdminBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        observeViewModel()
        setupClickListeners()
    }

    private fun observeViewModel() {
        adminViewModel.isAdmin.observe(viewLifecycleOwner) { isAdmin ->
            if (!isAdmin) {
                showAccessDenied()
            } else {
                binding.adminAccessDeniedLayout.isVisible = false
                binding.adminContentLayout.isVisible = true
            }
        }

        adminViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.adminLoadingProgress.isVisible = isLoading
        }

        adminViewModel.errorMessage.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(requireContext(), it, Toast.LENGTH_LONG).show()
                adminViewModel.clearError()
            }
        }
    }

    private fun setupClickListeners() {
        // User Management
        binding.btnUserManagement.setOnClickListener {
            navigateToUserManagement()
        }

        // Subscription Manager
        binding.btnSubscriptionManager.setOnClickListener {
            navigateToSubscriptionManager()
        }

        // Content Moderation
        binding.btnContentModeration.setOnClickListener {
            navigateToContentModeration()
        }

        // System Logs
        binding.btnSystemLogs.setOnClickListener {
            navigateToSystemLogs()
        }

        // Analytics
        binding.btnAnalytics.setOnClickListener {
            navigateToAnalytics()
        }

        // Refresh button
        binding.btnRefreshAdmin.setOnClickListener {
            adminViewModel.checkAdminStatus()
        }
    }

    private fun navigateToUserManagement() {
        try {
            findNavController().navigate(
                AdminFragmentDirections.actionAdminToUserManagement()
            )
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Navigation not configured yet", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToSubscriptionManager() {
        try {
            findNavController().navigate(
                AdminFragmentDirections.actionAdminToSubscriptionManager()
            )
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Navigation not configured yet", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToContentModeration() {
        try {
            findNavController().navigate(
                AdminFragmentDirections.actionAdminToContentModeration()
            )
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Navigation not configured yet", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToSystemLogs() {
        try {
            findNavController().navigate(
                AdminFragmentDirections.actionAdminToSystemLogs()
            )
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Navigation not configured yet", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToAnalytics() {
        try {
            findNavController().navigate(
                AdminFragmentDirections.actionAdminToAnalytics()
            )
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Navigation not configured yet", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showAccessDenied() {
        binding.adminAccessDeniedLayout.isVisible = true
        binding.adminContentLayout.isVisible = false
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
