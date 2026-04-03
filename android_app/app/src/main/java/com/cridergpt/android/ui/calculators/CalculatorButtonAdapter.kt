package com.cridergpt.android.ui.calculators

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.cridergpt.android.databinding.ItemCalculatorButtonBinding

class CalculatorButtonAdapter(
    private val onButtonClick: (String) -> Unit
) : ListAdapter<String, CalculatorButtonAdapter.ButtonViewHolder>(ButtonDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ButtonViewHolder {
        val binding = ItemCalculatorButtonBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ButtonViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ButtonViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ButtonViewHolder(
        private val binding: ItemCalculatorButtonBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        init {
            binding.buttonCalculator.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onButtonClick(getItem(position))
                }
            }
        }

        fun bind(buttonText: String) {
            binding.buttonCalculator.text = buttonText
        }
    }

    class ButtonDiffCallback : DiffUtil.ItemCallback<String>() {
        override fun areItemsTheSame(oldItem: String, newItem: String): Boolean {
            return oldItem == newItem
        }

        override fun areContentsTheSame(oldItem: String, newItem: String): Boolean {
            return oldItem == newItem
        }
    }
}