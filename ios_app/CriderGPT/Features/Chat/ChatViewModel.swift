import Foundation
import Supabase

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var input: String = ""
    @Published var isSending: Bool = false
    @Published var errorMessage: String?
    @Published var model: String = "cridergpt-5.0"

    /// Sends the current `input` to the chat-with-ai edge function and appends
    /// the assistant reply. Non-streaming (matches the web app's contract).
    func send() async {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isSending else { return }

        let userMessage = ChatMessage(role: .user, content: trimmed)
        messages.append(userMessage)
        input = ""
        isSending = true
        errorMessage = nil

        // Last 20 messages as conversation history (matches web app's slice(-20))
        let history = messages
            .dropLast() // don't include the just-added user message in history
            .suffix(20)
            .map { ChatRequest.WireMessage(role: $0.role.rawValue, content: $0.content) }

        let body = ChatRequest(
            message: trimmed,
            conversation_history: Array(history),
            model: model
        )

        do {
            let response: ChatResponse = try await SB.client.functions.invoke(
                "chat-with-ai",
                options: FunctionInvokeOptions(body: body)
            )
            messages.append(ChatMessage(role: .assistant, content: response.response))
        } catch let FunctionsError.httpError(code, data) {
            let serverMsg = (try? JSONDecoder().decode(ChatErrorResponse.self, from: data))?.error
            switch code {
            case 429:
                errorMessage = serverMsg ?? "Rate limited. Try again in a moment."
            case 402:
                errorMessage = serverMsg ?? "AI credits exhausted."
            default:
                errorMessage = serverMsg ?? "Chat failed (HTTP \(code))."
            }
        } catch {
            errorMessage = "Chat failed: \(error.localizedDescription)"
        }

        isSending = false
    }

    func clear() {
        messages.removeAll()
        errorMessage = nil
    }
}
