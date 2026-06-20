import Foundation
#if canImport(CoreNFC)
import CoreNFC

/// Plain-text NDEF reader for Smart ID tags.
/// Web NFC writes the tag as a text record (`CriderGPT-XXXXXX`); this reader
/// pulls the text payload out of the first NDEF record and normalizes it.
@MainActor
final class NFCReader: NSObject, ObservableObject {
    @Published var lastScannedTag: String?
    @Published var errorMessage: String?

    private var session: NFCNDEFReaderSession?
    private var continuation: CheckedContinuation<String, Error>?

    static var isAvailable: Bool { NFCNDEFReaderSession.readingAvailable }

    func scan() async throws -> String {
        try await withCheckedThrowingContinuation { cont in
            self.continuation = cont
            let session = NFCNDEFReaderSession(
                delegate: self,
                queue: nil,
                invalidateAfterFirstRead: true
            )
            session.alertMessage = "Hold your iPhone near the Smart ID tag."
            self.session = session
            session.begin()
        }
    }

    private func finish(with result: Result<String, Error>) {
        let cont = continuation
        continuation = nil
        session = nil
        switch result {
        case .success(let v):
            lastScannedTag = v
            cont?.resume(returning: v)
        case .failure(let err):
            errorMessage = err.localizedDescription
            cont?.resume(throwing: err)
        }
    }
}

extension NFCReader: NFCNDEFReaderSessionDelegate {
    nonisolated func readerSession(
        _ session: NFCNDEFReaderSession,
        didDetectNDEFs messages: [NFCNDEFMessage]
    ) {
        for message in messages {
            for record in message.records {
                if let text = decodeText(from: record) {
                    let normalized = TagIdParser.normalize(text)
                    Task { @MainActor in self.finish(with: .success(normalized)) }
                    return
                }
            }
        }
        Task { @MainActor in
            self.finish(with: .failure(NFCError.noTextRecord))
        }
    }

    nonisolated func readerSession(
        _ session: NFCNDEFReaderSession,
        didInvalidateWithError error: Error
    ) {
        let nsErr = error as NSError
        // User-cancel and first-read invalidation aren't real failures.
        if nsErr.domain == NFCErrorDomain,
           nsErr.code == NFCReaderError.readerSessionInvalidationErrorUserCanceled.rawValue
            || nsErr.code == NFCReaderError.readerSessionInvalidationErrorFirstNDEFTagRead.rawValue {
            Task { @MainActor in
                if self.continuation != nil {
                    self.finish(with: .failure(NFCError.cancelled))
                }
            }
            return
        }
        Task { @MainActor in self.finish(with: .failure(error)) }
    }

    nonisolated func readerSessionDidBecomeActive(_ session: NFCNDEFReaderSession) {}

    /// NDEF text record payload format: `[status byte][lang code][text bytes]`.
    private nonisolated func decodeText(from record: NFCNDEFPayload) -> String? {
        // Use SDK helper when the record is a well-formed text record.
        if let s = record.wellKnownTypeTextPayload().0 { return s }

        // Fallback: best-effort UTF-8 of payload (URI or unknown text records).
        return String(data: record.payload, encoding: .utf8)
    }
}

enum NFCError: LocalizedError {
    case cancelled
    case noTextRecord

    var errorDescription: String? {
        switch self {
        case .cancelled: return "Scan cancelled."
        case .noTextRecord: return "Tag didn't contain a text record."
        }
    }
}

#else
/// Simulator / non-iOS fallback so the file still compiles in previews.
@MainActor
final class NFCReader: ObservableObject {
    @Published var lastScannedTag: String?
    @Published var errorMessage: String?
    static var isAvailable: Bool { false }
    func scan() async throws -> String {
        throw NSError(domain: "NFCReader", code: -1, userInfo: [
            NSLocalizedDescriptionKey: "NFC is not available on this device."
        ])
    }
}
#endif
