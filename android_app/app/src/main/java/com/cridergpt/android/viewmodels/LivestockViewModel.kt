package com.cridergpt.android.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cridergpt.android.data.SupabaseHttp
import com.cridergpt.android.data.TagIdParser
import com.cridergpt.android.models.Animal
import com.google.gson.JsonParser
import kotlinx.coroutines.launch

class LivestockViewModel : ViewModel() {

    private val _animals = MutableLiveData<List<Animal>>(emptyList())
    val animals: LiveData<List<Animal>> = _animals

    private val _selectedAnimal = MutableLiveData<Animal?>()
    val selectedAnimal: LiveData<Animal?> = _selectedAnimal

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _scanResult = MutableLiveData<String?>()
    val scanResult: LiveData<String?> = _scanResult

    private val _speciesFilter = MutableLiveData("all")
    val speciesFilter: LiveData<String> = _speciesFilter

    fun loadAnimals(userId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val raw = SupabaseHttp.restGet(
                    table = "livestock_animals",
                    query = "select=*&user_id=eq.$userId&order=created_at.desc"
                )
                val arr = JsonParser.parseString(raw).asJsonArray
                _animals.value = arr.map { el ->
                    val o = el.asJsonObject
                    fun s(k: String) = o.get(k)?.takeUnless { it.isJsonNull }?.asString
                    fun d(k: String) = o.get(k)?.takeUnless { it.isJsonNull }?.asDouble
                    Animal(
                        id = s("id") ?: "",
                        tagId = s("tag_id") ?: "",
                        name = s("name") ?: "(unnamed)",
                        species = s("species") ?: "unknown",
                        breed = s("breed"),
                        birthDate = s("birth_date"),
                        weight = d("weight"),
                        status = s("status") ?: "active",
                        userId = s("user_id") ?: userId
                    )
                }
            } catch (e: Exception) {
                _scanResult.value = "Load failed: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun selectAnimal(animal: Animal) { _selectedAnimal.value = animal }
    fun clearSelection() { _selectedAnimal.value = null }
    fun setSpeciesFilter(filter: String) { _speciesFilter.value = filter }

    fun getSpeciesCounts(): Map<String, Int> =
        animals.value?.groupBy { it.species }?.mapValues { it.value.size } ?: emptyMap()

    /** Scan a tag and resolve via the tag-lookup edge function. */
    fun scanTag(rawTag: String) {
        val tag = TagIdParser.normalize(rawTag)
        if (tag == null) {
            _scanResult.value = "Invalid tag format"
            return
        }
        viewModelScope.launch {
            try {
                val body = SupabaseHttp.invokeFunction("tag-lookup", mapOf("tag_id" to tag))
                _scanResult.value = body
            } catch (e: Exception) {
                _scanResult.value = "Scan failed: ${e.message}"
            }
        }
    }

    fun addAnimal(animal: Animal) {
        val currentList = _animals.value.orEmpty()
        _animals.value = currentList + animal
    }
}