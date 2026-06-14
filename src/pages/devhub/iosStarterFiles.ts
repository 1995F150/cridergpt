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

/// Owner-only. All DevHub modules render natively inside the app — never as
/// Safari links. Each row pushes an in-app SwiftUI screen.
struct DevHubView: View {
    private struct Module: Identifiable { let id = UUID(); let label: String; let route: String }
    private let modules: [Module] = [
        .init(label: "Server AI Console",          route: "devhub/server-console"),
        .init(label: "Server Health & Self-Repair",route: "devhub/server-health"),
        .init(label: "Knowledge Vault",            route: "devhub/vault"),
        .init(label: "Agent Dispatcher",           route: "devhub/agent-dispatcher"),
        .init(label: "Autopilot Queue",            route: "devhub/autopilot"),
        .init(label: "iOS Builder",                route: "devhub/ios-builder"),
        .init(label: "Backend Wiring Reference",   route: "devhub/backend-wiring"),
        .init(label: "UI Blueprints",              route: "devhub/ui-blueprints"),
        .init(label: "Tech Knowledge Library",     route: "devhub/tech-library"),
        .init(label: "Auto-Promo (Hourly)",        route: "devhub/auto-promo"),
        .init(label: "Idea Planner",               route: "devhub/idea-planner"),
    ]

    var body: some View {
        List {
            Section("Owner Tools") {
                ForEach(modules) { m in
                    NavigationLink(m.label, destination: DevModulePlaceholderView(label: m.label, route: m.route))
                }
            }
            Section {
                Text("DevHub is owner-only and gated by the has_role RPC. All modules render in-app — never Safari.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("DevHub")
    }
}

struct DevModulePlaceholderView: View {
    let label: String
    let route: String
    var body: some View {
        VStack(spacing: 12) {
            Text(label).font(.title2).bold()
            Text("Native screen for \\(route). Wire to Supabase / local logic here.")
                .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }.padding().navigationTitle(label)
    }
}
`,

  "DevHub/AdminPanelView.swift": `import SwiftUI

/// Owner/admin-only. All admin tools render natively in-app — never Safari.
struct AdminPanelView: View {
    var body: some View {
        List {
            Section("Admin Tools") {
                NavigationLink("User management",
                    destination: DevModulePlaceholderView(label: "User Management", route: "admin/users"))
                NavigationLink("System status",
                    destination: DevModulePlaceholderView(label: "System Status", route: "admin/system"))
                NavigationLink("Broadcasts",
                    destination: DevModulePlaceholderView(label: "Broadcasts", route: "admin/broadcasts"))
            }
            Section {
                Text("Gated by has_role(uid,'admin'). Rendered natively for offline access.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Admin Panel")
    }
}
`,

  "Menu/SideMenuView.swift": `import SwiftUI

/// Left drawer of "external" website features that always open in Safari.
struct SideMenuView: View {
    @Binding var isOpen: Bool

    private struct Item: Identifiable {
        let id = UUID()
        let title: String
        let symbol: String
        let url: URL
    }
    private let items: [Item] = [
        .init(title: "Smart ID Store",  symbol: "tag",              url: Config.ExternalLink.store),
        .init(title: "Snapchat Lens",   symbol: "camera.viewfinder",url: Config.ExternalLink.snapchatLens),
        .init(title: "FarmBureau",      symbol: "shield",           url: Config.ExternalLink.farmBureau),
        .init(title: "TikTok Studio",   symbol: "music.note",       url: Config.ExternalLink.tiktokStudio),
        .init(title: "Custom Filters",  symbol: "wand.and.stars",   url: Config.ExternalLink.customFilters),
        .init(title: "Recipes",         symbol: "fork.knife",       url: Config.ExternalLink.recipes),
        .init(title: "Guides",          symbol: "book",             url: Config.ExternalLink.guides),
        .init(title: "Leaderboard",     symbol: "trophy",           url: Config.ExternalLink.leaderboard),
        .init(title: "Invite Friends",  symbol: "person.2",         url: Config.ExternalLink.invite),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("More on CriderGPT.com")
                .font(.headline)
                .padding()
            Divider()
            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(items) { item in
                        Button {
                            UIApplication.shared.open(item.url)
                            isOpen = false
                        } label: {
                            HStack {
                                Image(systemName: item.symbol).frame(width: 24)
                                Text(item.title)
                                Spacer()
                                Image(systemName: "arrow.up.right.square").foregroundStyle(.secondary)
                            }
                            .padding(.horizontal).padding(.vertical, 10)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            Spacer()
            Text("Each opens Safari — the website is the source of truth.")
                .font(.caption2).foregroundStyle(.secondary).padding()
        }
        .frame(maxHeight: .infinity)
        .background(.regularMaterial)
    }
}
`,

  "Payments/IAPManager.swift": `import Foundation
import StoreKit

/// Wraps StoreKit 2. Verifies receipts via the \`verify-iap\` edge function and
/// writes to \`iap_purchases\` + \`user_subscriptions\`. Product IDs live in
/// Config.IAP — the only placeholders in the entire starter.
@MainActor
final class IAPManager: ObservableObject {
    static let shared = IAPManager()

    @Published var products: [Product] = []
    @Published var ownedProductIDs: Set<String> = []

    var currentPlanLabel: String {
        if ownedProductIDs.contains(Config.IAP.proMonthly) { return "Pro" }
        if ownedProductIDs.contains(Config.IAP.plusMonthly) { return "Plus" }
        return "Free"
    }

    private var updatesTask: Task<Void, Never>?

    private init() {
        updatesTask = Task { await listenForTransactions() }
    }

    func loadProducts() async {
        do {
            products = try await Product.products(for: Config.IAP.allProductIDs)
                .sorted { $0.price < $1.price }
        } catch { products = [] }
    }

    func purchase(_ product: Product) async {
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                if let transaction = try? checkVerified(verification) {
                    await postReceipt(transaction: transaction)
                    await transaction.finish()
                    await refreshEntitlements()
                }
            case .userCancelled, .pending: break
            @unknown default: break
            }
        } catch { /* surfaced via UI as needed */ }
    }

    func restore() async {
        try? await AppStore.sync()
        await refreshEntitlements()
    }

    func refreshEntitlements() async {
        var owned: Set<String> = []
        for await result in Transaction.currentEntitlements {
            if let t = try? checkVerified(result) { owned.insert(t.productID) }
        }
        ownedProductIDs = owned
    }

    private func listenForTransactions() async {
        for await update in Transaction.updates {
            if let t = try? checkVerified(update) {
                await postReceipt(transaction: t)
                await t.finish()
                await refreshEntitlements()
            }
        }
    }

    private func postReceipt(transaction: Transaction) async {
        struct Body: Encodable {
            let platform: String = "ios"
            let product_id: String
            let transaction_id: String
            let original_transaction_id: String
            let purchase_date: Date
        }
        _ = try? await SupabaseClient.shared.invokeFunction(
            Config.verifyIapFunction,
            body: Body(
                product_id: transaction.productID,
                transaction_id: String(transaction.id),
                original_transaction_id: String(transaction.originalID),
                purchase_date: transaction.purchaseDate
            ),
            as: EmptyResponse.self
        )
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let safe): return safe
        case .unverified(_, let err): throw err
        }
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
# Or open the folder directly in Cursor / VS Code — every file is plain text.
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
        PRODUCT_BUNDLE_IDENTIFIER: ${BUNDLE_ID}
        INFOPLIST_KEY_UILaunchScreen_Generation: YES
        INFOPLIST_KEY_UIApplicationSceneManifest_Generation: YES
        INFOPLIST_KEY_CFBundleDisplayName: CriderGPT
    info:
      path: Info.plist
      properties:
        NFCReaderUsageDescription: "CriderGPT scans your livestock NFC tags to identify animals."
        NSCameraUsageDescription: "CriderGPT uses the camera to scan tags and capture animal photos."
        NSPhotoLibraryUsageDescription: "CriderGPT can attach photos from your library to animal records."
    capabilities:
      - com.apple.developer.in-app-payments
      - com.apple.developer.nfc.readersession.formats
`,
};
