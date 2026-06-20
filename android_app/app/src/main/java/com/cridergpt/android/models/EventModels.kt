package com.cridergpt.android.models

data class CGEvent(
    val id: String,
    val title: String,
    val description: String?,
    val date: String, // ISO yyyy-MM-dd
    val time: String?,
    val visibility: String, // "personal" | "chapter"
    val userId: String?
)
