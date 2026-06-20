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
    @EnvironmentObject var router: AppRouter

    var body: some View {
        TabView(selection: $router.selectedTab) {
            NavigationStack { ChatView() }
                .tabItem { Label("Chat", systemImage: "bubble.left.and.bubble.right.fill") }
                .tag(AppRouter.Tab.chat)

            NavigationStack { SmartIDView() }
                .tabItem { Label("Smart ID", systemImage: "sensor.tag.radiowaves.forward.fill") }
                .tag(AppRouter.Tab.smartID)

            NavigationStack { LivestockView() }
                .tabItem { Label("Livestock", systemImage: "pawprint.fill") }
                .tag(AppRouter.Tab.livestock)

            NavigationStack { EventsView() }
                .tabItem { Label("Calendar", systemImage: "calendar") }
                .tag(AppRouter.Tab.events)

            NavigationStack { ProfileView() }
                .tabItem { Label("Profile", systemImage: "person.crop.circle.fill") }
                .tag(AppRouter.Tab.profile)
        }
        .tint(Theme.accent)
        .background(Theme.background.ignoresSafeArea())
        .toolbarColorScheme(.dark, for: .navigationBar, .tabBar)
    }
}
