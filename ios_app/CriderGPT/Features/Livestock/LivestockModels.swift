import Foundation

/// Mirrors `public.livestock_animals` (columns we render on iOS).
/// Owner-scoped via RLS; we never bypass — the anon key + user session is enough.
struct Animal: Identifiable, Codable, Hashable {
    let id: String
    var animal_id: String?      // human-readable ID
    var tag_id: String?         // CriderGPT-XXXXXX
    var name: String?
    var species: String?
    var breed: String?
    var sex: String?
    var status: String?
    var birth_date: String?
    var photo_url: String?
    var notes: String?
    var created_at: String?
}

struct WeightEntry: Identifiable, Codable, Hashable {
    let id: String
    let animal_id: String
    let weight_lbs: Double
    let recorded_at: String?
    let notes: String?
}

struct HealthRecord: Identifiable, Codable, Hashable {
    let id: String
    let animal_id: String
    let record_type: String?
    let title: String?
    let description: String?
    let medication: String?
    let dosage: String?
    let vet_name: String?
    let follow_up_date: String?
    let recorded_at: String?
}

struct AnimalNote: Identifiable, Codable, Hashable {
    let id: String
    let animal_id: String
    let content: String
    let note_type: String?
    let created_at: String?
}
