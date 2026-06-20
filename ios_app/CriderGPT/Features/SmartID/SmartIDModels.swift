import Foundation

/// Smart ID tag id format: plain text `CriderGPT-XXXXXX`.
/// Strip wrapping braces / whitespace / URL-encoding the same way the web
/// `TagLookup.tsx` does so a tag written as `{CriderGPT-AB12CD}` still resolves.
enum TagIdParser {
    static func normalize(_ raw: String) -> String {
        let decoded = raw.removingPercentEncoding ?? raw
        let trimmed = decoded.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.trimmingCharacters(in: CharacterSet(charactersIn: "{}<>[]"))
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Loose validation — Smart ID issuance uses `CriderGPT-` + 6 alphanumerics,
    /// but we accept anything non-empty so older / custom tags still look up.
    static func looksValid(_ value: String) -> Bool {
        !value.isEmpty
    }
}

/// Server response shape from `tag-lookup` edge function.
/// `error` populated when no animal matches. `authorized=true` returns full
/// animal record; `authorized=false` returns the public contact card.
struct TagLookupResponse: Decodable {
    let error: String?
    let status: String?
    let authorized: Bool?
    let animal: Animal?
    let animal_name: String?
    let species: String?
    let owner_name: String?
    let owner_contact: OwnerContact?

    struct Animal: Decodable {
        let id: String
        let name: String?
        let species: String?
        let breed: String?
        let sex: String?
        let status: String?
        let tag_id: String?
        let notes: String?
        let owner_id: String?
        let photo_url: String?
    }

    struct OwnerContact: Decodable {
        let email: String?
        let phone: String?
    }
}
