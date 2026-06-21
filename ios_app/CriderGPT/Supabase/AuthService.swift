import Foundation
import Supabase
import AuthenticationServices
import GoogleSignIn
import UIKit

@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()

    enum State: Equatable {
        case loading
        case signedOut
        case signedIn(User)
    }

    @Published private(set) var state: State = .loading
    @Published private(set) var profile: Profile?
    @Published var lastError: String?

    private var authChangesTask: Task<Void, Never>?

    private init() {}

    // MARK: - Session

    func restoreSession() async {
        authChangesTask?.cancel()
        do {
            let session = try await SB.client.auth.session
            state = .signedIn(session.user)
            await loadProfile(for: session.user)
        } catch {
            state = .signedOut
            profile = nil
        }
        // Subscribe to future auth state changes
        authChangesTask = Task { [weak self] in
            for await change in SB.client.auth.authStateChanges {
                guard let self else { return }
                if let user = change.session?.user {
                    self.state = .signedIn(user)
                    await self.loadProfile(for: user)
                } else {
                    self.state = .signedOut
                    self.profile = nil
                }
            }
        }
    }

    // MARK: - Email / Password

    func signIn(email: String, password: String) async {
        do {
            let session = try await SB.client.auth.signIn(email: email, password: password)
            state = .signedIn(session.user)
            await loadProfile(for: session.user)
        } catch {
            lastError = error.localizedDescription
        }
    }

    func signUp(email: String, password: String) async {
        do {
            let result = try await SB.client.auth.signUp(email: email, password: password)
            state = .signedIn(result.user)
            await loadProfile(for: result.user)
        } catch {
            lastError = error.localizedDescription
        }
    }

    func signOut() async {
        do {
            try await SB.client.auth.signOut()
            state = .signedOut
            profile = nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Apple (popup, no full-page redirect)

    func handleAppleCredential(_ credential: ASAuthorizationAppleIDCredential) async {
        guard let tokenData = credential.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else {
            lastError = "Apple sign-in did not return an identity token."
            return
        }
        do {
            let session = try await SB.client.auth.signInWithIdToken(
                credentials: .init(provider: .apple, idToken: token)
            )
            state = .signedIn(session.user)
            await loadProfile(for: session.user)
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Google (popup, no full-page redirect)

    func signInWithGoogle(presenting: UIViewController) async {
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenting)
            guard let idToken = result.user.idToken?.tokenString else {
                lastError = "Google sign-in did not return an ID token."
                return
            }
            let session = try await SB.client.auth.signInWithIdToken(
                credentials: .init(
                    provider: .google,
                    idToken: idToken,
                    accessToken: result.user.accessToken.tokenString
                )
            )
            state = .signedIn(session.user)
            await loadProfile(for: session.user)
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Profile

    private func loadProfile(for user: User) async {
        do {
            let rows: [Profile] = try await SB.client
                .from("profiles")
                .select("user_id, username, full_name, tier, avatar_url")
                .eq("user_id", value: user.id.uuidString)
                .limit(1)
                .execute()
                .value
            profile = rows.first
        } catch {
            profile = nil
        }
    }
}
