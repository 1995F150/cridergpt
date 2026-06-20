package com.cridergpt.android.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cridergpt.android.data.SupabaseHttp
import com.cridergpt.android.models.CGEvent
import com.google.gson.JsonParser
import kotlinx.coroutines.launch

class EventsViewModel : ViewModel() {

    private val _events = MutableLiveData<List<CGEvent>>(emptyList())
    val events: LiveData<List<CGEvent>> = _events

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val raw = SupabaseHttp.restGet(
                    table = "events",
                    query = "select=*&order=date.asc"
                )
                val arr = JsonParser.parseString(raw).asJsonArray
                val list = arr.map { el ->
                    val o = el.asJsonObject
                    fun s(k: String) = o.get(k)?.takeUnless { it.isJsonNull }?.asString
                    CGEvent(
                        id = s("id") ?: "",
                        title = s("title") ?: "(untitled)",
                        description = s("description"),
                        date = s("date") ?: s("event_date") ?: "",
                        time = s("time"),
                        visibility = s("visibility") ?: "personal",
                        userId = s("user_id")
                    )
                }
                _events.value = list
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load events"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
