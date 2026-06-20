import Foundation
import Supabase

/// Loads the signed-in user's animals + per-animal detail bundle.
/// RLS filters server-side; we still don't pass user IDs in queries we don't need to.
@MainActor
final class LivestockViewModel: ObservableObject {
    @Published var animals: [Animal] = []
    @Published var loading = false
    @Published var error: String?

    @Published var weights: [WeightEntry] = []
    @Published var health: [HealthRecord] = []
    @Published var notes: [AnimalNote] = []
    @Published var detailLoading = false

    func loadAnimals() async {
        loading = true; defer { loading = false }
        error = nil
        do {
            let rows: [Animal] = try await SB.client
                .from("livestock_animals")
                .select()
                .order("created_at", ascending: false)
                .execute()
                .value
            self.animals = rows
        } catch {
            self.error = "Couldn't load animals. \(error.localizedDescription)"
        }
    }

    func loadDetail(for animalUUID: String) async {
        detailLoading = true; defer { detailLoading = false }
        do {
            async let w: [WeightEntry] = SB.client
                .from("livestock_weights")
                .select()
                .eq("animal_id", value: animalUUID)
                .order("recorded_at", ascending: false)
                .execute().value
            async let h: [HealthRecord] = SB.client
                .from("livestock_health_records")
                .select()
                .eq("animal_id", value: animalUUID)
                .order("recorded_at", ascending: false)
                .execute().value
            async let n: [AnimalNote] = SB.client
                .from("livestock_notes")
                .select()
                .eq("animal_id", value: animalUUID)
                .order("created_at", ascending: false)
                .execute().value
            self.weights = try await w
            self.health = try await h
            self.notes = try await n
        } catch {
            self.error = "Couldn't load animal detail. \(error.localizedDescription)"
        }
    }

    func addWeight(animalUUID: String, lbs: Double, note: String?) async {
        struct Insert: Encodable { let animal_id: String; let weight_lbs: Double; let notes: String? }
        do {
            try await SB.client.from("livestock_weights")
                .insert(Insert(animal_id: animalUUID, weight_lbs: lbs, notes: note))
                .execute()
            await loadDetail(for: animalUUID)
        } catch {
            self.error = "Couldn't save weight. \(error.localizedDescription)"
        }
    }
}
