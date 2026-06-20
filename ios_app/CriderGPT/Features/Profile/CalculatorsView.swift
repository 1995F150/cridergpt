import SwiftUI

/// Common FFA/livestock calculators. Pure-client math — no backend.
/// Matches the website's calculator set so the mobile app has parity.
struct CalculatorsView: View {
    var body: some View {
        List {
            Section {
                NavigationLink("Average Daily Gain") { ADGCalculator() }
                NavigationLink("Feed Conversion Ratio") { FCRCalculator() }
                NavigationLink("Dress Percentage") { DressPctCalculator() }
            } header: { Text("Livestock") }
                .listRowBackground(Theme.surface)
        }
        .scrollContentBackground(.hidden)
        .background(Theme.background)
        .navigationTitle("Calculators")
    }
}

// MARK: - ADG

private struct ADGCalculator: View {
    @State private var start = ""
    @State private var end = ""
    @State private var days = ""

    var adg: Double? {
        guard let s = Double(start), let e = Double(end), let d = Double(days), d > 0 else { return nil }
        return (e - s) / d
    }

    var body: some View {
        Form {
            Section("Inputs") {
                TextField("Start weight (lbs)", text: $start).keyboardType(.decimalPad)
                TextField("End weight (lbs)", text: $end).keyboardType(.decimalPad)
                TextField("Days on feed", text: $days).keyboardType(.numberPad)
            }
            Section("Result") {
                Text(adg.map { String(format: "%.2f lbs/day", $0) } ?? "—")
                    .font(.title3).foregroundStyle(Theme.accent)
            }
        }
        .scrollContentBackground(.hidden).background(Theme.background)
        .navigationTitle("ADG")
    }
}

// MARK: - FCR

private struct FCRCalculator: View {
    @State private var feed = ""
    @State private var gain = ""

    var fcr: Double? {
        guard let f = Double(feed), let g = Double(gain), g > 0 else { return nil }
        return f / g
    }

    var body: some View {
        Form {
            Section("Inputs") {
                TextField("Feed consumed (lbs)", text: $feed).keyboardType(.decimalPad)
                TextField("Weight gained (lbs)", text: $gain).keyboardType(.decimalPad)
            }
            Section("Result") {
                Text(fcr.map { String(format: "%.2f : 1", $0) } ?? "—")
                    .font(.title3).foregroundStyle(Theme.accent)
                Text("Pounds of feed per pound of gain.")
                    .font(.caption).foregroundStyle(Theme.textSecondary)
            }
        }
        .scrollContentBackground(.hidden).background(Theme.background)
        .navigationTitle("FCR")
    }
}

// MARK: - Dress %

private struct DressPctCalculator: View {
    @State private var live = ""
    @State private var carcass = ""

    var pct: Double? {
        guard let l = Double(live), let c = Double(carcass), l > 0 else { return nil }
        return (c / l) * 100
    }

    var body: some View {
        Form {
            Section("Inputs") {
                TextField("Live weight (lbs)", text: $live).keyboardType(.decimalPad)
                TextField("Carcass weight (lbs)", text: $carcass).keyboardType(.decimalPad)
            }
            Section("Result") {
                Text(pct.map { String(format: "%.1f%%", $0) } ?? "—")
                    .font(.title3).foregroundStyle(Theme.accent)
            }
        }
        .scrollContentBackground(.hidden).background(Theme.background)
        .navigationTitle("Dress %")
    }
}
