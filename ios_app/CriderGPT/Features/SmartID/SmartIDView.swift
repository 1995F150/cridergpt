import SwiftUI

/// Smart ID tab — scan a CriderGPT NFC tag or enter the tag id manually.
/// Mirrors the web app's TagLookup page: authorized owners see the full
/// animal record; unauthorized scans show the public owner-contact card.
struct SmartIDView: View {
    @StateObject private var vm = SmartIDViewModel()
    @EnvironmentObject private var router: AppRouter

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                scanCard
                manualCard

                if let err = vm.errorMessage {
                    ErrorBanner(message: err)
                }
                if vm.isLooking {
                    LoadingView(message: "Looking up tag…")
                        .frame(height: 120)
                }
                if let res = vm.result {
                    ResultCard(response: res, tagId: vm.lastTagId ?? "")
                }
            }
            .padding(16)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Smart ID")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if vm.result != nil || vm.errorMessage != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Clear") { vm.reset() }
                }
            }
        }
        .onReceive(router.$pendingTagLookup.compactMap { $0 }) { id in
            vm.manualInput = id
            Task { await vm.lookupManual() }
            router.pendingTagLookup = nil
        }
    }


    private var scanCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "wave.3.right.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(Theme.accent)
            Text("Scan Smart ID")
                .font(.title3.bold())
                .foregroundStyle(Theme.textPrimary)
            Text(vm.nfcAvailable
                 ? "Hold your iPhone near a CriderGPT-XXXXXX tag."
                 : "NFC isn't available on this device. Enter the tag ID below.")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)

            Button {
                Task { await vm.scanAndLookup() }
            } label: {
                Label("Tap to scan", systemImage: "sensor.tag.radiowaves.forward.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(vm.nfcAvailable ? Theme.accent : Theme.surfaceAlt)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            }
            .disabled(!vm.nfcAvailable || vm.isLooking)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
    }

    private var manualCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Enter tag ID")
                .font(.subheadline.bold())
                .foregroundStyle(Theme.textPrimary)
            HStack {
                TextField("CriderGPT-XXXXXX", text: $vm.manualInput)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Theme.background)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .foregroundStyle(Theme.textPrimary)
                    .onSubmit { Task { await vm.lookupManual() } }

                Button("Look up") {
                    Task { await vm.lookupManual() }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.accent)
                .disabled(vm.isLooking)
            }
        }
        .padding(16)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
    }
}

// MARK: - Result card

private struct ResultCard: View {
    let response: TagLookupResponse
    let tagId: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: response.authorized == true
                      ? "checkmark.shield.fill"
                      : "person.crop.circle.badge.questionmark")
                    .foregroundStyle(response.authorized == true ? .green : Theme.accent)
                Text(response.authorized == true ? "Your animal" : "Public lookup")
                    .font(.headline)
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
                Text(tagId)
                    .font(.caption.monospaced())
                    .foregroundStyle(Theme.textSecondary)
            }

            Divider().background(Theme.surfaceAlt)

            if let animal = response.animal, response.authorized == true {
                authorizedBody(animal)
            } else {
                publicBody
            }
        }
        .padding(16)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
    }

    @ViewBuilder
    private func authorizedBody(_ a: TagLookupResponse.Animal) -> some View {
        labeledRow("Name", a.name ?? "—")
        labeledRow("Species", a.species ?? "—")
        if let b = a.breed { labeledRow("Breed", b) }
        if let s = a.sex { labeledRow("Sex", s) }
        if let st = a.status { labeledRow("Status", st) }
        if let n = a.notes, !n.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text("Notes").font(.caption).foregroundStyle(Theme.textSecondary)
                Text(n).foregroundStyle(Theme.textPrimary)
            }
        }
    }

    @ViewBuilder
    private var publicBody: some View {
        labeledRow("Animal", response.animal_name ?? "—")
        if let sp = response.species { labeledRow("Species", sp) }
        if let owner = response.owner_name { labeledRow("Owner", owner) }
        if let contact = response.owner_contact {
            if let phone = contact.phone, !phone.isEmpty {
                Link(destination: URL(string: "tel:\(phone)")!) {
                    Label(phone, systemImage: "phone.fill")
                        .foregroundStyle(Theme.accent)
                }
            }
            if let email = contact.email, !email.isEmpty {
                Link(destination: URL(string: "mailto:\(email)")!) {
                    Label(email, systemImage: "envelope.fill")
                        .foregroundStyle(Theme.accent)
                }
            }
        }
    }

    private func labeledRow(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.caption)
                .foregroundStyle(Theme.textSecondary)
                .frame(width: 80, alignment: .leading)
            Text(value)
                .foregroundStyle(Theme.textPrimary)
            Spacer()
        }
    }
}
