package com.cridergpt.android.ui.calendar

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.cridergpt.android.databinding.FragmentCalendarBinding
import com.cridergpt.android.models.CGEvent
import com.cridergpt.android.viewmodels.EventsViewModel

class CalendarFragment : Fragment() {

    private var _binding: FragmentCalendarBinding? = null
    private val binding get() = _binding!!
    private val viewModel: EventsViewModel by viewModels()
    private val adapter = EventsAdapter()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCalendarBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.recyclerEvents.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerEvents.adapter = adapter

        viewModel.isLoading.observe(viewLifecycleOwner) {
            binding.progressEvents.visibility = if (it) View.VISIBLE else View.GONE
        }
        viewModel.events.observe(viewLifecycleOwner) { events ->
            adapter.submit(events)
            binding.textEmpty.visibility =
                if (events.isEmpty() && viewModel.isLoading.value != true) View.VISIBLE else View.GONE
        }

        viewModel.load()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

private class EventsAdapter : RecyclerView.Adapter<EventsAdapter.VH>() {
    private val items = mutableListOf<CGEvent>()

    fun submit(list: List<CGEvent>) {
        items.clear(); items.addAll(list); notifyDataSetChanged()
    }

    class VH(val title: android.widget.TextView, val subtitle: android.widget.TextView, root: android.view.View) :
        RecyclerView.ViewHolder(root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val container = android.widget.LinearLayout(parent.context).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 28, 48, 28)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        val title = android.widget.TextView(parent.context).apply {
            textSize = 16f; setTypeface(null, android.graphics.Typeface.BOLD)
        }
        val subtitle = android.widget.TextView(parent.context).apply { textSize = 13f }
        container.addView(title); container.addView(subtitle)
        return VH(title, subtitle, container)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val e = items[position]
        holder.title.text = e.title
        val parts = listOfNotNull(e.date, e.time, e.visibility.takeIf { it.isNotBlank() }?.let { "[$it]" })
        holder.subtitle.text = parts.joinToString(" · ")
    }
}
