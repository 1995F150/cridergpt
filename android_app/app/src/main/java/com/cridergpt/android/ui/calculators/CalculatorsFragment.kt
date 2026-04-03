package com.cridergpt.android.ui.calculators

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.GridLayoutManager
import com.cridergpt.android.databinding.FragmentCalculatorsBinding
import com.cridergpt.android.viewmodels.CalculatorViewModel
import com.google.android.material.tabs.TabLayout

class CalculatorsFragment : Fragment() {

    private var _binding: FragmentCalculatorsBinding? = null
    private val binding get() = _binding!!
    private val calculatorViewModel: CalculatorViewModel by viewModels()

    private lateinit var buttonAdapter: CalculatorButtonAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCalculatorsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupTabLayout()
        setupRecyclerView()
        observeViewModel()
    }

    private fun setupTabLayout() {
        binding.tabLayout.apply {
            addTab(newTab().setText("Basic"))
            addTab(newTab().setText("Scientific"))
            addTab(newTab().setText("Financial"))
            addTab(newTab().setText("Advanced"))

            addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
                override fun onTabSelected(tab: TabLayout.Tab?) {
                    val type = when (tab?.position) {
                        0 -> CalculatorViewModel.CalculatorType.BASIC
                        1 -> CalculatorViewModel.CalculatorType.SCIENTIFIC
                        2 -> CalculatorViewModel.CalculatorType.FINANCIAL
                        3 -> CalculatorViewModel.CalculatorType.ADVANCED_FINANCIAL
                        else -> CalculatorViewModel.CalculatorType.BASIC
                    }
                    calculatorViewModel.setCalculatorType(type)
                }

                override fun onTabUnselected(tab: TabLayout.Tab?) {}
                override fun onTabReselected(tab: TabLayout.Tab?) {}
            })
        }
    }

    private fun setupRecyclerView() {
        buttonAdapter = CalculatorButtonAdapter { buttonText ->
            handleButtonClick(buttonText)
        }

        binding.recyclerButtons.apply {
            layoutManager = GridLayoutManager(requireContext(), 4)
            adapter = buttonAdapter
        }
    }

    private fun observeViewModel() {
        calculatorViewModel.display.observe(viewLifecycleOwner) { display ->
            binding.textDisplay.text = display
        }

        calculatorViewModel.calculatorType.observe(viewLifecycleOwner) { type ->
            buttonAdapter.submitList(calculatorViewModel.getButtonsForType(type))
        }

        // Set initial buttons
        buttonAdapter.submitList(calculatorViewModel.getButtonsForType(CalculatorViewModel.CalculatorType.BASIC))
    }

    private fun handleButtonClick(buttonText: String) {
        when {
            buttonText.matches(Regex("\\d")) -> {
                calculatorViewModel.inputNumber(buttonText)
            }
            buttonText == "." -> {
                calculatorViewModel.inputDecimal()
            }
            buttonText in listOf("+", "-", "×", "÷", "^", "%") -> {
                calculatorViewModel.performOperation(buttonText)
            }
            buttonText == "=" -> {
                calculatorViewModel.performOperation("=")
            }
            buttonText == "C" -> {
                calculatorViewModel.clear()
            }
            buttonText == "MC" -> {
                calculatorViewModel.memoryClear()
            }
            buttonText == "MR" -> {
                calculatorViewModel.memoryRecall()
            }
            buttonText == "M+" -> {
                calculatorViewModel.memoryAdd()
            }
            buttonText in listOf("sin", "cos", "tan", "log", "ln", "sqrt", "1/x", "x²") -> {
                calculatorViewModel.performFunction(buttonText)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}