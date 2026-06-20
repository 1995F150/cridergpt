import Foundation
import Supabase

@MainActor
final class SmartIDViewModel: ObservableObject {
    @Published var manualInput: String = ""
    @Published var isLooking: Bool = false
    @Published var result: TagLookupResponse?
    @Published var errorMessage: String?
    @Published var lastTagId: String?

    let nfc = NFCReader()

    var nfcAvailable: Bool { NFCReader.isAvailable }

    func scanAndLookup() async {
        errorMessage = nil
        do {
            let raw = try await nfc.scan()
            await lookup(tagId: raw)
        } catch NFCError.cancelled {
            // user dismissed — silent
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func lookupManual() async {
        let normalized = TagIdParser.normalize(manualInput)
        guard TagIdParser.looksValid(normalized) else {
            errorMessage = "Enter a tag ID first."
            return
        }
        await lookup(tagId: normalized)
    }

    private func lookup(tagId: String) async {
        isLooking = true
        errorMessage = nil
        result = nil
        lastTagId = tagId
        defer { isLooking = false }

        struct Body: Encodable { let tag_id: String }
        do {
            let res: TagLookupResponse = try await SB.client.functions.invoke(
                "tag-lookup",
                options: FunctionInvokeOptions(body: Body(tag_id: tagId))
            )
            result = res
            if let err = res.error, res.animal == nil, res.animal_name == nil {
                errorMessage = err
            }
        } catch let FunctionsError.httpError(code, data) {
            struct Err: Decodable { let error: String? }
            let msg = (try? JSONDecoder().decode(Err.self, from: data))?.error
            errorMessage = msg ?? "Lookup failed (HTTP \(code))."
        } catch {
            errorMessage = "Lookup failed: \(error.localizedDescription)"
        }
    }

    func reset() {
        result = nil
        errorMessage = nil
        manualInput = ""
        lastTagId = nil
    }
}
