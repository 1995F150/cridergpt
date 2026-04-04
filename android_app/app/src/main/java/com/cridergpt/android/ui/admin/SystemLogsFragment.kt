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

class SystemLogsFragment : Fragment() {

    private val adminViewModel: AdminViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return inflater.inflate(R.layout.fragment_system_logs, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val listView = view.findViewById<ListView>(R.id.logs_list)

        val backButton = view.findViewById<View>(R.id.btn_back_from_logs)
        backButton?.setOnClickListener {
            findNavController().navigateUp()
        }

        val refreshButton = view.findViewById<View>(R.id.btn_refresh_logs)
        refreshButton?.setOnClickListener {
            adminViewModel.loadAuditLogs()
        }

        adminViewModel.auditLogs.observe(viewLifecycleOwner) { logs ->
            val logStrings = logs.map { 
                "${it.action} on ${it.targetType}"
            }
            val adapter = ArrayAdapter(
                requireContext(),
                android.R.layout.simple_list_item_1,
                logStrings
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

        adminViewModel.loadAuditLogs()
    }
}
