import Foundation
import StoreKit

/// StoreKit 2 manager for CriderGPT subscriptions.
/// Product IDs MUST match App Store Connect (and the project-memory rule):
///   - cridergpt_plus_monthly  (Plus / Level 1)
///   - cridergpt_pro_monthly   (Pro  / Level 2)
///
/// Apple IAP only for digital goods on iOS. Stripe handles web + physical.
@MainActor
final class IAPManager: ObservableObject {
    static let shared = IAPManager()

    static let productIDs: [String] = [
        "cridergpt_plus_monthly",
        "cridergpt_pro_monthly",
    ]

    @Published var products: [Product] = []
    @Published var purchasedProductIDs: Set<String> = []
    @Published var loading = false
    @Published var lastError: String?

    private var updatesTask: Task<Void, Never>?

    private init() {
        updatesTask = Task.detached { [weak self] in
            // Listen for transactions outside the purchase() flow (renewals, restores).
            for await result in Transaction.updates {
                await self?.handle(transactionResult: result)
            }
        }
    }

    deinit { updatesTask?.cancel() }

    func loadProducts() async {
        loading = true; defer { loading = false }
        do {
            let prods = try await Product.products(for: IAPManager.productIDs)
            self.products = prods.sorted { $0.price < $1.price }
        } catch {
            self.lastError = "Couldn't load subscriptions. \(error.localizedDescription)"
        }
        await refreshEntitlements()
    }

    func purchase(_ product: Product) async {
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                await handle(transactionResult: verification)
            case .userCancelled:
                return
            case .pending:
                self.lastError = "Purchase pending approval."
            @unknown default: return
            }
        } catch {
            self.lastError = "Purchase failed. \(error.localizedDescription)"
        }
    }

    func restore() async {
        do { try await AppStore.sync() } catch {
            self.lastError = "Restore failed. \(error.localizedDescription)"
        }
        await refreshEntitlements()
    }

    func refreshEntitlements() async {
        var owned: Set<String> = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let tx) = result { owned.insert(tx.productID) }
        }
        self.purchasedProductIDs = owned
    }

    private func handle(transactionResult: VerificationResult<Transaction>) async {
        switch transactionResult {
        case .verified(let tx):
            // Send the JWS receipt to verify-iap so the backend marks the user premium.
            await reportToBackend(jws: transactionResult.jwsRepresentation)
            await tx.finish()
            await refreshEntitlements()
        case .unverified:
            self.lastError = "Transaction failed verification."
        }
    }

    /// Forwards the StoreKit 2 JWS receipt to the verify-iap edge function.
    /// Backend contract: { platform: "apple", receipt: <jws-string> }
    private func reportToBackend(jws: String) async {
        struct Body: Encodable { let platform: String; let receipt: String }
        do {
            _ = try await SB.client.functions.invoke(
                "verify-iap",
                options: .init(body: Body(platform: "apple", receipt: jws))
            )
        } catch {
            // Non-fatal: StoreKit still considers it owned; we just couldn't sync.
            self.lastError = "Couldn't sync to server. \(error.localizedDescription)"
        }
    }

    // MARK: - Helpers
    var tierName: String {
        if purchasedProductIDs.contains("cridergpt_pro_monthly") { return "Pro" }
        if purchasedProductIDs.contains("cridergpt_plus_monthly") { return "Plus" }
        return "Free"
    }
}
