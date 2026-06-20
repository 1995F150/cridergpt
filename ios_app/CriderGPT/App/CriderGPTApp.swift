import SwiftUI
import GoogleSignIn

@main
struct CriderGPTApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var auth = AuthService.shared
    @StateObject private var router = AppRouter()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(router)
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
                .onAppear {
                    Task { await auth.restoreSession() }
                }
                .onOpenURL { url in
                    // Google Sign-In OAuth callback
                    if GIDSignIn.sharedInstance.handle(url) { return }
                    // Deep links (cridergpt:// or https://cridergpt.com/…)
                    if let link = DeepLink.parse(url) {
                        router.handle(link)
                    }
                }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    if let url = activity.webpageURL, let link = DeepLink.parse(url) {
                        router.handle(link)
                    }
                }
        }
    }
}

/// Drives tab selection + the pending tag-lookup the Smart ID screen consumes.
final class AppRouter: ObservableObject {
    @Published var selectedTab: Tab = .chat
    @Published var pendingTagLookup: String?

    enum Tab: Hashable { case chat, smartID, livestock, events, profile }

    func handle(_ link: DeepLink) {
        switch link {
        case .tag(let id):
            pendingTagLookup = id
            selectedTab = .smartID
        case .chat:      selectedTab = .chat
        case .smartID:   selectedTab = .smartID
        case .livestock: selectedTab = .livestock
        case .events:    selectedTab = .events
        case .profile:   selectedTab = .profile
        }
    }
}
