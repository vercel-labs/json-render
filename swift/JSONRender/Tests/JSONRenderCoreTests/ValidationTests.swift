import XCTest
@testable import JSONRenderCore

final class ValidationTests: XCTestCase {
    private func validate(_ json: String, checkOrphans: Bool = false) -> SpecValidationResult {
        guard let value = JSONValue.decode(json) else {
            XCTFail("Test JSON is invalid")
            return SpecValidationResult(valid: false, issues: [])
        }
        return validateSpecJSON(value, options: ValidateSpecOptions(checkOrphans: checkOrphans))
    }

    func testMissingRoot() {
        let result = validate(#"{"elements":{}}"#)
        XCTAssertFalse(result.valid)
        XCTAssertEqual(result.issues.map(\.code), [.missingRoot])
    }

    func testRootNotFound() {
        let result = validate(#"{"root":"x","elements":{"a":{"type":"Text","props":{}}}}"#)
        XCTAssertFalse(result.valid)
        XCTAssertTrue(result.issues.contains { $0.code == .rootNotFound })
    }

    func testEmptyElements() {
        let result = validate(#"{"root":"a","elements":{}}"#)
        XCTAssertFalse(result.valid)
        XCTAssertTrue(result.issues.contains { $0.code == .emptySpec })
    }

    func testMissingChildren() {
        let result = validate(
            #"{"root":"a","elements":{"a":{"type":"Column","props":{},"children":["missing"]}}}"#
        )
        XCTAssertFalse(result.valid)
        let issue = result.issues.first { $0.code == .missingChild }
        XCTAssertEqual(issue?.elementKey, "a")
    }

    func testMissingSlotChild() {
        let result = validate(
            #"{"root":"a","elements":{"a":{"type":"Card","props":{},"slots":{"footer":["nope"]}}}}"#
        )
        XCTAssertTrue(result.issues.contains { $0.code == .missingChild && $0.message.contains("footer") })
    }

    func testInvalidVisibleMixedScope() {
        let result = validate(
            #"{"root":"a","elements":{"a":{"type":"Text","props":{},"visible":{"$state":"/x","$item":"y"}}}}"#
        )
        XCTAssertTrue(result.issues.contains { $0.code == .invalidVisible })
    }

    func testInvalidVisibleShapes() {
        let invalid = [
            #"{"$state":"/x","gt":"3"}"#,
            #"{"$index":false}"#,
            #"{"$state":"/x","not":false}"#,
            #"{"$state":"/x","unknown":1}"#,
        ]
        for visible in invalid {
            let value = JSONValue.decode(#"{"root":"a","elements":{"a":{"type":"Text","props":{},"visible":\#(visible)}}}"#)!
            XCTAssertFalse(validateSpecJSON(value).valid, visible)
        }

        let valid = [
            "true",
            #"{"$state":"/x","eq":"a"}"#,
            #"{"$item":"field","neq":2}"#,
            #"{"$index":true,"gte":0}"#,
            #"{"$state":"/x","gte":{"$state":"/y"}}"#,
            #"{"$state":"/x","not":true}"#,
            #"[{"$state":"/x","eq":1},{"$item":"y","eq":2}]"#,
            #"{"$and":[{"$state":"/x","eq":1},{"$or":[{"$state":"/y","eq":2},{"$state":"/z","eq":3}]}]}"#,
            #"{"$and":[]}"#,
        ]
        for visible in valid {
            let value = JSONValue.decode(#"{"root":"a","elements":{"a":{"type":"Text","props":{},"visible":\#(visible)}}}"#)!
            let result = validateSpecJSON(value)
            XCTAssertTrue(result.valid, "\(visible): \(result.issues.map(\.message))")
        }
    }

    func testRepeatWithoutChildren() {
        let result = validate(
            #"{"root":"a","elements":{"a":{"type":"List","props":{},"repeat":{"statePath":"/items"}},"b":{"type":"Text","props":{}}},"state":{"items":[]}}"#
        )
        XCTAssertTrue(result.issues.contains { $0.code == .repeatWithoutChildren })
    }

    func testRepeatStateMismatch() {
        let result = validate(
            #"{"root":"a","elements":{"a":{"type":"List","props":{},"repeat":{"statePath":"/items"},"children":["b"]},"b":{"type":"Text","props":{}}},"state":{"items":5}}"#
        )
        XCTAssertTrue(result.issues.contains { $0.code == .repeatStateMismatch })
    }

    func testRepeatStateMissing() {
        let result = validate(
            #"{"root":"a","elements":{"a":{"type":"List","props":{},"repeat":{"statePath":"/items"},"children":["b"]},"b":{"type":"Text","props":{}}},"state":{}}"#
        )
        XCTAssertTrue(result.issues.contains {
            $0.code == .repeatStateMismatch && $0.message.contains("no value there")
        })
    }

    func testRelativeRepeatOutsideScope() {
        let result = validate(
            #"{"root":"a","elements":{"a":{"type":"List","props":{},"repeat":{"statePath":{"$item":"tasks"}},"children":["b"]},"b":{"type":"Text","props":{}}}}"#
        )
        XCTAssertTrue(result.issues.contains { $0.code == .repeatItemOutsideScope })
    }

    func testNestedRelativeRepeatIsValid() {
        let result = validate(
            #"{"root":"a","elements":{"a":{"type":"List","props":{},"repeat":{"statePath":"/groups"},"children":["b"]},"b":{"type":"List","props":{},"repeat":{"statePath":{"$item":"items"}},"children":["c"]},"c":{"type":"Text","props":{}}},"state":{"groups":[{"items":[]}]}}"#
        )
        XCTAssertTrue(result.valid, result.issues.map(\.message).joined(separator: "\n"))
    }

    func testMisplacedFields() {
        let result = validate(
            #"{"root":"a","elements":{"a":{"type":"Text","props":{"visible":true,"on":{},"repeat":{},"watch":{}}}}}"#
        )
        let codes = Set(result.issues.map(\.code))
        XCTAssertTrue(codes.contains(.visibleInProps))
        XCTAssertTrue(codes.contains(.onInProps))
        XCTAssertTrue(codes.contains(.repeatInProps))
        XCTAssertTrue(codes.contains(.watchInProps))
    }

    func testLayeredRelativeRepeatsStayWithinTheValidationBudget() {
        // Each layer repeats over a different `$item` path, so every branch
        // gets its own repeat scope and the walk doubles per layer while the
        // spec stays a few kilobytes.
        let layers = 16
        var elements: [String: JSONValue] = [:]
        elements["root"] = .object([
            "type": .string("List"),
            "props": .object([:]),
            "repeat": .object(["statePath": .string("/items")]),
            "children": .array([.string("l0a"), .string("l0b")]),
        ])
        for level in 0..<layers {
            for side in ["a", "b"] {
                let children: [JSONValue] = level + 1 < layers
                    ? [.string("l\(level + 1)a"), .string("l\(level + 1)b")]
                    : [.string("leaf")]
                elements["l\(level)\(side)"] = .object([
                    "type": .string("List"),
                    "props": .object([:]),
                    "repeat": .object([
                        "statePath": .object(["$item": .string(side)]),
                    ]),
                    "children": .array(children),
                ])
            }
        }
        elements["leaf"] = .object(["type": .string("Text"), "props": .object([:])])

        let json = JSONValue.object([
            "root": .string("root"),
            "elements": .object(elements),
        ])

        let start = Date()
        let result = validateSpecJSON(json)
        XCTAssertLessThan(
            Date().timeIntervalSince(start),
            5,
            "The walk stops at its budget instead of doubling with each layer"
        )
        XCTAssertTrue(
            result.issues.contains { $0.code == .specTooComplex },
            "Stopping early is reported instead of passing as fully validated"
        )
    }

    func testManyElementsWithoutRepeatsAreValid() {
        // Every element records one context, which is not a reason to reject
        // a spec the renderer can build.
        let childCount = 4_001
        var elements: [String: JSONValue] = [
            "root": .object([
                "type": .string("Column"),
                "props": .object([:]),
                "children": .array((0..<childCount).map { .string("t\($0)") }),
            ]),
        ]
        for index in 0..<childCount {
            elements["t\(index)"] = .object([
                "type": .string("Text"),
                "props": .object([:]),
            ])
        }
        let json = JSONValue.object([
            "root": .string("root"),
            "elements": .object(elements),
        ])

        let result = validateSpecJSON(json)

        XCTAssertTrue(result.valid)
        XCTAssertFalse(result.issues.contains { $0.code == .specTooComplex })
    }

    func testLongRepeatItemNamesStayWithinTheValidationBudget() {
        // Each layer's repeat path is a long `$item` name, so every context
        // key copies a base path that grows by that name per layer.
        let name = String(repeating: "a", count: 4_000)
        let layers = 20
        var elements: [String: JSONValue] = [
            "root": .object([
                "type": .string("List"),
                "props": .object([:]),
                "repeat": .object(["statePath": .string("/items")]),
                "children": .array([.string("l0a"), .string("l0b")]),
            ]),
        ]
        for level in 0..<layers {
            for side in ["a", "b"] {
                let children: [JSONValue] = level + 1 < layers
                    ? [.string("l\(level + 1)a"), .string("l\(level + 1)b")]
                    : [.string("leaf")]
                elements["l\(level)\(side)"] = .object([
                    "type": .string("List"),
                    "props": .object([:]),
                    "repeat": .object([
                        "statePath": .object(["$item": .string(name + side)]),
                    ]),
                    "children": .array(children),
                ])
            }
        }
        elements["leaf"] = .object(["type": .string("Text"), "props": .object([:])])
        let json = JSONValue.object([
            "root": .string("root"),
            "elements": .object(elements),
        ])

        let before = peakResidentBytes()
        let result = validateSpecJSON(json)
        let after = peakResidentBytes()

        XCTAssertTrue(result.issues.contains { $0.code == .specTooComplex })
        #if os(Linux)
        XCTAssertLessThan(
            after - before,
            64 * 1024 * 1024,
            "Context keys stay within their byte budget"
        )
        #endif
    }

    func testManyMissingChildDiagnosticsStayWithinTheBudget() {
        // A document can give one element a long key and reference a missing
        // child thousands of times. Each reference is its own diagnostic, so
        // the messages would otherwise copy the key once per reference.
        let longKey = String(repeating: "k", count: 1_000_000)
        let childCount = 5_000
        let element = JSONValue.object([
            "type": .string("Column"),
            "props": .object([:]),
            "children": .array(Array(repeating: .string("missing"), count: childCount)),
        ])
        let json = JSONValue.object([
            "root": .string(longKey),
            "elements": .object([longKey: element]),
        ])

        let result = validateSpecJSON(json)

        let messageBytes = result.issues.reduce(0) { $0 + $1.message.utf8.count }
        XCTAssertLessThan(result.issues.count, childCount, "The diagnostic count is bounded")
        XCTAssertLessThan(messageBytes, 2_000_000, "The diagnostic text is bounded")
        XCTAssertTrue(
            result.issues.contains { $0.code == .missingChild },
            "The problem is still reported"
        )
        XCTAssertTrue(
            result.issues.contains { $0.code == .specTooComplex },
            "The result says that reporting stopped early"
        )
        XCTAssertFalse(result.valid)
        XCTAssertFalse(
            result.issues.contains { $0.message.contains(longKey) },
            "A long key is shortened in a message"
        )
    }

    func testOrphanedElement() {
        let json = #"{"root":"a","elements":{"a":{"type":"Text","props":{}},"orphan":{"type":"Text","props":{}}}}"#

        XCTAssertTrue(validate(json).valid)
        let withOrphans = validate(json, checkOrphans: true)
        XCTAssertTrue(withOrphans.valid, "Orphans are warnings, not errors")
        XCTAssertTrue(withOrphans.issues.contains {
            $0.code == .orphanedElement && $0.elementKey == "orphan" && $0.severity == .warning
        })
    }

    func testDroppedOrphanWarningsLeaveTheSpecValid() {
        // Orphans are warnings, so a spec whose only issues are unreachable
        // elements is valid, as core's validateSpec reports. Dropping some of
        // those warnings at the issue limit must not turn the spec invalid:
        // the summary takes the severity of the issues it replaces.
        let orphanCount = 1_001
        var elements: [String: JSONValue] = [
            "root": .object(["type": .string("Text"), "props": .object([:])]),
        ]
        for index in 0..<orphanCount {
            elements["orphan\(index)"] = .object([
                "type": .string("Text"),
                "props": .object([:]),
            ])
        }
        let json = JSONValue.object([
            "root": .string("root"),
            "elements": .object(elements),
        ])

        let result = validateSpecJSON(json, options: ValidateSpecOptions(checkOrphans: true))

        XCTAssertTrue(result.valid, "Unreachable elements are warnings, not errors")
        XCTAssertEqual(
            result.issues.filter { $0.code == .orphanedElement }.count,
            1_000,
            "The issue count is bounded"
        )
        let summary = result.issues.first { $0.code == .specTooComplex }
        XCTAssertEqual(
            summary?.severity,
            .warning,
            "The summary follows the severity of the issues it replaced"
        )
        XCTAssertEqual(result.issues.last, summary, "The summary comes last")
    }

    func testDecodedSpecMatchesRawValidation() throws {
        for name in try Fixtures.specNames() {
            let decoded = validateSpec(try Fixtures.spec(name))
            XCTAssertTrue(decoded.valid, name)
        }
    }
}
