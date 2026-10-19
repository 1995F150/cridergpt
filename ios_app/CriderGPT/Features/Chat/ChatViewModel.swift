import Foundation
import Supabase

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var conversations: [ChatConversation] = []
    @Published var models: [ChatModelOption] = []
    @Published var currentConversation: UUID?
    @Published var input = ""
    @Published var isSending = false
    @Published var errorMessage: String?
    @Published var model = "cridergpt-5.0"
    @Published var catalogError: String?
    private var pendingReply: (UUID, String, UUID, ChatMetadata, String?)?

    func refresh() async {
        guard !isSending else { return }
        await loadModels()
        do {
            let list: ChatService.ConversationList = try await ChatService.request("chat-operations", action: "conversations", method: "GET")
            conversations = list.conversations
        } catch { errorMessage = error.localizedDescription }
    }
    func loadModels() async {
        if let url = Bundle.main.url(forResource: "WebModels", withExtension: "json"), let data = try? Data(contentsOf: url), let bundled = try? JSONDecoder().decode([ChatModelOption].self, from: data) { models = bundled }
        do {
            let catalog: ChatService.Models = try await ChatService.request("cridergpt-ubuntu-api", body: ["action": "public_models"])
            models = catalog.models.map { ChatModelOption(id: "native:" + $0.id, name: $0.name, requiredPlan: "free") } + models.filter { !$0.id.hasPrefix("native:") }
            catalogError = nil
        } catch { catalogError = "Native catalog unavailable. Refresh to retry; no replacement model will be used." }
    }
    func open(_ id: UUID) async {
        guard !isSending, pendingReply == nil else { return }
        isSending = true; defer { isSending = false }
        do {
            let result: ChatService.MessageList = try await ChatService.request("chat-operations", action: "messages", method: "GET", conversation: id)
            messages = result.messages; currentConversation = id; errorMessage = nil
        } catch { errorMessage = error.localizedDescription }
    }
    func rename(_ id: UUID, title: String) async {
        guard !isSending else { return }
        do {
            let _: ChatService.Acknowledged = try await ChatService.request("chat-operations", action: "update_conversation", method: "PUT", body: ["conversation_id": id.uuidString, "title": title])
            await refresh()
        } catch { errorMessage = error.localizedDescription }
    }
    func delete(_ id: UUID) async {
        guard !isSending, pendingReply == nil else { return }
        do {
            let _: ChatService.Acknowledged = try await ChatService.request("chat-operations", action: "delete_conversation", method: "DELETE", conversation: id)
            if currentConversation == id { clear() }
            await refresh()
        } catch { errorMessage = error.localizedDescription }
    }
    func retrySave() async {
        guard !isSending, let pending = pendingReply else { return }
        isSending = true; defer { isSending = false }
        do {
            let saved = try await ChatService.save(pending.0, role: "assistant", text: pending.1, clientID: pending.2, metadata: pending.3, image: pending.4)
            messages.removeAll { $0.id == pending.2 }; messages.append(saved)
            pendingReply = nil; errorMessage = nil
        } catch { errorMessage = "Reply is still unsaved. Retry saving before leaving this chat." }
    }
    var hasUnsavedReply: Bool { pendingReply != nil }

    func send() async {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isSending, pendingReply == nil else { return }
        let selected = model
        guard models.contains(where: { $0.id == selected }) else { errorMessage = "Selected model unavailable. Refresh the model catalog."; return }
        isSending = true; errorMessage = nil
        defer { isSending = false }
        do {
            if currentConversation == nil {
                let created: ChatService.Created = try await ChatService.request("chat-operations", action: "create_conversation", body: ["title": String(trimmed.prefix(50))])
                currentConversation = created.conversation.id
                conversations.insert(created.conversation, at: 0)
            }
            guard let conversation = currentConversation else { return }
            let history = ChatContext.turns(messages).map { ["role": $0.role.rawValue, "content": $0.content] }
            let user = try await ChatService.save(conversation, role: "user", text: trimmed, clientID: UUID())
            messages.append(user); input = ""
            var result: ChatResponse = try await ChatService.request("chat-with-ai", body: ["message": trimmed, "model": selected, "conversation_history": history])
            if result.type == "image_job", let token = result.job_token {
                var completed = false
                for _ in 0..<95 {
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    result = try await ChatService.request("cridergpt-ubuntu-api", body: ["action": "native_image_job", "job_token": token])
                    if result.status == "completed" { completed = true; break }
                    if result.status == "failed" { throw NSError(domain: "CriderGPT", code: 1, userInfo: [NSLocalizedDescriptionKey: result.error ?? "Image generation failed."]) }
                }
                if !completed { throw NSError(domain: "CriderGPT", code: 1, userInfo: [NSLocalizedDescriptionKey: "Image generation timed out. No replacement model was used."]) }
            }
            if let error = result.error { throw NSError(domain: "CriderGPT", code: 1, userInfo: [NSLocalizedDescriptionKey: error]) }
            guard let text = result.response, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw NSError(domain: "CriderGPT", code: 1, userInfo: [NSLocalizedDescriptionKey: "No completed reply was received."]) }
            if selected.hasPrefix("native:"), result.type != "image", result.model != String(selected.dropFirst(7)) { throw NSError(domain: "CriderGPT", code: 1, userInfo: [NSLocalizedDescriptionKey: "Model identity mismatch. No response substituted."]) }
            var metadata = result.metadata
            metadata.provider = selected.hasPrefix("native:") ? "cridergpt_native" : nil
            if metadata.requested_model == nil { metadata.requested_model = selected }
            let replyID = UUID()
            pendingReply = (conversation, text, replyID, metadata, result.image_url)
            do {
                let saved = try await ChatService.save(conversation, role: "assistant", text: text, clientID: replyID, metadata: metadata, image: result.image_url)
                messages.append(saved); pendingReply = nil
            } catch {
                messages.append(ChatMessage(id: replyID, role: .assistant, content: text, metadata: metadata))
                errorMessage = "Reply received but not saved. Use Retry saving; do not regenerate it."
            }
        } catch { errorMessage = error.localizedDescription + " Check saved history before retrying." }
    }
    func clear() {
        guard !isSending, pendingReply == nil else { return }
        messages = []; currentConversation = nil; errorMessage = nil
    }
}
