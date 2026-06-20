import SwiftUI

struct EventsView: View {
    @StateObject private var vm = EventsViewModel()
    @State private var showCreate = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            Group {
                if vm.loading && vm.events.isEmpty {
                    LoadingView(message: "Loading calendar…")
                } else if let err = vm.error, vm.events.isEmpty {
                    ErrorBanner(message: err)
                } else if vm.events.isEmpty {
                    empty
                } else {
                    list
                }
            }
        }
        .navigationTitle("Calendar")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showCreate = true } label: { Image(systemName: "plus") }
            }
        }
        .task { await vm.load() }
        .refreshable { await vm.load() }
        .sheet(isPresented: $showCreate) {
            CreateEventSheet { title, date, time, desc, vis in
                await vm.create(title: title, date: date, time: time, description: desc, visibility: vis)
                showCreate = false
            }
            .preferredColorScheme(.dark)
        }
    }

    private var empty: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar").font(.system(size: 48)).foregroundStyle(Theme.accent)
            Text("No events yet").font(.headline).foregroundStyle(Theme.textPrimary)
            Button("Add event") { showCreate = true }
                .buttonStyle(.borderedProminent).tint(Theme.accent)
        }
    }

    private var list: some View {
        List {
            ForEach(grouped, id: \.0) { (day, items) in
                Section {
                    ForEach(items) { e in EventRow(event: e).listRowBackground(Theme.surface) }
                } header: {
                    Text(day).foregroundStyle(Theme.textSecondary)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.background)
    }

    private var grouped: [(String, [CGEvent])] {
        let dict = Dictionary(grouping: vm.events) { $0.event_date }
        return dict.keys.sorted().map { ($0, dict[$0] ?? []) }
    }
}

private struct EventRow: View {
    let event: CGEvent
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack {
                Image(systemName: event.visibility == "chapter" ? "person.3.fill" : "person.fill")
                    .foregroundStyle(Theme.accent)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(event.title).font(.headline).foregroundStyle(Theme.textPrimary)
                if let d = event.description, !d.isEmpty {
                    Text(d).font(.caption).foregroundStyle(Theme.textSecondary).lineLimit(2)
                }
                HStack(spacing: 6) {
                    if let t = event.event_time { Text(t.prefix(5)).font(.caption2) }
                    if let c = event.category { Text("· \(c)").font(.caption2) }
                }.foregroundStyle(Theme.textSecondary)
            }
        }.padding(.vertical, 4)
    }
}

private struct CreateEventSheet: View {
    var onSave: (String, Date, Date?, String?, String) async -> Void
    @State private var title = ""
    @State private var date = Date()
    @State private var includeTime = false
    @State private var time = Date()
    @State private var desc = ""
    @State private var visibility = "personal"
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Title") { TextField("Event title", text: $title) }
                Section("When") {
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                    Toggle("Set time", isOn: $includeTime)
                    if includeTime {
                        DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute)
                    }
                }
                Section("Visibility") {
                    Picker("Visibility", selection: $visibility) {
                        Text("Personal").tag("personal")
                        Text("Chapter").tag("chapter")
                    }.pickerStyle(.segmented)
                }
                Section("Description") { TextField("Optional", text: $desc, axis: .vertical) }
            }
            .navigationTitle("New Event")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saving = true
                        Task {
                            await onSave(title, date, includeTime ? time : nil,
                                         desc.isEmpty ? nil : desc, visibility)
                            saving = false
                        }
                    }.disabled(title.isEmpty || saving)
                }
            }
        }
    }
}
