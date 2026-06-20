import Foundation

enum ChatRole: String, Codable {
    case user
    case assistant
    case system
}

struct ChatMessage: Identifiable, Codable, Equatable {
    let id: UUID
    var role: ChatRole
    var content: String
    var createdAt: Date

    init(id: UUID = UUID(), role: ChatRole, content: String, createdAt: Date = Date()) {
        self.id = id
        self.role = role
        self.content = content
        self.createdAt = createdAt
    }
}

/// Request body for the `chat-with-ai` edge function.
/// Mirrors the contract in supabase/functions/chat-with-ai/index.ts:
/// `{ message, conversation_history?, model? }`.
struct ChatRequest: Encodable {
    let message: String
    let conversation_history: [WireMessage]
    let model: String

    struct WireMessage: Encodable {
        let role: String
        let content: String
    }
}

struct ChatResponse: Decodable {
    let response: String
    let source: String?
    let usage: Usage?

    struct Usage: Decodable {
        let used: Int?
        let limit: Int?
        let plan: String?
        let remaining: Int?
    }
}

struct ChatErrorResponse: Decodable {
    let error: String
}
