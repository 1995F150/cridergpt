package com.cridergpt.android.ui.smartid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.cridergpt.android.data.SupabaseHttp
import com.cridergpt.android.data.TagIdParser
import com.cridergpt.android.databinding.FragmentSmartIdBinding
import com.google.gson.JsonParser
import kotlinx.coroutines.launch

class SmartIdFragment : Fragment() {

    private var _binding: FragmentSmartIdBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSmartIdBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.buttonLookup.setOnClickListener { performLookup() }
    }

    private fun performLookup() {
        val typed = binding.inputTagId.text?.toString().orEmpty()
        val normalized = TagIdParser.normalize(typed)
        if (normalized == null) {
            binding.textResult.text = "Invalid tag. Expected format: CriderGPT-XXXXXX"
            return
        }

        binding.progressLookup.visibility = View.VISIBLE
        binding.textResult.text = ""
        binding.buttonLookup.isEnabled = false

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val raw = SupabaseHttp.invokeFunction(
                    name = "tag-lookup",
                    body = mapOf("tag_id" to normalized)
                )
                val obj = JsonParser.parseString(raw).asJsonObject
                binding.textResult.text = prettyResult(obj, normalized)
            } catch (e: Exception) {
                binding.textResult.text = "Lookup failed: ${e.message}"
            } finally {
                binding.progressLookup.visibility = View.GONE
                binding.buttonLookup.isEnabled = true
            }
        }
    }

    private fun prettyResult(obj: com.google.gson.JsonObject, tag: String): String {
        if (obj.has("error")) return "Error: ${obj.get("error").asString}"
        val animal = obj.getAsJsonObject("animal")
        val owner = obj.getAsJsonObject("owner")
        val sb = StringBuilder()
        sb.append("Tag: $tag\n\n")
        if (animal != null) {
            sb.append("Animal\n")
            animal.entrySet().forEach { (k, v) ->
                if (!v.isJsonNull) sb.append("  $k: ${v.asString}\n")
            }
            sb.append("\n")
        }
        if (owner != null) {
            sb.append("Owner\n")
            owner.entrySet().forEach { (k, v) ->
                if (!v.isJsonNull) sb.append("  $k: ${v.asString}\n")
            }
        }
        if (animal == null && owner == null) sb.append(obj.toString())
        return sb.toString()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
