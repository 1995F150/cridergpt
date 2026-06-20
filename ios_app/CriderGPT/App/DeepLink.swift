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
           let raw = parts.dropFirst().first {
            let id = TagIdParser.normalize(raw)
            if TagIdParser.looksValid(id) { return .tag(id) }
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

// TagIdParser is defined in Features/SmartID/SmartIDModels.swift and reused here.

