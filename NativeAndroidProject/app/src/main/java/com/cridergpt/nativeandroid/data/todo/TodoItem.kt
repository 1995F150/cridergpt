package com.cridergpt.nativeandroid.data.todo

import kotlinx.serialization.Serializable

@Serializable
data class TodoItem(
    val id: Int,
    val name: String
)
