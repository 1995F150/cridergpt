import Foundation
import Supabase

/// Typed wrappers around the project's edge functions.
/// One method per function — names match `supabase/functions/<name>`.
/// Implementations land per-stage alongside the feature that uses them.
enum EdgeFunctions {
    // Stage 2: chat streaming
    // static func chat(messages: [ChatMessage]) -> AsyncThrowingStream<String, Error> { ... }

    // Stage 3: smart-id lookup
    // static func lookupTag(_ tagId: String) async throws -> TagLookupResult { ... }

    // Stage 5: verify-iap
    // static func verifyIAP(receipt: String, productId: String) async throws -> IAPVerifyResult { ... }
}
