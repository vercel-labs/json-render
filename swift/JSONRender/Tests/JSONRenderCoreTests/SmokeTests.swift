import XCTest
@testable import JSONRenderCore

final class SmokeTests: XCTestCase {
    func testSpecDecodes() throws {
        let spec = try JSONDecoder().decode(Spec.self, from: Data(#"{"root":"a","elements":{"a":{"type":"Text","props":{"text":"hi"}}}}"#.utf8))
        XCTAssertEqual(spec.root, "a")
        XCTAssertEqual(spec.elements["a"]?.type, "Text")
    }
}
