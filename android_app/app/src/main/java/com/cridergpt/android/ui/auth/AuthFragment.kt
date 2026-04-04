package com.cridergpt.android.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.cridergpt.android.databinding.FragmentAuthBinding
import com.cridergpt.android.viewmodels.AuthViewModel
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException

class AuthFragment : Fragment() {

    private var _binding: FragmentAuthBinding? = null
    private val binding get() = _binding!!
    private val authViewModel: AuthViewModel by viewModels()

    private lateinit var googleSignInClient: GoogleSignInClient
    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            val data: Intent? = result.data
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            try {
                val account = task.getResult(ApiException::class.java)
                account.idToken?.let {
                    authViewModel.signInWithGoogle(it)
                }
            } catch (e: ApiException) {
                Toast.makeText(requireContext(), "Google sign-in failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAuthBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Initialize Google Sign-In
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken("117996162498-3k9k9kdpt6elh5mdtd4sjqb2v22h4b89.apps.googleusercontent.com")
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(requireContext(), gso)

        // Email/Password Sign-In
        binding.buttonSignIn.setOnClickListener {
            val email = binding.editEmail.text.toString()
            val password = binding.editPassword.text.toString()
            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(requireContext(), "Please enter email and password", Toast.LENGTH_SHORT).show()
            } else {
                authViewModel.signIn(email, password)
            }
        }

        // Sign-Up Button
        binding.buttonSignUp.setOnClickListener {
            val email = binding.editEmail.text.toString()
            val password = binding.editPassword.text.toString()
            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(requireContext(), "Please enter email and password", Toast.LENGTH_SHORT).show()
            } else {
                authViewModel.signUp(email, password)
            }
        }

        // Google Sign-In
        binding.buttonGoogleSignIn.setOnClickListener {
            val signInIntent = googleSignInClient.signInIntent
            googleSignInLauncher.launch(signInIntent)
        }

        // GitHub Sign-In
        binding.buttonGitHubSignIn.setOnClickListener {
            authViewModel.signInWithGitHub()
        }

        // Twitter Sign-In
        binding.buttonTwitterSignIn.setOnClickListener {
            authViewModel.signInWithTwitter()
        }

        // Snapchat Sign-In
        binding.buttonSnapchatSignIn.setOnClickListener {
            authViewModel.signInWithSnapchat()
        }

        // Spotify Sign-In
        binding.buttonSpotifySignIn.setOnClickListener {
            authViewModel.signInWithSpotify()
        }

        // Observe loading state
        authViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.buttonSignIn.isEnabled = !isLoading
            binding.buttonSignUp.isEnabled = !isLoading
            binding.buttonGoogleSignIn.isEnabled = !isLoading
            binding.buttonGitHubSignIn.isEnabled = !isLoading
            binding.buttonTwitterSignIn.isEnabled = !isLoading
            binding.buttonSnapchatSignIn.isEnabled = !isLoading
            binding.buttonSpotifySignIn.isEnabled = !isLoading
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        // Observe errors
        authViewModel.authError.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(requireContext(), it, Toast.LENGTH_LONG).show()
                authViewModel.clearError()
            }
        }

        // Observe user login state
        authViewModel.user.observe(viewLifecycleOwner) { user ->
            if (user != null) {
                Toast.makeText(requireContext(), "Welcome!", Toast.LENGTH_SHORT).show()
                // Navigate to main app
                // parentFragmentManager.popBackStack()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}