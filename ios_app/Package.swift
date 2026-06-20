// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CriderGPT",
    platforms: [.iOS(.v16)],
    products: [
        .library(name: "CriderGPT", targets: ["CriderGPT"])
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.0.0"),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "7.1.0")
    ],
    targets: [
        .target(
            name: "CriderGPT",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS"),
                .product(name: "GoogleSignInSwift", package: "GoogleSignIn-iOS")
            ],
            path: "CriderGPT"
        )
    ]
)
