package com.cridergpt.android.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cridergpt.android.data.SupabaseClient
import com.cridergpt.android.models.Animal
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch

class LivestockViewModel : ViewModel() {

    private val supabase = SupabaseClient.client

    private val _animals = MutableLiveData<List<Animal>>()
    val animals: LiveData<List<Animal>> = _animals

    private val _selectedAnimal = MutableLiveData<Animal?>()
    val selectedAnimal: LiveData<Animal?> = _selectedAnimal

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _speciesFilter = MutableLiveData("all")
    val speciesFilter: LiveData<String> = _speciesFilter

    fun loadAnimals(userId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val result = supabase.postgrest["animals"]
                    .select {
                        filter {
                            eq("user_id", userId)
                        }
                    }

                // Note: This would need proper mapping based on your table structure
                // For now, using placeholder
                _animals.value = emptyList()
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun selectAnimal(animal: Animal) {
        _selectedAnimal.value = animal
    }

    fun clearSelection() {
        _selectedAnimal.value = null
    }

    fun setSpeciesFilter(filter: String) {
        _speciesFilter.value = filter
    }

    fun getFilteredAnimals(): LiveData<List<Animal>> {
        return androidx.lifecycle.MediatorLiveData<List<Animal>>().apply {
            addSource(animals) { animals ->
                addSource(speciesFilter) { filter ->
                    value = if (filter == "all") {
                        animals
                    } else {
                        animals.filter { it.species == filter }
                    }
                }
            }
        }
    }

    fun getSpeciesCounts(): Map<String, Int> {
        return animals.value?.groupBy { it.species }?.mapValues { it.value.size } ?: emptyMap()
    }

    fun scanTag(tagId: String) {
        // TODO: Implement tag scanning logic
        // This would call the Supabase function for tag scanning
    }

    fun addAnimal(animal: Animal) {
        viewModelScope.launch {
            try {
                // TODO: Implement add animal logic
                val currentList = _animals.value.orEmpty()
                _animals.value = currentList + animal
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
}