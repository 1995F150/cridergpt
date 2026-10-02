package com.cridergpt.nativeandroid.data.todo

import com.cridergpt.nativeandroid.data.supabase.SupabaseProvider
import io.github.jan.supabase.postgrest.decodeList
import io.github.jan.supabase.postgrest.from

/**
 * Postgrest-backed todo query example from requested framework snippet.
 */
class TodoRepository {
    suspend fun getTodos(): List<TodoItem> {
        return SupabaseProvider.client
            .from("todos")
            .select()
            .decodeList<TodoItem>()
    }
}
