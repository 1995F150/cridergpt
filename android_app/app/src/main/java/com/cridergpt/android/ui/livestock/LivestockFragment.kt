package com.cridergpt.android.ui.livestock

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.cridergpt.android.databinding.FragmentLivestockBinding
import com.cridergpt.android.viewmodels.AuthViewModel
import com.cridergpt.android.viewmodels.LivestockViewModel
import com.google.android.material.tabs.TabLayout
import kotlinx.coroutines.launch

class LivestockFragment : Fragment() {

    private var _binding: FragmentLivestockBinding? = null
    private val binding get() = _binding!!
    private val livestockViewModel: LivestockViewModel by viewModels()
    private val authViewModel: AuthViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentLivestockBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupTabs()
        observeViewModels()
        loadData()
    }

    private fun setupTabs() {
        binding.tabLayout.apply {
            addTab(newTab().setText("🐄 Herd"))
            addTab(newTab().setText("📡 Scan"))
            addTab(newTab().setText("📊 Stats"))

            addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
                override fun onTabSelected(tab: TabLayout.Tab?) {
                    when (tab?.position) {
                        0 -> showHerdView()
                        1 -> showScanView()
                        2 -> showStatsView()
                    }
                }

                override fun onTabUnselected(tab: TabLayout.Tab?) {}
                override fun onTabReselected(tab: TabLayout.Tab?) {}
            })
        }

        // Show default view
        showHerdView()
    }

    private fun showHerdView() {
        // TODO: Implement herd view with animal list
        binding.containerContent.removeAllViews()

        val herdView = layoutInflater.inflate(
            com.cridergpt.android.R.layout.view_livestock_herd,
            binding.containerContent,
            false
        )
        binding.containerContent.addView(herdView)
    }

    private fun showScanView() {
        // TODO: Implement scan view with camera/tag scanner
        binding.containerContent.removeAllViews()

        val scanView = layoutInflater.inflate(
            com.cridergpt.android.R.layout.view_livestock_scan,
            binding.containerContent,
            false
        )
        binding.containerContent.addView(scanView)
    }

    private fun showStatsView() {
        // TODO: Implement stats view with charts/analytics
        binding.containerContent.removeAllViews()

        val statsView = layoutInflater.inflate(
            com.cridergpt.android.R.layout.view_livestock_stats,
            binding.containerContent,
            false
        )
        binding.containerContent.addView(statsView)
    }

    private fun observeViewModels() {
        livestockViewModel.animals.observe(viewLifecycleOwner) { animals ->
            binding.textAnimalCount.text = "${animals.size} animals registered"
        }

        livestockViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            // TODO: Show loading indicator
        }
    }

    private fun loadData() {
        authViewModel.user.value?.id?.let { userId ->
            livestockViewModel.loadAnimals(userId)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}