import XCTest
@testable import CriderGPT

final class ChatContractTests: XCTestCase {
    func testSavedWebsiteMessagePreservesModelAndCompletion() throws {
        let data = Data(#"{"id":"a2c435be-51ce-457e-8f81-9215cd423a54","role":"assistant","content":"A reply","created_at":"2026-10-18T00:00:00Z","metadata":{"model":"nebula-2.5-1000","incomplete":true,"finish_reason":"token_limit"}}"#.utf8)
        let message = try JSONDecoder().decode(ChatMessage.self, from: data)
        XCTAssertEqual(message.metadata?.model, "nebula-2.5-1000")
        XCTAssertEqual(message.metadata?.incomplete, true)
        XCTAssertEqual(message.created_at, "2026-10-18T00:00:00Z")
    }
    func testLegacyHistoryWithoutMetadata() throws {
        let data = Data(#"{"id":"a2c435be-51ce-457e-8f81-9215cd423a54","role":"user","content":"Hello","metadata":null}"#.utf8)
        XCTAssertNil(try JSONDecoder().decode(ChatMessage.self, from: data).metadata)
    }
    func testImageJobDoesNotRequireImmediateText() throws {
        let data = Data(#"{"type":"image_job","job_token":"fixture","model":"stable-diffusion-1.5"}"#.utf8)
        let response = try JSONDecoder().decode(ChatResponse.self, from: data)
        XCTAssertEqual(response.job_token, "fixture")
        XCTAssertNil(response.response)
    }
    func testUnsafeCitationSchemesAreRejected() {
        XCTAssertNil(ChatSource(id: 1, title: "Unsafe", url: "javascript:alert(1)").safeURL)
        XCTAssertNil(ChatSource(id: 1, title: "Credentials", url: "https://user:password@example.com").safeURL)
        XCTAssertNotNil(ChatSource(id: 1, title: "Official", url: "https://example.com/source").safeURL)
    }
    func testRequestedModelIsNotInventedActualModel() throws {
        let response = try JSONDecoder().decode(ChatResponse.self, from: Data(#"{"response":"Hello","requested_model":"native:nebula-2.5-1000"}"#.utf8))
        XCTAssertNil(response.metadata.model)
        XCTAssertEqual(response.metadata.requested_model, "native:nebula-2.5-1000")
    }
    func testPaymentsRemainGatedUntilServerVerificationIsReady() async {
        let enabled = await IAPManager.purchasingEnabled
        XCTAssertFalse(enabled)
    }
}
