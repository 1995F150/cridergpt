package com.cridergpt.android.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

class CalculatorViewModel : ViewModel() {

    private val _display = MutableLiveData("0")
    val display: LiveData<String> = _display

    private val _calculatorType = MutableLiveData(CalculatorType.BASIC)
    val calculatorType: LiveData<CalculatorType> = _calculatorType

    private var previousValue: Double? = null
    private var operation: String? = null
    private var waitingForOperand = false
    private var memory = 0.0

    enum class CalculatorType {
        BASIC, SCIENTIFIC, FINANCIAL, ADVANCED_FINANCIAL
    }

    fun setCalculatorType(type: CalculatorType) {
        _calculatorType.value = type
    }

    fun inputNumber(num: String) {
        val currentDisplay = _display.value ?: "0"
        if (waitingForOperand) {
            _display.value = num
            waitingForOperand = false
        } else {
            _display.value = if (currentDisplay == "0") num else currentDisplay + num
        }
    }

    fun inputDecimal() {
        val currentDisplay = _display.value ?: "0"
        if (waitingForOperand) {
            _display.value = "0."
            waitingForOperand = false
        } else if (!currentDisplay.contains(".")) {
            _display.value = currentDisplay + "."
        }
    }

    fun performOperation(nextOperation: String) {
        val inputValue = (_display.value ?: "0").toDoubleOrNull() ?: 0.0

        if (previousValue == null) {
            previousValue = inputValue
        } else if (operation != null) {
            val currentValue = previousValue ?: 0.0
            val newValue = calculate(currentValue, inputValue, operation!!)
            _display.value = formatResult(newValue)
            previousValue = newValue
        }

        waitingForOperand = true
        operation = nextOperation
    }

    private fun calculate(firstValue: Double, secondValue: Double, operation: String): Double {
        return when (operation) {
            "+" -> firstValue + secondValue
            "-" -> firstValue - secondValue
            "×" -> firstValue * secondValue
            "÷" -> if (secondValue != 0.0) firstValue / secondValue else 0.0
            "^" -> Math.pow(firstValue, secondValue)
            "%" -> firstValue % secondValue
            else -> secondValue
        }
    }

    fun performFunction(func: String) {
        val value = (_display.value ?: "0").toDoubleOrNull() ?: 0.0
        val result = when (func) {
            "sin" -> Math.sin(Math.toRadians(value))
            "cos" -> Math.cos(Math.toRadians(value))
            "tan" -> Math.tan(Math.toRadians(value))
            "log" -> Math.log10(value)
            "ln" -> Math.log(value)
            "sqrt" -> Math.sqrt(value)
            "1/x" -> if (value != 0.0) 1.0 / value else 0.0
            "x²" -> value * value
            else -> value
        }
        _display.value = formatResult(result)
        waitingForOperand = true
    }

    fun clear() {
        _display.value = "0"
        previousValue = null
        operation = null
        waitingForOperand = false
    }

    fun memoryStore() {
        memory = (_display.value ?: "0").toDoubleOrNull() ?: 0.0
    }

    fun memoryRecall() {
        _display.value = formatResult(memory)
        waitingForOperand = true
    }

    fun memoryClear() {
        memory = 0.0
    }

    fun memoryAdd() {
        memory += (_display.value ?: "0").toDoubleOrNull() ?: 0.0
    }

    private fun formatResult(value: Double): String {
        return if (value == value.toLong().toDouble()) {
            value.toLong().toString()
        } else {
            value.toString()
        }
    }

    fun getButtonsForType(type: CalculatorType): List<String> {
        return when (type) {
            CalculatorType.BASIC -> listOf(
                "7", "8", "9", "÷",
                "4", "5", "6", "×",
                "1", "2", "3", "-",
                "0", ".", "=", "+",
                "C", "MC", "MR", "M+"
            )
            CalculatorType.SCIENTIFIC -> listOf(
                "sin", "cos", "tan", "log",
                "7", "8", "9", "÷",
                "4", "5", "6", "×",
                "1", "2", "3", "-",
                "0", ".", "=", "+",
                "C", "ln", "sqrt", "^"
            )
            CalculatorType.FINANCIAL -> listOf(
                "7", "8", "9", "÷",
                "4", "5", "6", "×",
                "1", "2", "3", "-",
                "0", ".", "=", "+",
                "C", "MC", "MR", "M+"
            )
            CalculatorType.ADVANCED_FINANCIAL -> listOf(
                "7", "8", "9", "÷",
                "4", "5", "6", "×",
                "1", "2", "3", "-",
                "0", ".", "=", "+",
                "C", "MC", "MR", "M+"
            )
        }
    }
}