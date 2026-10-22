import SwiftUI
import SafariServices

struct WebsiteTool: Decodable, Identifiable { let id: String; let name: String }
struct MoreToolsView: View {
    @State private var search = ""
    @State private var selected: WebsiteTool?
    private var tools: [WebsiteTool] {
        guard let url = Bundle.main.url(forResource: "WebDestinations", withExtension: "json"), let data = try? Data(contentsOf: url) else { return [] }
        return (try? JSONDecoder().decode([WebsiteTool].self, from: data)) ?? []
    }
    var body: some View {
        List {
            Section { NavigationLink("Account & subscriptions") { ProfileView() } }
            Section("Website tools") {
                Text("These tools open the current website. You may need to sign in separately. They are not native iOS screens.").font(.caption)
                ForEach(tools.filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) }) { tool in
                    Button { selected = tool } label: { Label(tool.name, systemImage: "safari") }
                }
            }
        }
        .searchable(text: $search).navigationTitle("More")
        .sheet(item: $selected) { tool in WebsiteToolBrowser(path: tool.id) }
    }
}
private struct WebsiteToolBrowser: UIViewControllerRepresentable {
    let path: String
    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: URL(string: "https://cridergpt.com")!.appendingPathComponent(path))
    }
    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}
