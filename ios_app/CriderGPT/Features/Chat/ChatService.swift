import Foundation
import Supabase

/// Same authenticated HTTP contracts as the website, with no embedded server keys.
@MainActor
enum ChatService {
    static func request<T: Decodable>(_ function: String, action: String? = nil, method: String = "POST", body: [String: Any]? = nil, conversation: UUID? = nil) async throws -> T {
        let session = try await SB.client.auth.session
        var components = URLComponents(url: SupabaseConfig.url.appendingPathComponent("functions/v1/" + function), resolvingAgainstBaseURL: false)!
        var query: [URLQueryItem] = []
        if let action { query.append(URLQueryItem(name: "action", value: action)) }
        if let conversation { query.append(URLQueryItem(name: "conversation_id", value: conversation.uuidString)) }
        components.queryItems = query.isEmpty ? nil : query
        var request = URLRequest(url: components.url!)
        request.httpMethod = method; request.timeoutInterval = 210
        request.setValue("Bearer " + session.accessToken, forHTTPHeaderField: "Authorization")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let detail = (try? JSONDecoder().decode(ChatErrorResponse.self, from: data))?.error ?? "The request failed. Check saved history before retrying."
            throw NSError(domain: "CriderGPT", code: (response as? HTTPURLResponse)?.statusCode ?? 0, userInfo: [NSLocalizedDescriptionKey: detail])
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    struct ConversationList: Decodable { let conversations: [ChatConversation] }
    struct MessageList: Decodable { let messages: [ChatMessage] }
    struct Created: Decodable { let conversation: ChatConversation }
    struct Saved: Decodable { let message: ChatMessage }
    struct Models: Decodable { let models: [ChatModelOption] }
    struct Acknowledged: Decodable {}

    static func save(_ conversation: UUID, role: String, text: String, clientID: UUID, metadata: ChatMetadata? = nil, image: String? = nil) async throws -> ChatMessage {
        var body: [String: Any] = ["conversation_id": conversation.uuidString, "role": role, "content": text, "client_message_id": clientID.uuidString]
        if let metadata { body["metadata"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(metadata)) }
        if let image { body["image_url"] = image }
        let result: Saved = try await request("chat-operations", action: "send_message", body: body)
        return result.message
    }
}
