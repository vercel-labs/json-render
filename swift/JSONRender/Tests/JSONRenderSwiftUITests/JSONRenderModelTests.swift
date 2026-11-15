#if canImport(SwiftUI)
import SwiftUI
import XCTest
import JSONRenderCore
@testable import JSONRenderSwiftUI

/// Covers how `JSONRenderModel` applies a spec that arrives after the view was
/// created. The rendering itself needs a running view, so these tests read the
/// published revision that makes SwiftUI rebuild the body.
final class JSONRenderModelTests: XCTestCase {
    private func spec(_ text: String, state: [String: JSONValue]? = nil) -> Spec {
        Spec(
            root: "text",
            elements: ["text": UIElement(type: "Text", props: ["text": .string(text)])],
            state: state
        )
    }

    func testSpecChangeWithUnchangedStatePublishesChange() {
        let first = spec("first", state: ["name": .string("Ada")])
        let second = spec("second", state: ["name": .string("Ada")])
        let model = JSONRenderModel(spec: first, registry: RendererRegistry<AnyView>())
        let revision = model.revision

        model.update(spec: second)

        XCTAssertEqual(model.spec, second)
        // The store has nothing to publish, so the model publishes the spec
        // change itself; otherwise the body keeps the previous tree.
        XCTAssertEqual(model.revision, revision + 1)
        XCTAssertEqual(model.store.snapshot, .object(["name": .string("Ada")]))
    }

    func testSpecChangeWithChangedStateUpdatesTheStore() {
        let first = spec("first", state: ["name": .string("Ada")])
        let second = spec("second", state: ["name": .string("Grace")])
        let model = JSONRenderModel(spec: first, registry: RendererRegistry<AnyView>())

        model.update(spec: second)

        XCTAssertEqual(model.spec, second)
        XCTAssertEqual(model.store.snapshot, .object(["name": .string("Grace")]))
    }

    func testEqualSpecIsIgnored() {
        let value = spec("first", state: ["name": .string("Ada")])
        let model = JSONRenderModel(spec: value, registry: RendererRegistry<AnyView>())
        let revision = model.revision

        model.update(spec: value)

        XCTAssertEqual(model.revision, revision)
        XCTAssertEqual(model.store.snapshot, .object(["name": .string("Ada")]))
    }
}
#endif
