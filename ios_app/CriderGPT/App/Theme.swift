import SwiftUI

/// Brand tokens mirroring `src/index.css` design system.
/// Keep these in sync with the web tokens — never hardcode colors in views.
enum Theme {
    // Core surfaces (dark mode is the default and only mode in v1)
    static let background  = Color(hex: 0x0B0F14)
    static let surface     = Color(hex: 0x121821)
    static let surfaceAlt  = Color(hex: 0x1A2230)
    static let border      = Color(hex: 0x243042)

    // Text
    static let textPrimary    = Color(hex: 0xF5F7FA)
    static let textSecondary  = Color(hex: 0x9AA7BD)
    static let textMuted      = Color(hex: 0x6B7891)

    // Brand accents (cyber-blue used across the web app)
    static let accent       = Color(hex: 0x3FB6FF)
    static let accentStrong = Color(hex: 0x1E90FF)
    static let success      = Color(hex: 0x22C55E)
    static let warning      = Color(hex: 0xF59E0B)
    static let danger       = Color(hex: 0xEF4444)

    // Spacing
    static let radius: CGFloat = 12
    static let padding: CGFloat = 16
}

extension Color {
    init(hex: UInt32, alpha: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}
