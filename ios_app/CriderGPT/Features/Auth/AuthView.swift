import SwiftUI
import AuthenticationServices

struct AuthView: View {
    @EnvironmentObject var auth: AuthService

    @State private var mode: Mode = .signIn
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false

    enum Mode { case signIn, signUp }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Spacer(minLength: 60)

                VStack(spacing: 8) {
                    Image(systemName: "bolt.horizontal.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(Theme.accent)
                    Text("CriderGPT")
                        .font(.largeTitle.bold())
                        .foregroundStyle(Theme.textPrimary)
                    Text(mode == .signIn ? "Sign in to continue" : "Create your account")
                        .foregroundStyle(Theme.textSecondary)
                }
                .padding(.bottom, 8)

                VStack(spacing: 12) {
                    TextField("", text: $email,
                              prompt: Text("Email").foregroundColor(Theme.textMuted))
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .textInputAutocapitalization(.never)
                        .padding()
                        .background(Theme.surface)
                        .foregroundStyle(Theme.textPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))

                    SecureField("", text: $password,
                                prompt: Text("Password").foregroundColor(Theme.textMuted))
                        .textContentType(mode == .signIn ? .password : .newPassword)
                        .padding()
                        .background(Theme.surface)
                        .foregroundStyle(Theme.textPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))

                    Button(action: submit) {
                        Text(mode == .signIn ? "Sign in" : "Create account")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Theme.accent)
                            .foregroundStyle(.black)
                            .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                    }
                    .disabled(busy || email.isEmpty || password.isEmpty)
                }

                Divider().background(Theme.border).padding(.vertical, 4)

                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    Task {
                        switch result {
                        case .success(let auth):
                            if let credential = auth.credential as? ASAuthorizationAppleIDCredential {
                                await self.auth.handleAppleCredential(credential)
                            }
                        case .failure(let error):
                            self.auth.lastError = error.localizedDescription
                        }
                    }
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 50)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius))

                Button(action: googleSignIn) {
                    HStack {
                        Image(systemName: "globe")
                        Text("Continue with Google")
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Theme.surfaceAlt)
                    .foregroundStyle(Theme.textPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                }

                Button {
                    mode = (mode == .signIn) ? .signUp : .signIn
                } label: {
                    Text(mode == .signIn
                         ? "Need an account? Sign up"
                         : "Already have an account? Sign in")
                        .foregroundStyle(Theme.accent)
                        .font(.subheadline)
                }
                .padding(.top, 8)

                if let err = auth.lastError {
                    ErrorBanner(message: err)
                }

                Spacer()
            }
            .padding(.horizontal, Theme.padding)
        }
        .background(Theme.background.ignoresSafeArea())
    }

    private func submit() {
        busy = true
        Task {
            switch mode {
            case .signIn: await auth.signIn(email: email, password: password)
            case .signUp: await auth.signUp(email: email, password: password)
            }
            busy = false
        }
    }

    private func googleSignIn() {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let root = scene.windows.first?.rootViewController else { return }
        Task { await auth.signInWithGoogle(presenting: root) }
    }
}
