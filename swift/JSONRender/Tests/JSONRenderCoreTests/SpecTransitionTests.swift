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

    func testChangedSpecKeepsEditsToUnchangedInitialState() {
        let previous = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("first")])],
            state: ["name": .string("Ada"), "count": .number(1)]
        )
        // Same state, a different prop: a streaming patch, not a new spec.
        let next = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("changed")])],
            state: ["name": .string("Ada"), "count": .number(1)]
        )

        let result = stateAfterSpecChange(
            previous: previous,
            next: next,
            current: .object(["name": .string("Edited"), "count": .number(3)])
        )

        XCTAssertEqual(result, .object(["name": .string("Edited"), "count": .number(3)]))
    }

    func testChangedSpecUpdatesOnlyChangedInitialStateKeys() {
        let previous = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: [:])],
            state: ["name": .string("Ada"), "count": .number(1)]
        )
        let next = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("changed")])],
            state: ["name": .string("Ada"), "count": .number(2)]
        )

        let result = stateAfterSpecChange(
            previous: previous,
            next: next,
            current: .object(["name": .string("Edited"), "count": .number(3)])
        )

        XCTAssertEqual(result, .object(["name": .string("Edited"), "count": .number(2)]))
    }

    func testChangedSpecComparesNestedStateKeysSeparately() {
        let previous = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: [:])],
            state: ["user": .object(["name": .string("Ada"), "age": .number(36)])]
        )
        let next = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("changed")])],
            state: ["user": .object(["name": .string("Ada"), "age": .number(37)])]
        )

        let result = stateAfterSpecChange(
            previous: previous,
            next: next,
            current: .object(["user": .object(["name": .string("Edited"), "age": .number(36)])])
        )

        XCTAssertEqual(
            result,
            .object(["user": .object(["name": .string("Edited"), "age": .number(37)])])
        )
    }

    func testChangedSpecAddsNewInitialStateKeys() {
        let next = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("changed")])],
            state: ["name": .string("Ada"), "count": .number(1), "draft": .string("")]
        )

        let result = stateAfterSpecChange(
            previous: first,
            next: next,
            current: .object(["name": .string("Edited"), "count": .number(1)])
        )

        XCTAssertEqual(
            result,
            .object(["name": .string("Edited"), "count": .number(1), "draft": .string("")])
        )
    }
}
