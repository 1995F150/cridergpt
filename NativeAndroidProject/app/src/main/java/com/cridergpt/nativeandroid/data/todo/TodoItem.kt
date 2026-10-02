package com.cridergpt.nativeandroid.data.todo

import kotlinx.serialization.Serializable

@Serializable
data class TodoItem(
    val id: String,
    val name: String
)
