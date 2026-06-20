import SwiftUI
import StoreKit

struct ProfileView: View {
    @EnvironmentObject var auth: AuthService
    @StateObject private var iap = IAPManager.shared

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 16) {
                    header
                    subscriptionCard
                    actionsCard
                    aboutCard
                }
                .padding()
            }
        }
        .navigationTitle("Profile")
        .task { await iap.loadProducts() }
    }

    private var header: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle().fill(Theme.surfaceElevated).frame(width: 72, height: 72)
                Image(systemName: "person.fill").font(.system(size: 32)).foregroundStyle(Theme.accent)
            }
            Text(auth.profile?.display_name ?? auth.profile?.email ?? "Signed in")
                .font(.headline).foregroundStyle(Theme.textPrimary)
            Text(iap.tierName + " plan")
                .font(.caption).padding(.horizontal, 10).padding(.vertical, 3)
                .background(Theme.accent.opacity(0.15)).clipShape(Capsule())
                .foregroundStyle(Theme.accent)
        }
        .frame(maxWidth: .infinity).padding().background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var subscriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Subscription").font(.headline).foregroundStyle(Theme.textPrimary)
            if iap.loading && iap.products.isEmpty {
                ProgressView().tint(Theme.accent)
            } else if iap.products.isEmpty {
                Text("Subscriptions unavailable. Check your App Store connection.")
                    .font(.caption).foregroundStyle(Theme.textSecondary)
            } else {
                ForEach(iap.products, id: \.id) { product in
                    PlanRow(product: product,
                            owned: iap.purchasedProductIDs.contains(product.id)) {
                        Task { await iap.purchase(product) }
                    }
                }
            }
            Button("Restore Purchases") { Task { await iap.restore() } }
                .font(.caption).foregroundStyle(Theme.accent)
            if let err = iap.lastError {
                Text(err).font(.caption2).foregroundStyle(.red)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding().background(Theme.surface).clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var actionsCard: some View {
        VStack(spacing: 0) {
            NavigationLink {
                CalculatorsView()
            } label: {
                row(icon: "function", title: "Calculators", trailing: "›")
            }
            Divider().overlay(Theme.surfaceElevated)
            Button { Task { await auth.signOut() } } label: {
                row(icon: "rectangle.portrait.and.arrow.right", title: "Sign out", trailing: "")
                    .foregroundStyle(.red)
            }
        }
        .background(Theme.surface).clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var aboutCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("CriderGPT").font(.headline).foregroundStyle(Theme.textPrimary)
            Text("Native iOS · v1.0").font(.caption).foregroundStyle(Theme.textSecondary)
            Text("Built by Jessie Crider").font(.caption2).foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding().background(Theme.surface).clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func row(icon: String, title: String, trailing: String) -> some View {
        HStack {
            Image(systemName: icon).frame(width: 24)
            Text(title)
            Spacer()
            Text(trailing).foregroundStyle(Theme.textSecondary)
        }
        .padding().contentShape(Rectangle())
        .foregroundStyle(Theme.textPrimary)
    }
}

private struct PlanRow: View {
    let product: Product
    let owned: Bool
    let onTap: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(product.displayName).font(.subheadline).foregroundStyle(Theme.textPrimary)
                Text(product.description).font(.caption).foregroundStyle(Theme.textSecondary).lineLimit(2)
            }
            Spacer()
            if owned {
                Text("Active").font(.caption).padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Theme.accent.opacity(0.2)).clipShape(Capsule()).foregroundStyle(Theme.accent)
            } else {
                Button(product.displayPrice, action: onTap)
                    .buttonStyle(.borderedProminent).tint(Theme.accent)
            }
        }
        .padding(.vertical, 6)
    }
}
