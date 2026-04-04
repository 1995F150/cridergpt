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
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.widget.ArrayAdapter
import android.widget.ListView
import com.cridergpt.android.R
import com.cridergpt.android.viewmodels.AdminViewModel

class UserManagementFragment : Fragment() {

    private val adminViewModel: AdminViewModel by viewModels()
    private lateinit var listView: ListView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return inflater.inflate(R.layout.fragment_user_management, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        listView = view.findViewById(R.id.user_list)

        val backButton = view.findViewById<View>(R.id.btn_back_from_users)
        backButton?.setOnClickListener {
            findNavController().navigateUp()
        }

        val refreshButton = view.findViewById<View>(R.id.btn_refresh_users)
        refreshButton?.setOnClickListener {
            adminViewModel.loadAdminUsers()
        }

        adminViewModel.adminUsers.observe(viewLifecycleOwner) { users ->
            val userStrings = users.map { "${it.email} (${it.role})" }
            val adapter = ArrayAdapter(
                requireContext(),
                android.R.layout.simple_list_item_1,
                userStrings
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

        adminViewModel.loadAdminUsers()
    }
}
