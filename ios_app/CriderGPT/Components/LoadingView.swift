import SwiftUI

struct LoadingView: View {
    var message: String = "Loading…"
    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(Theme.accent)
                .scaleEffect(1.4)
            Text(message)
                .foregroundStyle(Theme.textSecondary)
                .font(.subheadline)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background)
    }
}
