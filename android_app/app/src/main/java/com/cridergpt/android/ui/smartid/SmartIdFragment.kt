package com.cridergpt.android.ui.smartid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.cridergpt.android.databinding.FragmentSmartIdBinding

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

        binding.textSmartId.text = "Smart ID Store Fragment"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}