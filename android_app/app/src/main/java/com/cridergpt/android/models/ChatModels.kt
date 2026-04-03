package com.cridergpt.android.models

data class ChatUser(
    val id: String,
    val displayName: String?,
    val email: String,
    val avatarUrl: String?,
    val status: String = "offline"
)

data class Conversation(
    val id: String,
    val title: String,
    val createdAt: String,
    val updatedAt: String,
    val isArchived: Boolean = false
)

data class ChatMessage(
    val id: String,
    val content: String,
    val role: String, // "user" or "assistant"
    val createdAt: String,
    val userId: String
)

data class Animal(
    val id: String,
    val tagId: String,
    val name: String,
    val species: String,
    val breed: String?,
    val birthDate: String?,
    val weight: Double?,
    val status: String = "active",
    val userId: String
)