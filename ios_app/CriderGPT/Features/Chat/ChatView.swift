import SwiftUI

/// Chat tab — mirrors the web app's CriderGPT chat:
/// - dark theme, accent send button
/// - markdown-rendered assistant replies
/// - last 20 messages of context sent to chat-with-ai edge function
struct ChatView: View {
    @StateObject private var vm = ChatViewModel()
    @FocusState private var inputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        if vm.messages.isEmpty {
                            EmptyChatState()
                                .padding(.top, 48)
                        }
                        ForEach(vm.messages) { msg in
                            MessageBubble(message: msg)
                                .id(msg.id)
                        }
                        if vm.isSending {
                            TypingIndicator()
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .onChange(of: vm.messages.count) { _ in
                    if let last = vm.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            if let err = vm.errorMessage {
                ErrorBanner(message: err)
                    .padding(.horizontal, 12)
                    .padding(.bottom, 6)
            }

            Composer(
                text: $vm.input,
                isSending: vm.isSending,
                focused: $inputFocused,
                onSend: { Task { await vm.send() } }
            )
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("CriderGPT")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Picker("Model", selection: $vm.model) {
                        Text("CriderGPT 4.1 (fast)").tag("cridergpt-4.1")
                        Text("CriderGPT 5.0").tag("cridergpt-5.0")
                        Text("CriderGPT 5.0 Pro").tag("cridergpt-5.0-pro")
                        Text("CriderGPT 5.0 Reasoning").tag("cridergpt-5.0-reasoning")
                    }
                    Divider()
                    Button(role: .destructive) { vm.clear() } label: {
                        Label("Clear conversation", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .onAppear { inputFocused = true }
    }
}

// MARK: - Subviews

private struct EmptyChatState: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "bubble.left.and.bubble.right.fill")
                .font(.system(size: 44))
                .foregroundStyle(Theme.accent)
            Text("Ask CriderGPT")
                .font(.title3.bold())
                .foregroundStyle(Theme.textPrimary)
            Text("Livestock, FFA, farm tasks, code, anything.")
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if message.role == .user { Spacer(minLength: 40) }

            VStack(alignment: .leading, spacing: 4) {
                if message.role == .assistant {
                    Text("CriderGPT")
                        .font(.caption2)
                        .foregroundStyle(Theme.textSecondary)
                }
                renderedContent
                    .textSelection(.enabled)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(bubbleBackground)
            .foregroundStyle(message.role == .user ? .white : Theme.textPrimary)
            .clipShape(RoundedRectangle(cornerRadius: 14))

            if message.role == .assistant { Spacer(minLength: 40) }
        }
    }

    @ViewBuilder
    private var renderedContent: some View {
        if message.role == .assistant,
           let attributed = try? AttributedString(
               markdown: message.content,
               options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
           ) {
            Text(attributed)
        } else {
            Text(message.content)
        }
    }

    private var bubbleBackground: Color {
        message.role == .user ? Theme.accent : Theme.surface
    }
}

private struct TypingIndicator: View {
    @State private var phase: Int = 0
    private let timer = Timer.publish(every: 0.35, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { i in
                Circle()
                    .frame(width: 6, height: 6)
                    .foregroundStyle(Theme.textSecondary)
                    .opacity(phase == i ? 1.0 : 0.3)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .onReceive(timer) { _ in phase = (phase + 1) % 3 }
    }
}

private struct Composer: View {
    @Binding var text: String
    let isSending: Bool
    var focused: FocusState<Bool>.Binding
    let onSend: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Message CriderGPT…", text: $text, axis: .vertical)
                .lineLimit(1...5)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Theme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .foregroundStyle(Theme.textPrimary)
                .focused(focused)
                .submitLabel(.send)
                .onSubmit(onSend)

            Button(action: onSend) {
                Image(systemName: isSending ? "stop.fill" : "arrow.up")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 36, height: 36)
                    .background(canSend ? Theme.accent : Theme.surfaceAlt)
                    .clipShape(Circle())
            }
            .disabled(!canSend)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Theme.background.opacity(0.95))
    }

    private var canSend: Bool {
        !isSending && !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
