import Foundation

enum ChatRole: String, Codable { case user, assistant, system }
struct ChatSource: Codable, Equatable, Identifiable {
    let id: Int
    let title: String
    let url: String
    var safeURL: URL? {
        guard let value = URL(string: url), value.scheme == "https" || value.scheme == "http", value.user == nil, value.password == nil else { return nil }
        return value
    }
}
struct ChatMetadata: Codable, Equatable {
    var provider: String? = nil
    var model: String? = nil
    var requested_model: String? = nil
    var source: String? = nil
    var answer_origin: String? = nil
    var incomplete: Bool? = nil
    var finish_reason: String? = nil
    var request_id: String? = nil
    var sources: [ChatSource]? = nil
    var generated_tokens: Int? = nil
}
struct ChatMessage: Identifiable, Codable, Equatable {
    let id: UUID
    var role: ChatRole
    var content: String
    var createdAt: Date = Date()
    var metadata: ChatMetadata? = nil
    var image_url: String? = nil
    var created_at: String? = nil
    init(id: UUID = UUID(), role: ChatRole, content: String, createdAt: Date = Date(), metadata: ChatMetadata? = nil) {
        self.id = id; self.role = role; self.content = content; self.createdAt = createdAt; self.metadata = metadata
    }
    enum CodingKeys: String, CodingKey { case id, role, content, metadata, image_url, created_at }
}
struct ChatConversation: Decodable, Identifiable {
    let id: UUID
    let title: String
    let updated_at: String?
}
struct ChatModelOption: Decodable, Identifiable {
    let id: String
    let name: String
    var requiredPlan: String? = nil
}
struct ChatRequest: Encodable {
    let message: String
    let conversation_history: [WireMessage]
    let model: String
    struct WireMessage: Encodable { let role: String; let content: String }
}
struct ChatResponse: Decodable {
    let response: String?
    let error: String?
    let type: String?
    let model: String?
    let requested_model: String?
    let source: String?
    let answer_origin: String?
    let incomplete: Bool?
    let finish_reason: String?
    let sources: [ChatSource]?
    let request_id: String?
    let generated_tokens: Int?
    let job_token: String?
    let status: String?
    let image_url: String?
    var metadata: ChatMetadata {
        ChatMetadata(provider: model == nil ? nil : "cridergpt_native", model: model, requested_model: requested_model, source: source, answer_origin: answer_origin, incomplete: incomplete, finish_reason: finish_reason, request_id: request_id, sources: sources, generated_tokens: generated_tokens)
    }
}
struct ChatErrorResponse: Decodable { let error: String }


enum ChatContext {
    static func turns(_ messages: [ChatMessage]) -> [ChatMessage] {
        var pairs: [[ChatMessage]] = []
        for (first, second) in zip(messages, messages.dropFirst()) {
            if first.role == .user && second.role == .assistant && second.metadata?.incomplete != true && second.metadata?.answer_origin != "pipeline_error" && second.metadata?.answer_origin != "image_model" && second.image_url == nil {
                pairs.append([first, second])
            }
        }
        return pairs.suffix(10).flatMap { $0 }
    }
}
