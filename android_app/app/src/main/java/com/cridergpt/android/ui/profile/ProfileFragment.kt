package com.cridergpt.android.ui.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.cridergpt.android.databinding.FragmentProfileBinding
import com.cridergpt.android.viewmodels.AuthViewModel

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    private val authViewModel: AuthViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        authViewModel.user.observe(viewLifecycleOwner) { user ->
            if (user != null) {
                binding.textUserEmail.text = user.email ?: "No email"
                binding.textUserName.text = user.userMetadata?.get("full_name") as? String ?: "User"
            }
        }

        binding.buttonSignOut.setOnClickListener {
            authViewModel.signOut()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}