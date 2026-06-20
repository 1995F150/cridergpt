import Foundation

/// Mirrors a subset of `public.profiles` used by the iOS app.
/// Extend per-stage as features need more fields.
struct Profile: Codable, Identifiable, Equatable {
    let id: UUID            // = user_id
    var username: String?
    var fullName: String?
    var tier: String?       // 'free' | 'plus' | 'pro' | 'lifetime'
    var avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id = "user_id"
        case username
        case fullName = "full_name"
        case tier
        case avatarUrl = "avatar_url"
    }
}
