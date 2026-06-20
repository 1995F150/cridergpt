import Foundation

/// Mirrors `public.events`. Two-tier visibility ('personal' vs 'chapter') is
/// already enforced by RLS — iOS doesn't need to filter client-side.
struct CGEvent: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let description: String?
    let event_date: String       // YYYY-MM-DD
    let event_time: String?
    let end_time: String?
    let visibility: String?
    let category: String?
    let chapter_id: String?
    let created_by: String?
}
