import Foundation

/// Parses universal links and custom-scheme URLs into in-app navigation.
///
/// Supported:
///   cridergpt://tag/CriderGPT-ABC123
///   https://cridergpt.com/tag/CriderGPT-ABC123
///   cridergpt://chat            → Chat tab
///   cridergpt://livestock       → Livestock tab
///   cridergpt://events          → Calendar tab
///   cridergpt://profile         → Profile tab
enum DeepLink: Equatable {
    case tag(String)
    case chat
    case smartID
    case livestock
    case events
    case profile

    static func parse(_ url: URL) -> DeepLink? {
        let host = url.host?.lowercased()
        let parts = url.pathComponents.filter { $0 != "/" }

        // Tag lookup: /tag/<id>
        if let first = parts.first?.lowercased(), first == "tag",
           let raw = parts.dropFirst().first,
           let id = TagIdParser.normalize(raw) {
            return .tag(id)
        }

        // Section routing — accept either host (custom scheme) or first path segment (https)
        let section = host ?? parts.first?.lowercased()
        switch section {
        case "chat":      return .chat
        case "smart-id", "smartid": return .smartID
        case "livestock": return .livestock
        case "events", "calendar": return .events
        case "profile":   return .profile
        default:          return nil
        }
    }
}

/// Mirror of the Android/web tag normalizer so deep links and pasted text agree.
enum TagIdParser {
    private static let rx = try! NSRegularExpression(pattern: "CriderGPT-[A-Z0-9]{6}", options: [.caseInsensitive])

    static func normalize(_ raw: String) -> String? {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("{") && s.hasSuffix("}") { s = String(s.dropFirst().dropLast()) }
        s = s.removingPercentEncoding ?? s
        let range = NSRange(s.startIndex..., in: s)
        guard let m = rx.firstMatch(in: s, range: range),
              let r = Range(m.range, in: s) else { return nil }
        return String(s[r]).uppercased()
    }
}
