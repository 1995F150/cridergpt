import SwiftUI

struct ErrorBanner: View {
    let message: String
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Theme.danger)
            Text(message)
                .font(.footnote)
                .foregroundStyle(Theme.textPrimary)
                .multilineTextAlignment(.leading)
            Spacer()
        }
        .padding()
        .background(Theme.danger.opacity(0.12))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius)
                .stroke(Theme.danger.opacity(0.5), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
    }
}
