import Foundation
import Supabase

/// Typed wrappers around the project's edge functions.
/// One method per function — names match `supabase/functions/<name>`.
enum EdgeFunctions {
    // Stage 2: chat-with-ai (used directly by ChatViewModel — see Features/Chat)
    // Wire request:  { message, conversation_history?, model? }
    // Wire response: { response, source, usage }

    // Stage 3: smart-id lookup
    // static func lookupTag(_ tagId: String) async throws -> TagLookupResult { ... }

    // Stage 5: verify-iap
    // static func verifyIAP(receipt: String, productId: String) async throws -> IAPVerifyResult { ... }
}
