package com.cridergpt.android.ui.chat

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.cridergpt.android.databinding.FragmentChatBinding
import com.cridergpt.android.models.Conversation
import com.cridergpt.android.viewmodels.AuthViewModel
import com.cridergpt.android.viewmodels.ChatViewModel

class ChatFragment : Fragment() {

    private var _binding: FragmentChatBinding? = null
    private val binding get() = _binding!!
    private val chatViewModel: ChatViewModel by viewModels()
    private val authViewModel: AuthViewModel by viewModels()

    private lateinit var conversationAdapter: ConversationAdapter

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
}