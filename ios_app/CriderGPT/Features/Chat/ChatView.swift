import SwiftUI

/// Chat tab — mirrors the web app's CriderGPT chat:
/// - dark theme, accent send button
/// - markdown-rendered assistant replies
/// - last 20 messages of context sent to chat-with-ai edge function
struct ChatView: View {
    @StateObject private var vm = ChatViewModel()
    @State private var showHistory = false
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

            if vm.hasUnsavedReply {
                Button("Retry saving reply") { Task { await vm.retrySave() } }.disabled(vm.isSending)
            }
            if let catalogError = vm.catalogError {
                Text(catalogError).font(.caption).foregroundStyle(Theme.warning).padding(.horizontal)
            }
            HStack {
                Text("Model").font(.caption).foregroundStyle(Theme.textSecondary)
                Picker("Chat model", selection: $vm.model) {
                    ForEach(vm.models) { option in Text(option.name).tag(option.id) }
                }.disabled(vm.isSending || vm.hasUnsavedReply)
            }
            Composer(
                text: $vm.input,
                isSending: vm.isSending || vm.hasUnsavedReply,
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
                        ForEach(vm.models) { option in Text(option.name).tag(option.id) }
                    }.disabled(vm.isSending)
                    Button("Refresh models and history") { Task { await vm.refresh() } }
                    Button("Conversations") { showHistory = true }
                    Divider()
                    Button { vm.clear() } label: {
                        Label("New conversation", systemImage: "plus")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .task { await vm.refresh() }
        .sheet(isPresented: $showHistory) { ConversationHistoryView(vm: vm) }
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
                    HStack {
                        Image("ReplyLogo").resizable().scaledToFit().frame(width: 28, height: 28).colorInvert().accessibilityHidden(true)
                        Text("CriderGPT")
                    }
                        .font(.caption2)
                        .foregroundStyle(Theme.textSecondary)
                }
                renderedContent
                    .textSelection(.enabled)
                if message.role == .assistant {
                    if let model = message.metadata?.model {
                        Text(model).font(.caption2).foregroundStyle(Theme.textSecondary)
                    } else if let requested = message.metadata?.requested_model {
                        Text("Requested: " + requested + " · actual model not recorded").font(.caption2)
                    }
                    if message.metadata?.incomplete == true {
                        Text("Incomplete response · " + (message.metadata?.finish_reason ?? "unverified completion")).font(.caption).foregroundStyle(Theme.warning)
                    }
                    if message.metadata?.answer_origin == "deterministic_source_summary" {
                        Text("Source summary fallback").font(.caption).foregroundStyle(Theme.textSecondary)
                    }
                    ForEach(message.metadata?.sources ?? []) { source in
                        if let url = source.safeURL { Link("[\(source.id)] \(source.title)", destination: url).font(.caption) }
                    }
                    if let image = message.image_url { ChatReplyImage(value: image) }
                    if let timestamp = message.created_at { Text(timestamp).font(.caption2).foregroundStyle(Theme.textMuted) }
                    Button { UIPasteboard.general.string = message.content } label: { Label("Copy", systemImage: "doc.on.doc") }.font(.caption)
                }
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
        if message.role == .assistant { ChatResponseContent(content: message.content) }
        else { Text(message.content) }
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
                Image(systemName: isSending ? "hourglass" : "arrow.up")
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


private struct ConversationHistoryView: View {
    @ObservedObject var vm: ChatViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    @State private var editing: ChatConversation?
    @State private var title = ""
    @State private var deleting: ChatConversation?
    var body: some View {
        NavigationStack {
            List(vm.conversations.filter { search.isEmpty || $0.title.localizedCaseInsensitiveContains(search) }) { conversation in
                Button(conversation.title) { Task { await vm.open(conversation.id); dismiss() } }
                    .swipeActions {
                        Button("Delete", role: .destructive) { deleting = conversation }
                        Button("Rename") { editing = conversation; title = conversation.title }.tint(.blue)
                    }
            }
            .searchable(text: $search)
            .navigationTitle("Conversations")
            .toolbar { Button("Done") { dismiss() } }
            .refreshable { await vm.refresh() }
            .alert("Rename conversation", isPresented: Binding(get: { editing != nil }, set: { if !$0 { editing = nil } })) {
                TextField("Title", text: $title)
                Button("Save") { if let id = editing?.id { Task { await vm.rename(id, title: title) } }; editing = nil }
                Button("Cancel", role: .cancel) { editing = nil }
            }
            .confirmationDialog("Delete this conversation?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } })) {
                Button("Delete", role: .destructive) { if let id = deleting?.id { Task { await vm.delete(id) } }; deleting = nil }
            }
        }
    }
}
