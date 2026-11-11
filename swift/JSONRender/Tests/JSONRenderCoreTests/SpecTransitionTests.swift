import XCTest
@testable import JSONRenderCore

final class SpecTransitionTests: XCTestCase {
    private let first = Spec(
        root: "a",
        elements: ["a": UIElement(type: "Text", props: ["text": .string("first")])],
        state: ["name": .string("Ada"), "count": .number(1)]
    )

    private let second = Spec(
        root: "b",
        elements: ["b": UIElement(type: "Text", props: ["text": .string("second")])],
        state: ["name": .string("Grace")]
    )

    func testEqualSpecKeepsCurrentState() {
        let current = JSONValue.object([
            "name": .string("Edited"),
            "count": .number(99),
            "draft": .bool(true),
        ])

        let next = stateAfterSpecChange(previous: first, next: first, current: current)

        XCTAssertEqual(next, current)
    }

    func testChangedSpecResetsToNewInitialState() {
        let next = stateAfterSpecChange(
            previous: first,
            next: second,
            current: .object(["name": .string("Edited"), "count": .number(99)])
        )

        XCTAssertEqual(next, .object(["name": .string("Grace")]))
    }

    func testChangedSpecWithoutStateClearsStore() {
        let spec = Spec(
            root: "c",
            elements: ["c": UIElement(type: "Text", props: ["text": .string("third")])]
        )

        let next = stateAfterSpecChange(
            previous: first,
            next: spec,
            current: .object(["name": .string("Edited")])
        )

        XCTAssertEqual(next, .object([:]))
    }
}
