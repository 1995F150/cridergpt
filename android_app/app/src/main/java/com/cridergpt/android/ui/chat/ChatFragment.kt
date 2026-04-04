package com.cridergpt.android.ui.chat

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.cridergpt.android.databinding.FragmentChatBinding
import com.cridergpt.android.models.Conversation
import com.cridergpt.android.utils.NotificationHelper
import com.cridergpt.android.viewmodels.AuthViewModel
import com.cridergpt.android.viewmodels.ChatViewModel

class ChatFragment : Fragment() {

    private var _binding: FragmentChatBinding? = null
    private val binding get() = _binding!!
    private val chatViewModel: ChatViewModel by viewModels()
    private val authViewModel: AuthViewModel by viewModels()

    private lateinit var conversationAdapter: ConversationAdapter

    private val requestNotificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ ->
        // Permission state handled by the system; notifications will only show if granted.
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentChatBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        setupMessageInput()
        observeViewModels()
        requestNotificationPermissionIfNeeded()
        loadData()
    }

    private fun setupRecyclerView() {
        conversationAdapter = ConversationAdapter { conversation ->
            chatViewModel.selectConversation(conversation.id, authViewModel.user.value?.id ?: "")
        }

        binding.recyclerConversations.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = conversationAdapter
        }
    }

    private fun setupMessageInput() {
        binding.buttonSend.setOnClickListener {
            val message = binding.editMessage.text.toString().trim()
            if (message.isNotEmpty()) {
                val conversationId = chatViewModel.currentConversationId.value
                val userId = authViewModel.user.value?.id
                if (conversationId != null && userId != null) {
                    chatViewModel.sendMessage(message, conversationId, userId)
                    binding.editMessage.text?.clear()
                }
            }
        }
    }

    private fun observeViewModels() {
        chatViewModel.conversations.observe(viewLifecycleOwner) { conversations ->
            conversationAdapter.submitList(conversations)
        }

        chatViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressLoading.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        chatViewModel.currentConversationId.observe(viewLifecycleOwner) { conversationId ->
            // Update UI based on selected conversation
            binding.layoutMessageInput.visibility = if (conversationId != null) View.VISIBLE else View.GONE
        }

        chatViewModel.assistantNotification.observe(viewLifecycleOwner) { notificationMessage ->
            notificationMessage?.let {
                NotificationHelper.sendChatResultNotification(requireContext(), it)
                chatViewModel.clearAssistantNotification()
            }
        }
    }

    private fun loadData() {
        authViewModel.user.value?.id?.let { userId ->
            chatViewModel.loadConversations(userId)
            chatViewModel.loadUsers()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    requireContext(),
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}