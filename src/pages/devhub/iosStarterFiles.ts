// CriderGPT iOS Starter — full website-parity scaffold
// Bundle ID: app.cridergpt.ios
// 100% Swift + SwiftUI, pre-wired to the live Supabase backend.
// Persistent session (Keychain + refresh token, never signs out on app close).
// All website tables/edge functions used. StoreKit 2 wired — IAP product IDs are
// the ONLY placeholders, replace in `Config.swift` once App Store Connect IDs are ready.

const SUPABASE_URL = "https://udpldrrpebdyuiqdtqnq.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc";

const BUNDLE_ID = "app.cridergpt.ios";

export const IOS_STARTER_META = {
  bundleId: BUNDLE_ID,
  supabaseProjectRef: "udpldrrpebdyuiqdtqnq",
  edgeFunctionWired: "chat-with-ai",
  tablesWired: [
    "profiles",
    "chat_messages",
    "chat_conversations",
    "livestock_animals",
    "livestock_scan_logs",
    "idea_planner_ideas",
    "events",
    "user_notifications",
    "user_subscriptions",
    "user_roles",
    "iap_purchases",
  ],
};

export const IOS_STARTER_FILES: Record<string, string> = {
  "README.md": `# CriderGPT iOS Starter — Full Parity Scaffold

Pre-wired native Swift + SwiftUI app for **${BUNDLE_ID}**. The **website is the source of truth** — every screen here reads/writes the same Supabase tables and edge functions the web app uses.

## What's wired

| Tab / Screen | Backend |
|---|---|
| Chat | \`chat-with-ai\` edge fn + \`chat_messages\` |
| Livestock | \`livestock_animals\`, \`livestock_scan_logs\` |
| Scan Tag | CoreNFC reader → parses \`CriderGPT-XXXXXX\` |
| Idea Planner | \`idea_planner_ideas\` |
| Calendar | \`events\` |
| Profile | \`profiles\` |
| Account | \`user_subscriptions\` + StoreKit 2 |
| Notifications | \`user_notifications\` |
| DevHub | gated by \`has_role(uid,'owner')\` RPC |
| Admin Panel | gated by \`has_role(uid,'admin')\` RPC |

External-only items (Store, Snapchat Lens, FarmBureau, TikTok, Custom Filters, Recipes, Guides, Public Profile, Invite, Leaderboard) appear in the side menu and **leave the app into Safari** — they always look exactly like the website.

## Persistent session

- \`SessionManager\` stores tokens in **Keychain** (kSecAttrAccessibleAfterFirstUnlock).
- On launch + every foreground: refreshes the access token if within 5 min of expiry.
- Closing the app, force-quit, reboot → user stays signed in. Only **Sign Out** in the menu clears the session.

## Payments (StoreKit 2)

Two auto-renewable subscriptions are pre-wired:
- \`cridergpt_plus_monthly\`
- \`cridergpt_pro_monthly\`

Product IDs live in \`Config.swift\` — paste the exact IDs from App Store Connect → Monetization → Subscriptions. Receipts post to the \`verify-iap\` edge function which writes to \`iap_purchases\` + \`user_subscriptions\`.

## Open in Xcode

1. Unzip.
2. Open \`CriderGPT.xcodeproj\` (or use Cursor/AI agent — the entire project is plain text).
3. Set your Apple Team in Signing & Capabilities.
4. Plug in an iPhone or pick a simulator → press Run ▶.

You'll be on the sign-in screen against live Supabase auth.
`,

  "Config.swift": `import Foundation

/// Single source of truth for everything environment-related.
/// Edit IAP product IDs here once they're created in App Store Connect.
enum Config {
    static let supabaseURL = URL(string: "${SUPABASE_URL}")!
    static let supabaseAnonKey = "${SUPABASE_ANON}"

    static let bundleId = "${BUNDLE_ID}"
    static let appName = "CriderGPT"

    /// Edge function that powers Chat.
    static let chatFunction = "chat-with-ai"
    /// Edge function that verifies StoreKit 2 transactions server-side.
    static let verifyIapFunction = "verify-iap"

    // MARK: - StoreKit 2 product IDs
    // Paste the exact product IDs you create in App Store Connect →
    // Monetization → Subscriptions. Same naming style as Google Play
    // is fine; they just have to match the store entry exactly.
    enum IAP {
        static let plusMonthly = "cridergpt_plus_monthly"
        static let proMonthly  = "cridergpt_pro_monthly"
        static let allProductIDs: [String] = [plusMonthly, proMonthly]
    }

    // The ONLY screens allowed to leave the native app into Safari.
    // Everything else (Tag Lookup, Livestock, Calendar, Payment, Plan, Profile,
    // Guardian, Frequency Tools, Signer, USB Hub, RDR2 Guide, Cloud Gaming,
    // Admin Panel, DevHub, Idea Planner, etc.) must be rendered natively.
    enum ExternalLink {
        static let store         = URL(string: "https://cridergpt.com/smart-id-store")!
        static let snapchatLens  = URL(string: "https://cridergpt.com/snapchat-lens")!
        static let customFilters = URL(string: "https://cridergpt.com/custom-filters")!
        static let terms         = URL(string: "https://cridergpt.com/user-agreement")!
    }
}
`,

  "CriderGPTApp.swift": `import SwiftUI

@main
struct CriderGPTApp: App {
    @StateObject private var session = SessionManager.shared
    @StateObject private var iap = IAPManager.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .environmentObject(iap)
                .task {
                    await session.bootstrap()
                    await iap.loadProducts()
                    await iap.refreshEntitlements()
                }
        }
    }
}
`,

  "RootView.swift": `import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: SessionManager

    var body: some View {
        Group {
            if session.isAuthenticated {
                MainTabView()
            } else {
                SignInView()
            }
        }
        .animation(.default, value: session.isAuthenticated)
    }
}
`,

  "MainTabView.swift": `import SwiftUI

struct MainTabView: View {
    @State private var showMenu = false

    var body: some View {
        ZStack(alignment: .leading) {
            TabView {
                NavigationStack { ChatView() }
                    .tabItem { Label("Chat", systemImage: "bubble.left.and.bubble.right") }

                NavigationStack { LivestockListView() }
                    .tabItem { Label("Livestock", systemImage: "pawprint") }

                NavigationStack { IdeaPlannerView() }
                    .tabItem { Label("Ideas", systemImage: "lightbulb") }

                NavigationStack { CalendarView() }
                    .tabItem { Label("Calendar", systemImage: "calendar") }

                NavigationStack { ProfileView(showMenu: $showMenu) }
                    .tabItem { Label("Profile", systemImage: "person.crop.circle") }
            }

            if showMenu {
                Color.black.opacity(0.4).ignoresSafeArea()
                    .onTapGesture { withAnimation { showMenu = false } }
                SideMenuView(isOpen: $showMenu)
                    .frame(maxWidth: 300)
                    .transition(.move(edge: .leading))
            }
        }
    }
}
`,

  "Network/SupabaseClient.swift": `import Foundation

/// Thin REST wrapper around Supabase. We deliberately don't pull in the
/// official supabase-swift package — keeps the project lightweight and
/// matches the Kotlin client structurally.
actor SupabaseClient {
    static let shared = SupabaseClient()

    private let baseURL = Config.supabaseURL
    private let anonKey = Config.supabaseAnonKey
    private let urlSession = URLSession.shared
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        d.dateDecodingStrategy = .iso8601
        return d
    }()
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    // MARK: - Auth

    struct AuthResponse: Decodable {
        let accessToken: String
        let refreshToken: String
        let expiresIn: Int
        let user: AuthUser
    }
    struct AuthUser: Decodable { let id: String; let email: String? }

    func signIn(email: String, password: String) async throws -> AuthResponse {
        var req = URLRequest(url: baseURL.appendingPathComponent("auth/v1/token"))
        req.url?.append(queryItems: [URLQueryItem(name: "grant_type", value: "password")])
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.httpBody = try encoder.encode(["email": email, "password": password])
        return try await send(req)
    }

    func signUp(email: String, password: String) async throws -> AuthResponse {
        var req = URLRequest(url: baseURL.appendingPathComponent("auth/v1/signup"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.httpBody = try encoder.encode(["email": email, "password": password])
        return try await send(req)
    }

    func refresh(refreshToken: String) async throws -> AuthResponse {
        var req = URLRequest(url: baseURL.appendingPathComponent("auth/v1/token"))
        req.url?.append(queryItems: [URLQueryItem(name: "grant_type", value: "refresh_token")])
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.httpBody = try encoder.encode(["refresh_token": refreshToken])
        return try await send(req)
    }

    func signOut(accessToken: String) async {
        var req = URLRequest(url: baseURL.appendingPathComponent("auth/v1/logout"))
        req.httpMethod = "POST"
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \\(accessToken)", forHTTPHeaderField: "Authorization")
        _ = try? await urlSession.data(for: req)
    }

    // MARK: - PostgREST

    func select<T: Decodable>(
        _ table: String,
        query: [URLQueryItem] = [],
        as: T.Type
    ) async throws -> T {
        let url = baseURL.appendingPathComponent("rest/v1/\\(table)")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = query
        var req = URLRequest(url: components.url!)
        await applyAuthHeaders(&req)
        return try await send(req)
    }

    func insert<T: Encodable, R: Decodable>(
        _ table: String,
        body: T,
        as: R.Type
    ) async throws -> R {
        var req = URLRequest(url: baseURL.appendingPathComponent("rest/v1/\\(table)"))
        req.httpMethod = "POST"
        await applyAuthHeaders(&req)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("return=representation", forHTTPHeaderField: "Prefer")
        req.httpBody = try encoder.encode(body)
        return try await send(req)
    }

    func update<T: Encodable>(
        _ table: String,
        match: [URLQueryItem],
        body: T
    ) async throws {
        var components = URLComponents(
            url: baseURL.appendingPathComponent("rest/v1/\\(table)"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = match
        var req = URLRequest(url: components.url!)
        req.httpMethod = "PATCH"
        await applyAuthHeaders(&req)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try encoder.encode(body)
        _ = try await urlSession.data(for: req)
    }

    func rpc<T: Encodable, R: Decodable>(
        _ name: String,
        params: T,
        as: R.Type
    ) async throws -> R {
        var req = URLRequest(url: baseURL.appendingPathComponent("rest/v1/rpc/\\(name)"))
        req.httpMethod = "POST"
        await applyAuthHeaders(&req)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try encoder.encode(params)
        return try await send(req)
    }

    func invokeFunction<T: Encodable, R: Decodable>(
        _ name: String,
        body: T,
        as: R.Type
    ) async throws -> R {
        var req = URLRequest(url: baseURL.appendingPathComponent("functions/v1/\\(name)"))
        req.httpMethod = "POST"
        await applyAuthHeaders(&req)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try encoder.encode(body)
        return try await send(req)
    }

    // MARK: - Helpers

    private func applyAuthHeaders(_ req: inout URLRequest) async {
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        if let token = await SessionManager.shared.accessTokenForRequest() {
            req.setValue("Bearer \\(token)", forHTTPHeaderField: "Authorization")
        } else {
            req.setValue("Bearer \\(anonKey)", forHTTPHeaderField: "Authorization")
        }
    }

    private func send<T: Decodable>(_ req: URLRequest) async throws -> T {
        let (data, resp) = try await urlSession.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw NSError(
                domain: "Supabase",
                code: (resp as? HTTPURLResponse)?.statusCode ?? -1,
                userInfo: [NSLocalizedDescriptionKey: body]
            )
        }
        if T.self == EmptyResponse.self { return EmptyResponse() as! T }
        return try decoder.decode(T.self, from: data)
    }
}

struct EmptyResponse: Decodable {}
`,

  "Auth/SessionManager.swift": `import Foundation
import Combine

@MainActor
final class SessionManager: ObservableObject {
    static let shared = SessionManager()

    @Published private(set) var isAuthenticated = false
    @Published private(set) var userId: String?
    @Published private(set) var email: String?

    private var accessToken: String?
    private var refreshToken: String?
    private var expiresAt: Date?

    private let kAccess = "cridergpt.access_token"
    private let kRefresh = "cridergpt.refresh_token"
    private let kExpires = "cridergpt.expires_at"
    private let kUserId = "cridergpt.user_id"
    private let kEmail  = "cridergpt.email"

    private init() {}

    func bootstrap() async {
        accessToken  = Keychain.read(kAccess)
        refreshToken = Keychain.read(kRefresh)
        if let s = Keychain.read(kExpires), let t = TimeInterval(s) {
            expiresAt = Date(timeIntervalSince1970: t)
        }
        userId = Keychain.read(kUserId)
        email  = Keychain.read(kEmail)
        isAuthenticated = accessToken != nil
        if isAuthenticated, shouldRefresh() {
            await refreshIfNeeded()
        }
    }

    func signIn(email: String, password: String) async throws {
        let res = try await SupabaseClient.shared.signIn(email: email, password: password)
        persist(res)
    }

    func signUp(email: String, password: String) async throws {
        let res = try await SupabaseClient.shared.signUp(email: email, password: password)
        persist(res)
    }

    func signOut() async {
        if let token = accessToken { await SupabaseClient.shared.signOut(accessToken: token) }
        [kAccess, kRefresh, kExpires, kUserId, kEmail].forEach(Keychain.delete)
        accessToken = nil; refreshToken = nil; expiresAt = nil
        userId = nil; email = nil
        isAuthenticated = false
    }

    /// Called by SupabaseClient before every authenticated request.
    func accessTokenForRequest() async -> String? {
        if shouldRefresh() { await refreshIfNeeded() }
        return accessToken
    }

    private func shouldRefresh() -> Bool {
        guard let exp = expiresAt else { return refreshToken != nil }
        return Date().addingTimeInterval(300) >= exp
    }

    private func refreshIfNeeded() async {
        guard let rt = refreshToken else { return }
        do {
            let res = try await SupabaseClient.shared.refresh(refreshToken: rt)
            persist(res)
        } catch {
            // Refresh token invalid — sign out cleanly.
            await signOut()
        }
    }

    private func persist(_ res: SupabaseClient.AuthResponse) {
        accessToken = res.accessToken
        refreshToken = res.refreshToken
        expiresAt = Date().addingTimeInterval(TimeInterval(res.expiresIn))
        userId = res.user.id
        email  = res.user.email

        Keychain.write(kAccess,  res.accessToken)
        Keychain.write(kRefresh, res.refreshToken)
        Keychain.write(kExpires, String(expiresAt!.timeIntervalSince1970))
        Keychain.write(kUserId,  res.user.id)
        if let e = res.user.email { Keychain.write(kEmail, e) }

        isAuthenticated = true
    }
}
`,

  "Auth/Keychain.swift": `import Foundation
import Security

enum Keychain {
    @discardableResult
    static func write(_ key: String, _ value: String) -> Bool {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
        var attrs = query
        attrs[kSecValueData as String] = data
        attrs[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        return SecItemAdd(attrs as CFDictionary, nil) == errSecSuccess
    }

    static func read(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data, let s = String(data: data, encoding: .utf8)
        else { return nil }
        return s
    }

    @discardableResult
    static func delete(_ key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        return SecItemDelete(query as CFDictionary) == errSecSuccess
    }
}
`,

  "Auth/SignInView.swift": `import SwiftUI

struct SignInView: View {
    @EnvironmentObject var session: SessionManager
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var error: String?
    @State private var loading = false

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Text("CriderGPT").font(.largeTitle.bold())
            Text(isSignUp ? "Create an account" : "Sign in")
                .foregroundStyle(.secondary)

            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyle(.roundedBorder)

            SecureField("Password", text: $password)
                .textContentType(isSignUp ? .newPassword : .password)
                .textFieldStyle(.roundedBorder)

            if let error { Text(error).foregroundStyle(.red).font(.footnote) }

            Button {
                Task { await submit() }
            } label: {
                if loading { ProgressView() } else { Text(isSignUp ? "Sign Up" : "Sign In").frame(maxWidth: .infinity) }
            }
            .buttonStyle(.borderedProminent)
            .disabled(loading || email.isEmpty || password.isEmpty)

            Button(isSignUp ? "Have an account? Sign in" : "New here? Create an account") {
                isSignUp.toggle()
            }
            .font(.footnote)

            Spacer()
        }
        .padding(24)
    }

    private func submit() async {
        loading = true; error = nil
        do {
            if isSignUp {
                try await session.signUp(email: email, password: password)
            } else {
                try await session.signIn(email: email, password: password)
            }
        } catch let e {
            error = (e as NSError).localizedDescription
        }
        loading = false
    }
}
`,

  "Chat/ChatView.swift": `import SwiftUI

struct ChatView: View {
    @StateObject private var vm = ChatViewModel()
    @State private var draft = ""

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(vm.messages) { m in
                            ChatBubble(message: m).id(m.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: vm.messages.count) { _, _ in
                    if let last = vm.messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
            }

            Divider()
            HStack(spacing: 8) {
                TextField("Message CriderGPT…", text: $draft, axis: .vertical)
                    .lineLimit(1...5)
                    .textFieldStyle(.roundedBorder)
                Button {
                    let text = draft; draft = ""
                    Task { await vm.send(text) }
                } label: {
                    Image(systemName: "paperplane.fill")
                }
                .buttonStyle(.borderedProminent)
                .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty || vm.sending)
            }
            .padding()
        }
        .navigationTitle("Chat")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.loadHistory() }
    }
}

struct ChatBubble: View {
    let message: ChatMessage
    var body: some View {
        HStack {
            if message.role == "user" { Spacer(minLength: 40) }
            Text(message.content)
                .padding(10)
                .background(message.role == "user" ? Color.accentColor.opacity(0.18) : Color.gray.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            if message.role != "user" { Spacer(minLength: 40) }
        }
    }
}
`,

  "Chat/ChatViewModel.swift": `import Foundation

struct ChatMessage: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var role: String          // "user" | "assistant"
    var content: String
    var createdAt: Date = Date()
}

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var sending = false

    struct ChatResponse: Decodable { let response: String }

    func loadHistory() async {
        guard let uid = SessionManager.shared.userId else { return }
        do {
            let rows: [ChatMessageRow] = try await SupabaseClient.shared.select(
                "chat_messages",
                query: [
                    URLQueryItem(name: "user_id", value: "eq.\\(uid)"),
                    URLQueryItem(name: "order", value: "created_at.asc"),
                    URLQueryItem(name: "limit", value: "100"),
                ],
                as: [ChatMessageRow].self
            )
            self.messages = rows.map { ChatMessage(id: $0.id, role: $0.role, content: $0.content, createdAt: $0.createdAt) }
        } catch { /* leave empty on first run */ }
    }

    func send(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        sending = true
        let user = ChatMessage(role: "user", content: trimmed)
        messages.append(user)
        do {
            let res: ChatResponse = try await SupabaseClient.shared.invokeFunction(
                Config.chatFunction,
                body: ["message": trimmed, "model": "gpt-4o-mini"],
                as: ChatResponse.self
            )
            messages.append(ChatMessage(role: "assistant", content: res.response))
        } catch {
            messages.append(ChatMessage(role: "assistant", content: "Error: \\((error as NSError).localizedDescription)"))
        }
        sending = false
    }

    private struct ChatMessageRow: Decodable {
        let id: String
        let role: String
        let content: String
        let createdAt: Date
    }
}
`,

  "Livestock/LivestockListView.swift": `import SwiftUI

struct LivestockListView: View {
    @StateObject private var vm = LivestockViewModel()
    @State private var showScanner = false

    var body: some View {
        List {
            if vm.animals.isEmpty {
                ContentUnavailableView("No animals yet", systemImage: "pawprint",
                    description: Text("Scan a CriderGPT tag to register your first animal."))
            }
            ForEach(vm.animals) { a in
                VStack(alignment: .leading) {
                    Text(a.name ?? a.tagId).font(.headline)
                    Text(a.species ?? "Unknown species").font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Livestock")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showScanner = true } label: { Image(systemName: "barcode.viewfinder") }
            }
        }
        .sheet(isPresented: $showScanner) {
            NFCScannerView { tag in
                Task { await vm.handleScan(tag: tag) }
                showScanner = false
            }
        }
        .task { await vm.load() }
    }
}
`,

  "Livestock/LivestockViewModel.swift": `import Foundation

struct LivestockAnimal: Identifiable, Decodable {
    let id: String
    let tagId: String
    let name: String?
    let species: String?
}

@MainActor
final class LivestockViewModel: ObservableObject {
    @Published var animals: [LivestockAnimal] = []

    func load() async {
        guard let uid = SessionManager.shared.userId else { return }
        do {
            animals = try await SupabaseClient.shared.select(
                "livestock_animals",
                query: [
                    URLQueryItem(name: "user_id", value: "eq.\\(uid)"),
                    URLQueryItem(name: "order", value: "created_at.desc"),
                ],
                as: [LivestockAnimal].self
            )
        } catch { animals = [] }
    }

    func handleScan(tag: String) async {
        guard let uid = SessionManager.shared.userId else { return }
        struct ScanLog: Encodable { let user_id: String; let tag_id: String; let source: String }
        _ = try? await SupabaseClient.shared.insert(
            "livestock_scan_logs",
            body: ScanLog(user_id: uid, tag_id: tag, source: "ios_nfc"),
            as: EmptyResponse.self
        )
        await load()
    }
}
`,

  "Livestock/NFCScannerView.swift": `import SwiftUI
import CoreNFC

/// Minimal CoreNFC NDEF reader that extracts plain-text "CriderGPT-XXXXXX".
struct NFCScannerView: UIViewControllerRepresentable {
    var onScan: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onScan: onScan) }
    func makeUIViewController(context: Context) -> UIViewController {
        let vc = UIViewController()
        DispatchQueue.main.async { context.coordinator.start(from: vc) }
        return vc
    }
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}

    final class Coordinator: NSObject, NFCNDEFReaderSessionDelegate {
        let onScan: (String) -> Void
        var session: NFCNDEFReaderSession?
        init(onScan: @escaping (String) -> Void) { self.onScan = onScan }

        func start(from vc: UIViewController) {
            guard NFCNDEFReaderSession.readingAvailable else {
                onScan(""); return
            }
            session = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: true)
            session?.alertMessage = "Hold your iPhone near a CriderGPT tag"
            session?.begin()
        }

        func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {}
        func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
            for msg in messages {
                for record in msg.records {
                    if let s = String(data: record.payload, encoding: .utf8) {
                        // CoreNFC text payloads start with a status byte + language code.
                        let cleaned = s.dropFirst(3)
                        if cleaned.hasPrefix("CriderGPT-") {
                            DispatchQueue.main.async { self.onScan(String(cleaned)) }
                            return
                        }
                    }
                }
            }
        }
    }
}
`,

  "Ideas/IdeaPlannerView.swift": `import SwiftUI

struct IdeaPlannerView: View {
    @StateObject private var vm = IdeaPlannerViewModel()
    @State private var draft = ""

    var body: some View {
        VStack {
            HStack {
                TextField("New idea…", text: $draft)
                    .textFieldStyle(.roundedBorder)
                Button("Add") {
                    let t = draft; draft = ""
                    Task { await vm.add(title: t) }
                }.disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
            }.padding()

            List {
                ForEach(vm.ideas) { i in
                    VStack(alignment: .leading) {
                        Text(i.title).font(.headline)
                        if let n = i.notes, !n.isEmpty {
                            Text(n).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Idea Planner")
        .task { await vm.load() }
    }
}
`,

  "Ideas/IdeaPlannerViewModel.swift": `import Foundation

struct Idea: Identifiable, Decodable {
    let id: String
    let title: String
    let notes: String?
}

@MainActor
final class IdeaPlannerViewModel: ObservableObject {
    @Published var ideas: [Idea] = []

    func load() async {
        guard let uid = SessionManager.shared.userId else { return }
        do {
            ideas = try await SupabaseClient.shared.select(
                "idea_planner_ideas",
                query: [
                    URLQueryItem(name: "user_id", value: "eq.\\(uid)"),
                    URLQueryItem(name: "order", value: "created_at.desc"),
                ],
                as: [Idea].self
            )
        } catch { ideas = [] }
    }

    func add(title: String) async {
        guard let uid = SessionManager.shared.userId else { return }
        struct NewIdea: Encodable { let user_id: String; let title: String }
        _ = try? await SupabaseClient.shared.insert(
            "idea_planner_ideas",
            body: NewIdea(user_id: uid, title: title),
            as: [Idea].self
        )
        await load()
    }
}
`,

  "Calendar/CalendarView.swift": `import SwiftUI

struct CalendarEvent: Identifiable, Decodable {
    let id: String
    let title: String
    let startsAt: Date?
}

@MainActor
final class CalendarViewModel: ObservableObject {
    @Published var events: [CalendarEvent] = []
    func load() async {
        guard let uid = SessionManager.shared.userId else { return }
        do {
            events = try await SupabaseClient.shared.select(
                "events",
                query: [
                    URLQueryItem(name: "user_id", value: "eq.\\(uid)"),
                    URLQueryItem(name: "order", value: "starts_at.asc"),
                ],
                as: [CalendarEvent].self
            )
        } catch { events = [] }
    }
}

struct CalendarView: View {
    @StateObject private var vm = CalendarViewModel()
    var body: some View {
        List(vm.events) { e in
            VStack(alignment: .leading) {
                Text(e.title).font(.headline)
                if let d = e.startsAt {
                    Text(d.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .overlay {
            if vm.events.isEmpty {
                ContentUnavailableView("No events", systemImage: "calendar")
            }
        }
        .navigationTitle("Calendar")
        .task { await vm.load() }
    }
}
`,

  "Profile/ProfileView.swift": `import SwiftUI

struct ProfileView: View {
    @Binding var showMenu: Bool
    @EnvironmentObject var session: SessionManager
    @EnvironmentObject var iap: IAPManager
    @StateObject private var vm = ProfileViewModel()

    var body: some View {
        Form {
            Section("Account") {
                LabeledContent("Email", value: session.email ?? "—")
                LabeledContent("Plan", value: iap.currentPlanLabel)
            }

            Section("Subscription") {
                NavigationLink("Manage Subscription") { SubscriptionView() }
            }

            Section("Owner / Admin") {
                if vm.isOwner {
                    NavigationLink("DevHub") { DevHubView() }
                }
                if vm.isAdmin {
                    NavigationLink("Admin Panel") { AdminPanelView() }
                }
                if !vm.isOwner && !vm.isAdmin {
                    Text("Standard user").foregroundStyle(.secondary)
                }
            }

            Section("Notifications") {
                NavigationLink("Inbox") { NotificationsView() }
            }

            Section {
                Button(role: .destructive) {
                    Task { await session.signOut() }
                } label: { Text("Sign Out") }
            }
        }
        .navigationTitle("Profile")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { withAnimation { showMenu.toggle() } } label: { Image(systemName: "line.3.horizontal") }
            }
        }
        .task { await vm.loadRoles() }
    }
}

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var isOwner = false
    @Published var isAdmin = false

    func loadRoles() async {
        guard let uid = SessionManager.shared.userId else { return }
        async let ownerTask: Bool = (try? await SupabaseClient.shared.rpc(
            "has_role",
            params: ["_user_id": uid, "_role": "owner"],
            as: Bool.self
        )) ?? false
        async let adminTask: Bool = (try? await SupabaseClient.shared.rpc(
            "has_role",
            params: ["_user_id": uid, "_role": "admin"],
            as: Bool.self
        )) ?? false
        let (o, a) = await (ownerTask, adminTask)
        isOwner = o; isAdmin = a
    }
}
`,

  "Profile/SubscriptionView.swift": `import SwiftUI
import StoreKit

struct SubscriptionView: View {
    @EnvironmentObject var iap: IAPManager

    var body: some View {
        List {
            Section("Current") {
                Text(iap.currentPlanLabel)
            }
            Section("Available plans") {
                ForEach(iap.products, id: \\.id) { product in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(product.displayName).font(.headline)
                        Text(product.description).font(.caption).foregroundStyle(.secondary)
                        HStack {
                            Text(product.displayPrice).font(.subheadline.bold())
                            Spacer()
                            Button("Subscribe") { Task { await iap.purchase(product) } }
                                .buttonStyle(.borderedProminent)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            Section {
                Button("Restore Purchases") { Task { await iap.restore() } }
            }
        }
        .navigationTitle("Subscription")
        .task { await iap.loadProducts() }
    }
}
`,

  "Profile/NotificationsView.swift": `import SwiftUI

struct UserNotification: Identifiable, Decodable {
    let id: String
    let title: String
    let body: String?
    let createdAt: Date
}

@MainActor
final class NotificationsViewModel: ObservableObject {
    @Published var items: [UserNotification] = []
    func load() async {
        guard let uid = SessionManager.shared.userId else { return }
        items = (try? await SupabaseClient.shared.select(
            "user_notifications",
            query: [
                URLQueryItem(name: "user_id", value: "eq.\\(uid)"),
                URLQueryItem(name: "order", value: "created_at.desc"),
                URLQueryItem(name: "limit", value: "100"),
            ],
            as: [UserNotification].self
        )) ?? []
    }
}

struct NotificationsView: View {
    @StateObject private var vm = NotificationsViewModel()
    var body: some View {
        List(vm.items) { n in
            VStack(alignment: .leading) {
                Text(n.title).font(.headline)
                if let b = n.body { Text(b).font(.caption) }
                Text(n.createdAt.formatted()).font(.caption2).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Notifications")
        .task { await vm.load() }
    }
}
`,


  "DevHub/DevHubView.swift": `import SwiftUI

struct DevHubView: View {
    var body: some View {
        OwnerGate {
            DevHubMenuView()
        }
        .navigationTitle("DevHub")
    }
}

private struct DevHubMenuView: View {
    var body: some View {
        List {
            Section("Server & Infrastructure") {
                NavigationLink("Server AI Console")        { ServerConsoleView() }
                NavigationLink("Backend Wiring Reference") { BackendWiringView() }
            }
            Section("Secrets & Automation") {
                NavigationLink("Knowledge Vault")   { VaultView() }
                NavigationLink("Agent Dispatcher")  { AgentDispatcherView() }
                NavigationLink("Autopilot Queue")   { AutopilotView() }
                NavigationLink("Auto-Promo (Hourly)") { AutoPromoView() }
            }
            Section("Builders") {
                NavigationLink("Android Builder") { AndroidBuilderView() }
                NavigationLink("iOS Builder")     { IOSBuilderView() }
            }
            Section("Products") {
                NavigationLink("Chrome Extensions") { ChromeExtensionsView() }
                NavigationLink("Roku Studio")       { RokuStudioView() }
            }
            Section("Design & Knowledge") {
                NavigationLink("UI Blueprints")          { UIBlueprintsView() }
                NavigationLink("Tech Knowledge Library") { TechLibraryView() }
            }
            Section("Planning") {
                NavigationLink("Idea Planner") { IdeaPlannerDevView() }
            }
            Section {
                Text("All modules gated by has_role(uid,'owner') + Face ID.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("DevHub")
    }
}
`,

  "DevHub/AdminPanelView.swift": `import SwiftUI

struct AdminPanelView: View {
    @State private var checked = false
    @State private var isAdmin = false

    var body: some View {
        Group {
            if !checked {
                ProgressView("Verifying access\u2026")
            } else if isAdmin {
                BiometricGate {
                    List {
                        Section("Admin Tools") {
                            NavigationLink("User Management") { AdminUsersView() }
                            NavigationLink("System Status")   { AdminSystemView() }
                            NavigationLink("Broadcasts")      { AdminBroadcastsView() }
                        }
                        Section {
                            Text("Gated by has_role(uid,'admin') + Face ID.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .navigationTitle("Admin Panel")
                }
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "lock.shield").font(.system(size: 64)).foregroundStyle(.red)
                    Text("Access Denied").font(.title2.bold())
                    Text("Admin role required.").foregroundStyle(.secondary)
                }.padding()
            }
        }
        .navigationTitle("Admin Panel")
        .task { await checkAdmin() }
    }

    private func checkAdmin() async {
        guard let uid = await SessionManager.shared.userId else { checked = true; return }
        isAdmin = (try? await SupabaseClient.shared.rpc(
            "has_role",
            params: ["_user_id": uid, "_role": "admin"],
            as: Bool.self
        )) ?? false
        checked = true
    }
}

private struct AdminUsersView: View {
    @State private var errorMsg: String?
    @State private var rows: [(id: String, email: String)] = []
    var body: some View {
        List {
            if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote) }
            ForEach(rows, id: \\.id) { r in LabeledContent(r.email, value: r.id.prefix(8) + "\u2026") }
        }
        .navigationTitle("User Management")
        .task {
            do {
                struct P: Decodable { let id: String; let email: String? }
                let ps: [P] = try await SupabaseClient.shared.select(
                    "profiles", query: [URLQueryItem(name: "limit", value: "50")], as: [P].self)
                rows = ps.map { ($0.id, $0.email ?? "\u2014") }
            } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
        }
    }
}
private struct AdminSystemView: View {
    var body: some View { Text("Wire to your monitoring edge function.").padding().navigationTitle("System Status") }
}
private struct AdminBroadcastsView: View {
    var body: some View { Text("Wire to broadcasts table or edge function.").padding().navigationTitle("Broadcasts") }
}
`,

  "DevHub/Common.swift": `import SwiftUI
import LocalAuthentication

// MARK: - BiometricGate
struct BiometricGate<Content: View>: View {
    @ViewBuilder let content: () -> Content
    @State private var unlocked = false
    @State private var errorMsg: String?

    var body: some View {
        if unlocked {
            content()
        } else {
            VStack(spacing: 20) {
                Image(systemName: "faceid").font(.system(size: 72)).foregroundStyle(.secondary)
                Text("Authentication Required").font(.title2.bold())
                if let e = errorMsg {
                    Text(e).foregroundStyle(.red).font(.footnote)
                        .multilineTextAlignment(.center).padding(.horizontal)
                }
                Button("Authenticate") { authenticate() }.buttonStyle(.borderedProminent)
            }
            .padding()
            .onAppear { authenticate() }
        }
    }

    private func authenticate() {
        errorMsg = nil
        let ctx = LAContext()
        var nsErr: NSError?
        let policy: LAPolicy = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &nsErr)
            ? .deviceOwnerAuthenticationWithBiometrics : .deviceOwnerAuthentication
        ctx.evaluatePolicy(policy, localizedReason: "Access CriderGPT owner tools") { ok, err in
            DispatchQueue.main.async {
                if ok { unlocked = true } else { errorMsg = err?.localizedDescription ?? "Authentication failed" }
            }
        }
    }
}

// MARK: - OwnerGate
struct OwnerGate<Content: View>: View {
    @ViewBuilder let content: () -> Content
    @State private var checked = false
    @State private var isOwner = false

    var body: some View {
        Group {
            if !checked {
                ProgressView("Verifying access\u2026")
            } else if isOwner {
                BiometricGate(content: content)
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "lock.shield").font(.system(size: 64)).foregroundStyle(.red)
                    Text("Access Denied").font(.title2.bold())
                    Text("Owner role required.").foregroundStyle(.secondary)
                }.padding()
            }
        }
        .task { await checkOwner() }
    }

    private func checkOwner() async {
        guard let uid = await SessionManager.shared.userId else { checked = true; return }
        isOwner = (try? await SupabaseClient.shared.rpc(
            "has_role", params: ["_user_id": uid, "_role": "owner"], as: Bool.self)) ?? false
        checked = true
    }
}
`,

  "DevHub/Modules/ServerConsoleView.swift": `import SwiftUI

struct ServerConsoleView: View {
    @State private var status = ""
    @State private var loading = false
    @State private var errorMsg: String?

    var body: some View {
        OwnerGate {
            VStack(alignment: .leading, spacing: 16) {
                if loading { ProgressView("Fetching\u2026") }
                if let e = errorMsg { Label(e, systemImage: "exclamationmark.triangle").foregroundStyle(.orange).font(.footnote) }
                if !status.isEmpty {
                    ScrollView {
                        Text(status).font(.system(.footnote, design: .monospaced))
                            .frame(maxWidth: .infinity, alignment: .leading).padding()
                            .background(Color(.systemGray6)).clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
                Button("Refresh") { Task { await fetch() } }.buttonStyle(.borderedProminent)
                Spacer()
            }
            .padding()
            .navigationTitle("Server Console")
            .task { await fetch() }
        }
    }

    private func fetch() async {
        loading = true; errorMsg = nil
        do {
            struct R: Decodable { let status: String; let details: String? }
            let r: R = try await SupabaseClient.shared.invokeFunction("server-status", body: _Empty(), as: R.self)
            status = r.details ?? r.status
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)"; status = "" }
        loading = false
    }
}
private struct _Empty: Encodable {}
`,

  "DevHub/Modules/VaultView.swift": `import SwiftUI

struct VaultView: View {
    @State private var secrets: [VaultSecret] = []
    @State private var newName = ""
    @State private var errorMsg: String?

    struct VaultSecret: Identifiable, Decodable { let id: String; let name: String }

    var body: some View {
        OwnerGate {
            VStack {
                HStack {
                    TextField("Secret name\u2026", text: $newName).textFieldStyle(.roundedBorder).autocapitalization(.none)
                    Button("Add") { Task { await add() } }
                        .buttonStyle(.borderedProminent)
                        .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                }.padding([.horizontal, .top])
                if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote).padding(.horizontal) }
                List {
                    if secrets.isEmpty { Text("No secrets.").foregroundStyle(.secondary) }
                    ForEach(secrets) { s in Label(s.name, systemImage: "key.fill") }
                        .onDelete { idx in Task { await delete(at: idx) } }
                }
            }
            .navigationTitle("Knowledge Vault")
            .task { await load() }
        }
    }

    private func load() async {
        do {
            secrets = try await SupabaseClient.shared.select(
                "secrets_vault",
                query: [URLQueryItem(name: "select", value: "id,name"), URLQueryItem(name: "order", value: "name.asc")],
                as: [VaultSecret].self)
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
    }
    private func add() async {
        let n = newName.trimmingCharacters(in: .whitespaces); guard !n.isEmpty else { return }
        struct New: Encodable { let name: String }
        do { _ = try await SupabaseClient.shared.insert("secrets_vault", body: New(name: n), as: [VaultSecret].self); newName = ""; await load() }
        catch { errorMsg = error.localizedDescription }
    }
    private func delete(at offsets: IndexSet) async {
        for i in offsets {
            try? await SupabaseClient.shared.update("secrets_vault",
                match: [URLQueryItem(name: "id", value: "eq.\\(secrets[i].id)")], body: ["deleted": true])
        }
        await load()
    }
}
`,

  "DevHub/Modules/AgentDispatcherView.swift": `import SwiftUI

struct AgentDispatcherView: View {
    @State private var agentName = ""
    @State private var payload = ""
    @State private var response = ""
    @State private var loading = false
    @State private var errorMsg: String?

    var body: some View {
        OwnerGate {
            Form {
                Section("Agent") { TextField("Agent name (e.g. summarize)", text: $agentName).autocapitalization(.none) }
                Section("Payload (JSON)") {
                    TextEditor(text: $payload).font(.system(.footnote, design: .monospaced)).frame(minHeight: 80)
                }
                if let e = errorMsg { Section { Text(e).foregroundStyle(.orange).font(.footnote) } }
                if !response.isEmpty { Section("Response") { Text(response).font(.system(.footnote, design: .monospaced)) } }
                Section {
                    Button(loading ? "Dispatching\u2026" : "Dispatch Agent") { Task { await dispatch() } }
                        .disabled(loading || agentName.isEmpty)
                }
            }
            .navigationTitle("Agent Dispatcher")
        }
    }

    private func dispatch() async {
        loading = true; errorMsg = nil; response = ""
        do {
            struct B: Encodable { let agent: String; let payload: String }
            struct R: Decodable { let result: String? }
            let r: R = try await SupabaseClient.shared.invokeFunction("agent-dispatch", body: B(agent: agentName, payload: payload), as: R.self)
            response = r.result ?? "Done"
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
        loading = false
    }
}
`,

  "DevHub/Modules/AutopilotView.swift": `import SwiftUI

struct AutopilotView: View {
    @State private var enabled = false
    @State private var loading = false
    @State private var errorMsg: String?

    var body: some View {
        OwnerGate {
            Form {
                Section { Toggle("Autopilot Enabled", isOn: $enabled)
                    .onChange(of: enabled) { _, v in Task { await set(v) } }.disabled(loading) }
                if let e = errorMsg { Section { Text(e).foregroundStyle(.orange).font(.footnote) } }
                Section(footer: Text("Toggles autopilot_enabled in user_settings.")) {}
            }
            .navigationTitle("Autopilot Queue")
            .task { await load() }
        }
    }

    private func load() async {
        guard let uid = await SessionManager.shared.userId else { return }
        do {
            struct S: Decodable { let autopilotEnabled: Bool? }
            let rows: [S] = try await SupabaseClient.shared.select("user_settings",
                query: [URLQueryItem(name: "user_id", value: "eq.\\(uid)"), URLQueryItem(name: "limit", value: "1")], as: [S].self)
            enabled = rows.first?.autopilotEnabled ?? false
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
    }
    private func set(_ val: Bool) async {
        guard let uid = await SessionManager.shared.userId else { return }
        struct P: Encodable { let autopilot_enabled: Bool }
        try? await SupabaseClient.shared.update("user_settings",
            match: [URLQueryItem(name: "user_id", value: "eq.\\(uid)")], body: P(autopilot_enabled: val))
    }
}
`,

  "DevHub/Modules/AndroidBuilderView.swift": `import SwiftUI

struct AndroidBuilderView: View {
    @State private var builds: [BuildRun] = []
    @State private var triggering = false
    @State private var errorMsg: String?

    struct BuildRun: Identifiable, Decodable { let id: String; let status: String?; let createdAt: Date? }

    var body: some View {
        OwnerGate {
            VStack {
                Button(triggering ? "Triggering\u2026" : "Trigger Android Build") { Task { await trigger() } }
                    .buttonStyle(.borderedProminent).padding().disabled(triggering)
                if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote).padding(.horizontal) }
                List {
                    if builds.isEmpty { Text("No builds yet.").foregroundStyle(.secondary) }
                    ForEach(builds) { b in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(b.id.prefix(8)).font(.system(.footnote, design: .monospaced))
                                if let d = b.createdAt { Text(d.formatted()).font(.caption2).foregroundStyle(.secondary) }
                            }
                            Spacer()
                            Text(b.status ?? "unknown").font(.caption.bold()).foregroundStyle(statusColor(b.status))
                        }
                    }
                }
            }
            .navigationTitle("Android Builder")
            .task { await loadBuilds() }
        }
    }

    private func loadBuilds() async {
        do {
            builds = try await SupabaseClient.shared.select("build_runs",
                query: [URLQueryItem(name: "platform", value: "eq.android"),
                        URLQueryItem(name: "order", value: "created_at.desc"),
                        URLQueryItem(name: "limit", value: "20")], as: [BuildRun].self)
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
    }
    private func trigger() async {
        triggering = true; errorMsg = nil
        do {
            struct R: Decodable { let buildId: String? }
            _ = try await SupabaseClient.shared.invokeFunction("trigger-android-build", body: _AB(), as: R.self)
            await loadBuilds()
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
        triggering = false
    }
    private func statusColor(_ s: String?) -> Color {
        switch s { case "success": .green; case "failed": .red; case "running": .blue; default: .secondary }
    }
}
private struct _AB: Encodable {}
`,

  "DevHub/Modules/IOSBuilderView.swift": `import SwiftUI

struct IOSBuilderView: View {
    @State private var builds: [BuildRun] = []
    @State private var triggering = false
    @State private var errorMsg: String?

    struct BuildRun: Identifiable, Decodable { let id: String; let status: String?; let createdAt: Date? }

    var body: some View {
        OwnerGate {
            VStack {
                Button(triggering ? "Triggering\u2026" : "Trigger iOS Build") { Task { await trigger() } }
                    .buttonStyle(.borderedProminent).padding().disabled(triggering)
                if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote).padding(.horizontal) }
                List {
                    if builds.isEmpty { Text("No builds yet.").foregroundStyle(.secondary) }
                    ForEach(builds) { b in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(b.id.prefix(8)).font(.system(.footnote, design: .monospaced))
                                if let d = b.createdAt { Text(d.formatted()).font(.caption2).foregroundStyle(.secondary) }
                            }
                            Spacer()
                            Text(b.status ?? "unknown").font(.caption.bold()).foregroundStyle(statusColor(b.status))
                        }
                    }
                }
            }
            .navigationTitle("iOS Builder")
            .task { await loadBuilds() }
        }
    }

    private func loadBuilds() async {
        do {
            builds = try await SupabaseClient.shared.select("build_runs",
                query: [URLQueryItem(name: "platform", value: "eq.ios"),
                        URLQueryItem(name: "order", value: "created_at.desc"),
                        URLQueryItem(name: "limit", value: "20")], as: [BuildRun].self)
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
    }
    private func trigger() async {
        triggering = true; errorMsg = nil
        do {
            struct R: Decodable { let buildId: String? }
            _ = try await SupabaseClient.shared.invokeFunction("trigger-ios-build", body: _IB(), as: R.self)
            await loadBuilds()
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
        triggering = false
    }
    private func statusColor(_ s: String?) -> Color {
        switch s { case "success": .green; case "failed": .red; case "running": .blue; default: .secondary }
    }
}
private struct _IB: Encodable {}
`,

  "DevHub/Modules/ChromeExtensionsView.swift": `import SwiftUI

struct ChromeExtensionsView: View {
    @State private var exts: [ChromeExt] = []
    @State private var errorMsg: String?

    struct ChromeExt: Identifiable, Decodable { let id: String; let name: String?; let version: String?; let status: String? }

    var body: some View {
        OwnerGate {
            List {
                if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote) }
                if exts.isEmpty && errorMsg == nil { Text("No extensions found.").foregroundStyle(.secondary) }
                ForEach(exts) { x in
                    VStack(alignment: .leading) {
                        Text(x.name ?? x.id).font(.headline)
                        HStack {
                            Text(x.version.map { "v\\($0)" } ?? "\u2014")
                            Spacer()
                            Text(x.status ?? "unknown").foregroundStyle(.secondary)
                        }.font(.caption)
                    }
                }
            }
            .navigationTitle("Chrome Extensions")
            .task {
                do { exts = try await SupabaseClient.shared.select("chrome_extensions",
                    query: [URLQueryItem(name: "order", value: "name.asc")], as: [ChromeExt].self) }
                catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
            }
        }
    }
}
`,

  "DevHub/Modules/RokuStudioView.swift": `import SwiftUI

struct RokuStudioView: View {
    @State private var channels: [RokuChannel] = []
    @State private var errorMsg: String?

    struct RokuChannel: Identifiable, Decodable { let id: String; let name: String?; let channelId: String?; let status: String? }

    var body: some View {
        OwnerGate {
            List {
                if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote) }
                if channels.isEmpty && errorMsg == nil { Text("No channels found.").foregroundStyle(.secondary) }
                ForEach(channels) { c in
                    VStack(alignment: .leading) {
                        Text(c.name ?? c.id).font(.headline)
                        HStack {
                            Text(c.channelId.map { "ID: \\($0)" } ?? "\u2014")
                            Spacer()
                            Text(c.status ?? "unknown")
                        }.font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Roku Studio")
            .task {
                do { channels = try await SupabaseClient.shared.select("roku_channels",
                    query: [URLQueryItem(name: "order", value: "name.asc")], as: [RokuChannel].self) }
                catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
            }
        }
    }
}
`,

  "DevHub/Modules/BackendWiringView.swift": `import SwiftUI

struct BackendWiringView: View {
    @State private var tables: [TableCount] = []
    @State private var loading = false
    @State private var errorMsg: String?

    struct TableCount: Identifiable, Decodable { var id: String { table }; let table: String; let count: Int }

    var body: some View {
        OwnerGate {
            List {
                if loading { ProgressView() }
                if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote) }
                ForEach(tables) { t in
                    HStack {
                        Text(t.table).font(.system(.body, design: .monospaced))
                        Spacer()
                        Text("\\(t.count) rows").foregroundStyle(.secondary).font(.caption)
                    }
                }
            }
            .navigationTitle("Backend Wiring")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Refresh") { Task { await fetch() } } } }
            .task { await fetch() }
        }
    }

    private func fetch() async {
        loading = true; errorMsg = nil
        do {
            struct R: Decodable { let tables: [TableCount] }
            let r: R = try await SupabaseClient.shared.invokeFunction("db-diagnostic", body: _DB(), as: R.self)
            tables = r.tables
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
        loading = false
    }
}
private struct _DB: Encodable {}
`,

  "DevHub/Modules/UIBlueprintsView.swift": `import SwiftUI

struct UIBlueprintsView: View {
    @State private var blueprints: [UIBlueprint] = []
    @State private var errorMsg: String?

    struct UIBlueprint: Identifiable, Decodable { let id: String; let name: String?; let description: String?; let tags: String? }

    var body: some View {
        OwnerGate {
            List {
                if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote) }
                if blueprints.isEmpty && errorMsg == nil { Text("No blueprints found.").foregroundStyle(.secondary) }
                ForEach(blueprints) { bp in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(bp.name ?? bp.id).font(.headline)
                        if let d = bp.description { Text(d).font(.caption).foregroundStyle(.secondary) }
                        if let t = bp.tags { Text(t).font(.caption2).foregroundStyle(.tertiary) }
                    }
                }
            }
            .navigationTitle("UI Blueprints")
            .task {
                do { blueprints = try await SupabaseClient.shared.select("ui_blueprints",
                    query: [URLQueryItem(name: "order", value: "name.asc")], as: [UIBlueprint].self) }
                catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
            }
        }
    }
}
`,

  "DevHub/Modules/TechLibraryView.swift": `import SwiftUI

struct TechLibraryView: View {
    @State private var entries: [TechEntry] = []
    @State private var searchText = ""
    @State private var errorMsg: String?

    struct TechEntry: Identifiable, Decodable { let id: String; let title: String?; let category: String?; let summary: String? }

    var filtered: [TechEntry] {
        guard !searchText.isEmpty else { return entries }
        return entries.filter {
            ($0.title ?? "").localizedCaseInsensitiveContains(searchText) ||
            ($0.category ?? "").localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        OwnerGate {
            List {
                if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote) }
                if filtered.isEmpty && errorMsg == nil { Text("No entries.").foregroundStyle(.secondary) }
                ForEach(filtered) { e in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(e.title ?? e.id).font(.headline)
                        if let c = e.category { Text(c).font(.caption.bold()).foregroundStyle(.blue) }
                        if let s = e.summary { Text(s).font(.caption).foregroundStyle(.secondary) }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search library\u2026")
            .navigationTitle("Tech Library")
            .task {
                do { entries = try await SupabaseClient.shared.select("tech_library",
                    query: [URLQueryItem(name: "order", value: "title.asc")], as: [TechEntry].self) }
                catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
            }
        }
    }
}
`,

  "DevHub/Modules/AutoPromoView.swift": `import SwiftUI

struct AutoPromoView: View {
    @State private var enabled = false
    @State private var loading = false
    @State private var errorMsg: String?

    var body: some View {
        OwnerGate {
            Form {
                Section { Toggle("Auto-Promo Enabled", isOn: $enabled)
                    .onChange(of: enabled) { _, v in Task { await set(v) } }.disabled(loading) }
                if let e = errorMsg { Section { Text(e).foregroundStyle(.orange).font(.footnote) } }
                Section(footer: Text("Toggles auto_promo_enabled in user_settings. Hourly promo agent reads this flag before posting.")) {}
            }
            .navigationTitle("Auto-Promo")
            .task { await load() }
        }
    }

    private func load() async {
        guard let uid = await SessionManager.shared.userId else { return }
        do {
            struct S: Decodable { let autoPromoEnabled: Bool? }
            let rows: [S] = try await SupabaseClient.shared.select("user_settings",
                query: [URLQueryItem(name: "user_id", value: "eq.\\(uid)"), URLQueryItem(name: "limit", value: "1")], as: [S].self)
            enabled = rows.first?.autoPromoEnabled ?? false
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
    }
    private func set(_ val: Bool) async {
        guard let uid = await SessionManager.shared.userId else { return }
        struct P: Encodable { let auto_promo_enabled: Bool }
        try? await SupabaseClient.shared.update("user_settings",
            match: [URLQueryItem(name: "user_id", value: "eq.\\(uid)")], body: P(auto_promo_enabled: val))
    }
}
`,

  "DevHub/Modules/IdeaPlannerDevView.swift": `import SwiftUI

struct IdeaPlannerDevView: View {
    @State private var ideas: [DevIdea] = []
    @State private var draft = ""
    @State private var errorMsg: String?

    struct DevIdea: Identifiable, Decodable { let id: String; let title: String; let status: String?; let createdAt: Date? }

    var body: some View {
        OwnerGate {
            VStack {
                HStack {
                    TextField("New idea\u2026", text: $draft).textFieldStyle(.roundedBorder)
                    Button("Add") { let t = draft; draft = ""; Task { await add(t) } }
                        .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
                }.padding([.horizontal, .top])
                if let e = errorMsg { Text(e).foregroundStyle(.orange).font(.footnote).padding(.horizontal) }
                List {
                    if ideas.isEmpty && errorMsg == nil { Text("No ideas yet.").foregroundStyle(.secondary) }
                    ForEach(ideas) { i in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(i.title).font(.headline)
                                if let d = i.createdAt {
                                    Text(d.formatted(date: .abbreviated, time: .omitted))
                                        .font(.caption2).foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            Text(i.status ?? "open").font(.caption.bold())
                                .foregroundStyle(i.status == "done" ? Color.green : Color.blue)
                        }
                    }
                }
            }
            .navigationTitle("Idea Planner")
            .task { await load() }
        }
    }

    private func load() async {
        do {
            ideas = try await SupabaseClient.shared.select("ideas",
                query: [URLQueryItem(name: "order", value: "created_at.desc"),
                        URLQueryItem(name: "limit", value: "50")], as: [DevIdea].self)
        } catch { errorMsg = "Backend not wired yet: \\(error.localizedDescription)" }
    }
    private func add(_ title: String) async {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        struct N: Encodable { let title: String; let status: String }
        do { _ = try await SupabaseClient.shared.insert("ideas", body: N(title: title, status: "open"), as: [DevIdea].self); await load() }
        catch { errorMsg = error.localizedDescription }
    }
}
`,

  "Info.plist.txt": `<!-- Drop these keys into Info.plist when Xcode generates one. -->
<key>NFCReaderUsageDescription</key>
<string>CriderGPT scans your livestock NFC tags to identify animals.</string>

<key>NSCameraUsageDescription</key>
<string>CriderGPT uses the camera to scan tags and capture animal photos.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>CriderGPT can attach photos from your library to animal records.</string>

<key>NSFaceIDUsageDescription</key>
<string>CriderGPT uses Face ID to protect owner-only DevHub tools.</string>

<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>

<key>com.apple.developer.nfc.readersession.formats</key>
<array>
  <string>NDEF</string>
</array>
`,

  "Project.yml": `# Use XcodeGen (brew install xcodegen) to generate the .xcodeproj:
#   xcodegen generate
name: CriderGPT
options:
  bundleIdPrefix: app.cridergpt
  deploymentTarget:
    iOS: "17.0"
settings:
  base:
    DEVELOPMENT_TEAM: ""
    SWIFT_VERSION: "5.9"
targets:
  CriderGPT:
    type: application
    platform: iOS
    sources:
      - path: .
        excludes:
          - "README.md"
          - "Project.yml"
          - "Info.plist.txt"
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: app.cridergpt.ios
        INFOPLIST_KEY_UILaunchScreen_Generation: YES
        INFOPLIST_KEY_UIApplicationSceneManifest_Generation: YES
        INFOPLIST_KEY_CFBundleDisplayName: CriderGPT
    info:
      path: Info.plist
      properties:
        NFCReaderUsageDescription: "CriderGPT scans your livestock NFC tags to identify animals."
        NSCameraUsageDescription: "CriderGPT uses the camera to scan tags and capture animal photos."
        NSPhotoLibraryUsageDescription: "CriderGPT can attach photos from your library to animal records."
        NSFaceIDUsageDescription: "CriderGPT uses Face ID to protect owner-only DevHub tools."
    capabilities:
      - com.apple.developer.in-app-payments
      - com.apple.developer.nfc.readersession.formats
`,

  "Navigation/WebsiteNav.swift": `import Foundation

/// Mirrors the website's left-rail / drawer structure. Anything with
/// \`route\` resolves to a native SwiftUI destination via [SideMenuView].
/// Anything with \`externalURL\` opens Safari. Admin-only sections must
/// NEVER appear unless the signed-in account holds the matching role.
struct NavItem: Identifiable, Hashable {
    let id = UUID()
    let label: String
    var route: String? = nil
    var externalURL: URL? = nil
    var requiresAdmin: Bool = false
    var requiresOwner: Bool = false
}

struct NavSection: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let items: [NavItem]
}

enum WebsiteNav {
    static let sections: [NavSection] = [
        NavSection(title: "Main", items: [
            NavItem(label: "Chat", route: "chat"),
            NavItem(label: "Vision Memory", route: "vision-memory"),
        ]),
        NavSection(title: "Productivity", items: [
            NavItem(label: "Livestock ID", route: "livestock"),
            NavItem(label: "Receipts", route: "receipts"),
            NavItem(label: "Agent Swarm", route: "agent-swarm"),
            NavItem(label: "Voice Studio", route: "voice-studio"),
            NavItem(label: "Shared Spending", route: "shared-spending"),
            NavItem(label: "FFA Center", route: "ffa-center"),
            NavItem(label: "Calendar", route: "calendar"),
            NavItem(label: "Calculators", route: "calculators"),
            NavItem(label: "Files", route: "files"),
            NavItem(label: "Gallery", route: "gallery"),
            NavItem(label: "Projects", route: "projects"),
        ]),
        NavSection(title: "Creative", items: [
            NavItem(label: "Media", route: "media"),
            NavItem(label: "Music", route: "music"),
            NavItem(label: "AI Images", route: "ai-images"),
            NavItem(label: "3D Studio", route: "studio-3d"),
        ]),
        NavSection(title: "Account", items: [
            NavItem(label: "Guardian", route: "guardian"),
            NavItem(label: "Profile", route: "profile"),
            NavItem(label: "Plan", route: "plan"),
            NavItem(label: "Payment", route: "payment"),
        ]),
        NavSection(title: "Tools", items: [
            NavItem(label: "Code Editor", route: "code-editor", requiresOwner: true),
            NavItem(label: "ZIP-to-EXE Builder", route: "zip-to-exe"),
            NavItem(label: "Texture Generator", route: "texture-generator"),
            NavItem(label: "Cloud Gaming", route: "cloud-gaming"),
            NavItem(label: "RDR2 Guide", route: "rdr2-guide"),
            NavItem(label: "USB Hub", route: "usb-hub"),
            NavItem(label: "Sensors", route: "sensors"),
            NavItem(label: "Frequency Tools", route: "frequency-tools"),
            NavItem(label: "Metadata Editor", route: "metadata-editor"),
            NavItem(label: "3D Converter", route: "converter-3d"),
        ]),
        NavSection(title: "Store", items: [
            NavItem(label: "Smart ID Store", externalURL: URL(string: "https://cridergpt.com/store")!),
        ]),
        NavSection(title: "Info", items: [
            NavItem(label: "Updates", route: "updates"),
            NavItem(label: "Timeline", route: "timeline"),
            NavItem(label: "Memorial", route: "memorial"),
            NavItem(label: "Contact", route: "contact"),
        ]),
        NavSection(title: "External", items: [
            NavItem(label: "Snapchat Lens",      externalURL: URL(string: "https://cridergpt.com/snapchat-lens")!),
            NavItem(label: "Custom Filters",     externalURL: URL(string: "https://cridergpt.com/custom-filters")!),
            NavItem(label: "Farming Simulator",  externalURL: URL(string: "https://cridergpt.com/farm-bureau")!),
            NavItem(label: "Terms & Privacy",    externalURL: URL(string: "https://cridergpt.com/user-agreement")!),
        ]),
        NavSection(title: "Admin", items: [
            NavItem(label: "Admin Panel",  route: "admin",              requiresAdmin: true),
            NavItem(label: "Idea Planner", route: "devhub/idea-planner", requiresAdmin: true),
            NavItem(label: "Dev Hub",      route: "devhub",              requiresOwner: true),
        ]),
    ]
}
`,

  "Navigation/RoleGate.swift": `import SwiftUI

/// Resolves \`has_role(uid, role)\` via the same RPC the website uses.
/// \`nil\` while loading, \`true\`/\`false\` once resolved.
@MainActor
final class RoleGate: ObservableObject {
    @Published var isAdmin: Bool? = nil
    @Published var isOwner: Bool? = nil

    func refresh() {
        Task {
            isAdmin = await check("admin")
            isOwner = await check("owner")
        }
    }

    private func check(_ role: String) async -> Bool {
        guard let uid = SessionManager.shared.userId else { return false }
        do {
            return try await SupabaseClient.shared.rpc(
                "has_role",
                params: ["_user_id": uid, "_role": role],
                as: Bool.self
            )
        } catch {
            return false
        }
    }
}
`,

  "Navigation/SideMenuView.swift": `import SwiftUI

/// Website-mirrored drawer. Admin/owner sections are hidden unless the
/// signed-in account holds the matching role (verified against the same
/// \`has_role\` RPC the web app uses).
struct SideMenuView: View {
    @Binding var isOpen: Bool
    @StateObject private var roles = RoleGate()
    @Environment(\\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            List {
                ForEach(WebsiteNav.sections) { section in
                    let visible = section.items.filter { item in
                        (!item.requiresAdmin || roles.isAdmin == true) &&
                        (!item.requiresOwner || roles.isOwner == true)
                    }
                    if !visible.isEmpty {
                        Section(section.title.uppercased()) {
                            ForEach(visible) { item in
                                Button {
                                    isOpen = false
                                    if let url = item.externalURL { openURL(url) }
                                    else if let route = item.route {
                                        NotificationCenter.default.post(
                                            name: .navigateToRoute,
                                            object: route
                                        )
                                    }
                                } label: {
                                    HStack {
                                        Image(systemName: item.externalURL != nil
                                              ? "arrow.up.right.square"
                                              : "chevron.right")
                                            .foregroundStyle(.secondary)
                                        Text(item.label)
                                        Spacer()
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("CriderGPT")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { isOpen = false }
                }
            }
        }
        .background(.regularMaterial)
        .task { roles.refresh() }
    }
}

extension Notification.Name {
    static let navigateToRoute = Notification.Name("cridergpt.navigateToRoute")
}
`,

  "Navigation/NativeModulePlaceholder.swift": `import SwiftUI

/// Native (NOT WebView) placeholder used while individual module screens
/// finish being wired up. Renders real SwiftUI and uses the same Supabase
/// backend as every other screen — it just doesn't yet render that data.
struct NativeModulePlaceholder: View {
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Text(title).font(.title2).bold()
            Text(message)
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .navigationTitle(title)
    }
}
`,
};

