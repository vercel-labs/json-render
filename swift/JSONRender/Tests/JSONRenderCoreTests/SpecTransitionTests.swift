import XCTest
@testable import JSONRenderCore

#if canImport(Glibc)
import Glibc
#endif

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

    func testChangedSpecReplacesScalarsWithObjects() {
        // Several fields flip from a leaf to an object at once. The diff has to
        // write the children and remove the old leaf for each field; if a
        // removal of the old parent runs after its children are written, the
        // field disappears. A single field would only fail for one of the two
        // possible path orders.
        var previousState: [String: JSONValue] = [:]
        var nextState: [String: JSONValue] = [:]
        var expected: [String: JSONValue] = [:]
        for index in 0..<8 {
            let key = "field\(index)"
            previousState[key] = index.isMultiple(of: 2) ? .number(Double(index)) : .null
            let object: JSONValue = .object([
                "value": .number(Double(index)),
                "nested": .object(["deep": .bool(true)]),
            ])
            nextState[key] = object
            expected[key] = object
        }

        let previous = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: [:])],
            state: previousState
        )
        let next = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("changed")])],
            state: nextState
        )

        let result = stateAfterSpecChange(previous: previous, next: next, current: .object([:]))

        XCTAssertEqual(result, .object(expected))
    }


    func testDeepInitialStateBeyondTheDiffDepthIsOneLeafValue() {
        // Core's flatten stops descending at depth 20, so everything below is
        // compared and written as one value. The extra key the current state
        // holds there has to go with that value.
        let deepPath = "/" + (0...20).map { "n\($0)" }.joined(separator: "/")
        let previous = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: [:])],
            state: nestedState(["value": .number(1)], levels: 21)
        )
        let next = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("changed")])],
            state: nestedState(["value": .number(2)], levels: 21)
        )
        let current = setByPath(
            JSONValue.object([:]),
            deepPath,
            .object(["value": .number(1), "keep": .string("kept")])
        )

        let result = stateAfterSpecChange(previous: previous, next: next, current: current)

        XCTAssertEqual(getByPath(result, deepPath), .object(["value": .number(2)]))
    }

    func testKeysWithPointerCharactersKeepTheirShape() {
        // The diff now carries path segments and builds the pointer for a
        // changed value, so a key holding `/` or `~` has to be escaped rather
        // than turn into another level of nesting.
        let previous = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: [:])],
            state: ["a/b": .string("old"), "a~b": .string("old")]
        )
        let next = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("changed")])],
            state: ["a/b": .string("new"), "a~b": .string("new")]
        )

        let result = stateAfterSpecChange(previous: previous, next: next, current: .object([:]))

        XCTAssertEqual(result, next.state.map { JSONValue.object($0) })
    }

    func testLongKeyOverManyLeavesDoesNotBuildAPointerPerLeaf() throws {
        // A 20 KB key over 10k leaves is about 150 KB of state. Flattening
        // each side into pointer strings allocates the key once per leaf, which
        // is hundreds of megabytes on every streamed spec update.
        let key = String(repeating: "k", count: 20_000)
        var leaves: [String: JSONValue] = [:]
        for index in 0..<10_000 {
            leaves["leaf\(index)"] = .number(Double(index))
        }
        var changedLeaves = leaves
        changedLeaves["leaf0"] = .number(-1)
        let previous = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: [:])],
            state: [key: .object(leaves)]
        )
        // Same state, one prop different: a streaming patch, not a new spec.
        let next = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("changed")])],
            state: [key: .object(changedLeaves)]
        )

        let before = residentBytes()
        let result = stateAfterSpecChange(previous: previous, next: next, current: .object([:]))
        let after = residentBytes()

        XCTAssertEqual(
            getByPath(result, "/\(key)/leaf0"),
            .number(-1),
            "Only the changed leaf is written"
        )
        XCTAssertNil(getByPath(result, "/\(key)/leaf1"), "Equal leaves are not written")
        #if os(Linux)
        XCTAssertLessThan(
            after - before,
            64 * 1024 * 1024,
            "The diff does not allocate a full pointer per leaf"
        )
        #endif
    }

    /// Wraps `value` in `levels` plain objects, so the value sits that many
    /// levels below the state root.
    private func nestedState(_ value: [String: JSONValue], levels: Int) -> [String: JSONValue] {
        var current = JSONValue.object(value)
        for level in stride(from: levels - 1, through: 0, by: -1) {
            current = .object(["n\(level)": current])
        }
        return current.objectValue ?? [:]
    }

    func testChangedSpecReplacesObjectsWithScalars() {
        let previous = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: [:])],
            state: ["settings": .object(["theme": .string("dark"), "size": .number(2)])]
        )
        let next = Spec(
            root: "a",
            elements: ["a": UIElement(type: "Text", props: ["text": .string("changed")])],
            state: ["settings": .string("compact")]
        )

        let result = stateAfterSpecChange(
            previous: previous,
            next: next,
            current: .object(["settings": .object(["theme": .string("light"), "size": .number(2)])])
        )

        XCTAssertEqual(result, .object(["settings": .string("compact")]))
    }
}

/// The process's resident memory in bytes, so a test can bound an allocation
/// spike. Returns 0 where the platform has no cheap reading.
private func residentBytes() -> Int {
    #if os(Linux)
    guard let contents = try? String(contentsOfFile: "/proc/self/statm", encoding: .utf8) else {
        return 0
    }
    // Fields: total size, resident pages, shared pages, ...
    let fields = contents.split(separator: " ")
    guard fields.count > 1, let pages = Int(fields[1]) else { return 0 }
    return pages * Int(getpagesize())
    #else
    return 0
    #endif
}
