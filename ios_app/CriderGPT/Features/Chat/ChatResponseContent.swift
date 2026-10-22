import SwiftUI

/// Read-only rich response. Code is displayed, never executed.
struct ChatResponseContent: View {
    let content: String
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(Array(content.components(separatedBy: "```").enumerated()), id: \.offset) { index, part in
                if index % 2 == 1 {
                    let lines = part.components(separatedBy: "\n")
                    let language = lines.first ?? "code"
                    let code = lines.dropFirst().joined(separator: "\n")
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(language.isEmpty ? "code" : language).font(.caption)
                            Spacer()
                            Button { UIPasteboard.general.string = code } label: { Label("Copy code", systemImage: "doc.on.doc") }.font(.caption)
                        }
                        ScrollView(.horizontal) { Text(code).font(.system(.footnote, design: .monospaced)).textSelection(.enabled).fixedSize(horizontal: true, vertical: false) }
                    }.padding(10).background(Theme.background).clipShape(RoundedRectangle(cornerRadius: 10))
                } else if !part.isEmpty {
                    Text((try? AttributedString(markdown: part, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))) ?? AttributedString(part))
                }
            }
        }
    }
}
struct ChatReplyImage: View {
    let value: String
    var body: some View {
        if value.hasPrefix("data:image/png;base64,"), let data = Data(base64Encoded: String(value.dropFirst(22))), let image = UIImage(data: data) {
            Image(uiImage: image).resizable().scaledToFit()
        } else if let url = URL(string: value), url.scheme == "https", url.user == nil, url.password == nil {
            AsyncImage(url: url) { phase in
                if let image = phase.image { image.resizable().scaledToFit() }
                else if phase.error != nil { Text("Image unavailable. Check the saved conversation on the website.").font(.caption) }
                else { ProgressView() }
            }
        }
    }
}
