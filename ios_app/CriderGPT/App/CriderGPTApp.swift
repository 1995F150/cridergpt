import SwiftUI
import GoogleSignIn

@main
struct CriderGPTApp: App {
    @StateObject private var auth = AuthService.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
                .onAppear {
                    Task { await auth.restoreSession() }
                }
                .onOpenURL { url in
                    // Google Sign-In OAuth callback
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
