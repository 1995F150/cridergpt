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
    @Published var lastError: String?

    private init() {}

    // MARK: - Session

    func restoreSession() async {
        do {
            let session = try await SB.client.auth.session
            state = .signedIn(session.user)
        } catch {
            state = .signedOut
        }
        // Subscribe to future auth state changes
        Task { [weak self] in
            for await change in SB.client.auth.authStateChanges {
                guard let self else { return }
                if let user = change.session?.user {
                    self.state = .signedIn(user)
                } else {
                    self.state = .signedOut
                }
            }
        }
    }

    // MARK: - Email / Password

    func signIn(email: String, password: String) async {
        do {
            let session = try await SB.client.auth.signIn(email: email, password: password)
            state = .signedIn(session.user)
        } catch {
            lastError = error.localizedDescription
        }
    }

    func signUp(email: String, password: String) async {
        do {
            let result = try await SB.client.auth.signUp(email: email, password: password)
            if let user = result.user as User? {
                state = .signedIn(user)
            }
        } catch {
            lastError = error.localizedDescription
        }
    }

    func signOut() async {
        do {
            try await SB.client.auth.signOut()
            state = .signedOut
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
        } catch {
            lastError = error.localizedDescription
        }
    }
}
