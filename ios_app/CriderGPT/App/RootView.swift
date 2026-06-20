import SwiftUI

/// Auth gate. After sign-in the app shows MainTabView.
/// MainTabView starts empty in Stage 1 — tabs are added per stage so we never
/// ship a tab that doesn't work.
struct RootView: View {
    @EnvironmentObject var auth: AuthService

    var body: some View {
        Group {
            switch auth.state {
            case .loading:
                LoadingView(message: "Loading…")
            case .signedOut:
                AuthView()
            case .signedIn:
                MainTabView()
            }
        }
        .background(Theme.background.ignoresSafeArea())
    }
}

/// Tab shell. Tabs land here progressively:
///   Stage 2: Chat
///   Stage 3: + Smart ID
///   Stage 4: + Livestock, Calendar
///   Stage 5: + Profile (with IAP, calculators)
struct MainTabView: View {
    @EnvironmentObject var auth: AuthService

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(Theme.accent)
                Text("Signed in")
                    .font(.title2.bold())
                    .foregroundStyle(Theme.textPrimary)
                Text("Feature tabs land in the next stages.\nNo broken placeholder screens.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal)
                Spacer()
                Button(role: .destructive) {
                    Task { await auth.signOut() }
                } label: {
                    Text("Sign out")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.surfaceAlt)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                }
                .padding(.horizontal)
                .padding(.bottom)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("CriderGPT")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}
