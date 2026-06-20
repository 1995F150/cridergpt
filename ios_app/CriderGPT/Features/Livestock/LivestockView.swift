import SwiftUI

struct LivestockView: View {
    @StateObject private var vm = LivestockViewModel()

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            Group {
                if vm.loading && vm.animals.isEmpty {
                    LoadingView(message: "Loading herd…")
                } else if let err = vm.error, vm.animals.isEmpty {
                    ErrorBanner(message: err)
                } else if vm.animals.isEmpty {
                    emptyState
                } else {
                    list
                }
            }
        }
        .navigationTitle("Livestock")
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task { await vm.loadAnimals() }
        .refreshable { await vm.loadAnimals() }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "pawprint.fill").font(.system(size: 48)).foregroundStyle(Theme.accent)
            Text("No animals yet").font(.headline).foregroundStyle(Theme.textPrimary)
            Text("Add animals from the web app — they'll show up here automatically.")
                .font(.subheadline).foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center).padding(.horizontal, 32)
        }
    }

    private var list: some View {
        List {
            ForEach(vm.animals) { a in
                NavigationLink(value: a) { AnimalRow(animal: a) }
                    .listRowBackground(Theme.surface)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.background)
        .navigationDestination(for: Animal.self) { a in
            AnimalDetailView(animal: a, vm: vm)
        }
    }
}

private struct AnimalRow: View {
    let animal: Animal
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Theme.surfaceElevated).frame(width: 44, height: 44)
                Image(systemName: "pawprint.fill").foregroundStyle(Theme.accent)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(animal.name?.isEmpty == false ? animal.name! : (animal.animal_id ?? "Unnamed"))
                    .font(.headline).foregroundStyle(Theme.textPrimary)
                HStack(spacing: 6) {
                    if let s = animal.species { Text(s) }
                    if let b = animal.breed, !b.isEmpty { Text("· \(b)") }
                }
                .font(.caption).foregroundStyle(Theme.textSecondary)
                if let tag = animal.tag_id, !tag.isEmpty {
                    Text(tag).font(.caption2.monospaced()).foregroundStyle(Theme.accent)
                }
            }
            Spacer()
            if let status = animal.status {
                Text(status.capitalized)
                    .font(.caption2).padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Theme.surfaceElevated).clipShape(Capsule())
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct AnimalDetailView: View {
    let animal: Animal
    @ObservedObject var vm: LivestockViewModel
    @State private var showAddWeight = false
    @State private var newWeight = ""
    @State private var newNote = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                section(title: "Weights (\(vm.weights.count))") {
                    if vm.weights.isEmpty { emptyRow("No weights recorded.") }
                    ForEach(vm.weights) { w in
                        HStack {
                            Text("\(w.weight_lbs, specifier: "%.1f") lbs")
                                .foregroundStyle(Theme.textPrimary)
                            Spacer()
                            Text(shortDate(w.recorded_at)).foregroundStyle(Theme.textSecondary).font(.caption)
                        }
                    }
                    Button { showAddWeight = true } label: {
                        Label("Add weight", systemImage: "plus.circle.fill")
                    }
                    .buttonStyle(.borderedProminent).tint(Theme.accent).padding(.top, 4)
                }
                section(title: "Health (\(vm.health.count))") {
                    if vm.health.isEmpty { emptyRow("No health records.") }
                    ForEach(vm.health) { h in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(h.title ?? (h.record_type ?? "Record")).foregroundStyle(Theme.textPrimary)
                            if let d = h.description { Text(d).font(.caption).foregroundStyle(Theme.textSecondary) }
                            Text(shortDate(h.recorded_at)).font(.caption2).foregroundStyle(Theme.textSecondary)
                        }
                    }
                }
                section(title: "Notes (\(vm.notes.count))") {
                    if vm.notes.isEmpty { emptyRow("No notes.") }
                    ForEach(vm.notes) { n in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(n.content).foregroundStyle(Theme.textPrimary)
                            Text(shortDate(n.created_at)).font(.caption2).foregroundStyle(Theme.textSecondary)
                        }
                    }
                }
            }
            .padding()
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(animal.name ?? (animal.animal_id ?? "Animal"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.loadDetail(for: animal.id) }
        .sheet(isPresented: $showAddWeight) {
            NavigationStack {
                Form {
                    Section("Weight (lbs)") {
                        TextField("e.g. 245.5", text: $newWeight).keyboardType(.decimalPad)
                    }
                    Section("Notes (optional)") {
                        TextField("Morning weigh-in…", text: $newNote)
                    }
                }
                .navigationTitle("Add Weight")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { showAddWeight = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") {
                            if let lbs = Double(newWeight) {
                                Task {
                                    await vm.addWeight(animalUUID: animal.id, lbs: lbs,
                                                       note: newNote.isEmpty ? nil : newNote)
                                    newWeight = ""; newNote = ""; showAddWeight = false
                                }
                            }
                        }.disabled(Double(newWeight) == nil)
                    }
                }
            }
            .preferredColorScheme(.dark)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let tag = animal.tag_id { Text(tag).font(.subheadline.monospaced()).foregroundStyle(Theme.accent) }
            HStack(spacing: 8) {
                if let s = animal.species { chip(s) }
                if let b = animal.breed, !b.isEmpty { chip(b) }
                if let sex = animal.sex, !sex.isEmpty { chip(sex) }
                if let st = animal.status { chip(st.capitalized) }
            }
            if let n = animal.notes, !n.isEmpty {
                Text(n).font(.callout).foregroundStyle(Theme.textSecondary).padding(.top, 4)
            }
        }
    }

    private func chip(_ s: String) -> some View {
        Text(s).font(.caption).padding(.horizontal, 8).padding(.vertical, 3)
            .background(Theme.surfaceElevated).clipShape(Capsule())
            .foregroundStyle(Theme.textSecondary)
    }

    @ViewBuilder
    private func section<C: View>(title: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline).foregroundStyle(Theme.textPrimary)
            VStack(alignment: .leading, spacing: 8) { content() }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12).background(Theme.surface).clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func emptyRow(_ s: String) -> some View {
        Text(s).font(.caption).foregroundStyle(Theme.textSecondary)
    }

    private func shortDate(_ iso: String?) -> String {
        guard let iso else { return "" }
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let d = f.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
        guard let d else { return iso }
        let out = DateFormatter(); out.dateStyle = .medium; out.timeStyle = .short
        return out.string(from: d)
    }
}
