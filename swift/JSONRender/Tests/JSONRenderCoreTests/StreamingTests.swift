import XCTest
@testable import JSONRenderCore

final class StreamingTests: XCTestCase {
    func testParseSpecStreamLine() {
        XCTAssertNotNil(parseSpecStreamLine(#"{"op":"add","path":"/root","value":"a"}"#))
        XCTAssertNil(parseSpecStreamLine(""))
        XCTAssertNil(parseSpecStreamLine("hello"))
        XCTAssertNil(parseSpecStreamLine(#"{"path":"/root"}"#))
        XCTAssertNil(parseSpecStreamLine(#"{"op":"add"}"#))
    }

    func testCompilerBuildsSpecFromChunks() throws {
        let compiler = SpecStreamCompiler()
        let patches = [
            #"{"op":"add","path":"/root","value":"col"}"#,
            #"{"op":"add","path":"/elements/col","value":{"type":"Column","props":{"gap":8},"children":["text"]}}"#,
            #"{"op":"add","path":"/elements/text","value":{"type":"Text","props":{"text":{"$template":"Hi ${/name}"}}}}"#,
            #"{"op":"add","path":"/state/name","value":"Ada"}"#,
        ]

        // Split one patch across chunks to test line buffering.
        var result = compiler.push(patches[0] + "\n" + String(patches[1].prefix(10)))
        XCTAssertEqual(result.newPatches.count, 1)

        result = compiler.push(String(patches[1].dropFirst(10)) + "\n" + patches[2] + "\n")
        XCTAssertEqual(result.newPatches.count, 2)

        _ = compiler.push(patches[3] + "\n")
        XCTAssertEqual(compiler.getPatches().count, 4)

        let spec = Spec.decodePartial(compiler.getResult())
        XCTAssertEqual(spec.root, "col")
        XCTAssertEqual(spec.elements["text"]?.props["text"], .object(["$template": .string("Hi ${/name}")]))
        XCTAssertEqual(spec.state?["name"], .string("Ada"))

        let store = StateStore(spec: spec)
        let tree = try XCTUnwrap(
            buildRenderTree(spec: spec, registry: Fixtures.recordingRegistry(), store: store)
        )
        XCTAssertEqual(recordedElement(tree).component, "Column")
        XCTAssertEqual(recordedElement(tree).children?.first?.props["text"], .string("Hi Ada"))
    }

    func testPartialSpecRendersWithLoading() throws {
        let partial = JSONValue.decode(
            #"{"root":"col","elements":{"col":{"type":"Column","props":{},"children":["text"]}}}"#
        )!
        let spec = Spec.decodePartial(partial)
        XCTAssertEqual(spec.root, "col")
        XCTAssertEqual(spec.elements.count, 1)

        let store = StateStore()
        let tree = try XCTUnwrap(
            buildRenderTree(
                spec: spec,
                registry: Fixtures.recordingRegistry(),
                store: store,
                loading: true
            )
        )
        XCTAssertTrue(tree.children.isEmpty)
    }

    func testApplyPatchOperations() throws {
        var document = JSONValue.decode(#"{"a":{"b":1},"list":[1,2]}"#)!

        try applySpecStreamPatch(&document, JsonPatch(op: .add, path: "/a/c", value: .number(3)))
        XCTAssertEqual(document["a"]?["c"], .number(3))

        try applySpecStreamPatch(&document, JsonPatch(op: .replace, path: "/a/b", value: .number(9)))
        XCTAssertEqual(document["a"]?["b"], .number(9))

        try applySpecStreamPatch(&document, JsonPatch(op: .add, path: "/list/-", value: .number(3)))
        XCTAssertEqual(document["list"], .array([.number(1), .number(2), .number(3)]))

        try applySpecStreamPatch(&document, JsonPatch(op: .copy, path: "/a/copy", from: "/a/b"))
        XCTAssertEqual(document["a"]?["copy"], .number(9))

        try applySpecStreamPatch(&document, JsonPatch(op: .move, path: "/moved", from: "/a/copy"))
        XCTAssertEqual(document["moved"], .number(9))
        XCTAssertNil(document["a"]?["copy"])

        try applySpecStreamPatch(&document, JsonPatch(op: .remove, path: "/a/c"))
        XCTAssertNil(document["a"]?["c"])
    }

    func testFailingTestPatchThrows() {
        var document = JSONValue.decode(#"{"count":1}"#)!
        XCTAssertThrowsError(
            try applySpecStreamPatch(&document, JsonPatch(op: .test, path: "/count", value: .number(2)))
        )
        XCTAssertNoThrow(
            try applySpecStreamPatch(&document, JsonPatch(op: .test, path: "/count", value: .number(1)))
        )
    }

    func testPatchAppliedToSpec() throws {
        var spec = try Fixtures.spec("user-profile-card")
        try applySpecPatch(
            &spec,
            JsonPatch(op: .replace, path: "/elements/heading/props/text", value: .string("Grace Hopper"))
        )
        XCTAssertEqual(spec.elements["heading"]?.props["text"], .string("Grace Hopper"))
    }

    func testResetClearsCompiler() {
        let compiler = SpecStreamCompiler()
        _ = compiler.push(#"{"op":"add","path":"/root","value":"a"}"# + "\n")
        XCTAssertEqual(compiler.getPatches().count, 1)
        compiler.reset()
        XCTAssertEqual(compiler.getPatches().count, 0)
        XCTAssertEqual(compiler.getResult(), .object([:]))
    }

    func testCopiesBeyondNodeBudgetAreRejected() {
        // Each patch copies the growing array into itself at index zero, so the
        // document doubles for a few dozen bytes of stream. The budget must
        // stop it well before the array holds millions of values.
        let limits = SpecStreamLimits(
            maxDepth: 100,
            maxNodes: 200,
            maxBytes: 1_000_000,
            maxWork: 10_000
        )
        let compiler = SpecStreamCompiler(limits: limits)
        _ = compiler.push(#"{"op":"add","path":"/a","value":[1,2,3,4]}"# + "\n")
        for _ in 0..<20 {
            _ = compiler.push(#"{"op":"copy","from":"/a","path":"/a/0"}"# + "\n")
        }

        XCTAssertLessThanOrEqual(nodeCount(compiler.getResult()), limits.maxNodes)
        XCTAssertLessThan(compiler.getPatches().count, 21)
    }

    func testCopiesBeyondDepthBudgetAreRejected() {
        let limits = SpecStreamLimits(
            maxDepth: 6,
            maxNodes: 10_000,
            maxBytes: 100_000,
            maxWork: 10_000
        )
        let compiler = SpecStreamCompiler(limits: limits)
        _ = compiler.push(#"{"op":"add","path":"/a","value":{"b":1}}"# + "\n")
        for _ in 0..<6 {
            _ = compiler.push(#"{"op":"copy","from":"/a","path":"/a/b"}"# + "\n")
        }

        // A rejected patch does not wedge the compiler: a shallow write after
        // it still applies.
        _ = compiler.push(#"{"op":"add","path":"/c","value":1}"# + "\n")

        XCTAssertLessThan(compiler.getPatches().count, 7)
        XCTAssertEqual(compiler.getResult()["c"], .number(1))
    }

    func testRejectedMoveDoesNotReleaseItsSourceFromTheBudget() {
        let limits = SpecStreamLimits(
            maxDepth: 4,
            maxNodes: 10,
            maxBytes: 1_000,
            maxWork: 10_000
        )
        let compiler = SpecStreamCompiler(limits: limits)
        _ = compiler.push(#"{"op":"add","path":"/a","value":[1,2]}"# + "\n")
        _ = compiler.push(#"{"op":"add","path":"/b","value":[3,4]}"# + "\n")

        // The move would nest the array three levels down, past the depth
        // limit, so it is dropped and the source stays where it was.
        _ = compiler.push(#"{"op":"move","from":"/a","path":"/b/0/0"}"# + "\n")
        XCTAssertEqual(compiler.getResult()["a"], .array([.number(1), .number(2)]))

        // The source still counts toward the budget, so this write would take
        // the document to 11 values and is rejected. Releasing the source in
        // the dropped move would wrongly leave room for it.
        _ = compiler.push(#"{"op":"add","path":"/c","value":[5,6,7]}"# + "\n")

        XCTAssertNil(compiler.getResult()["c"])
        XCTAssertLessThanOrEqual(nodeCount(compiler.getResult()), limits.maxNodes)
    }

    func testSkippedIndexWriteDoesNotReleaseBudgetForACopy() {
        // `+0` is an index to `Int(_:)` but not to the path writer, which reads
        // plain digits only, so `replace /arr/+0` leaves the document alone. A
        // budget that credited the value at `arr[0]` would let the following
        // copy of `arr[0]` grow the document for free, past `maxBytes`.
        let limits = SpecStreamLimits(
            maxDepth: 100,
            maxNodes: 10_000,
            maxBytes: 1_000,
            maxWork: 100_000
        )
        let compiler = SpecStreamCompiler(limits: limits)
        let item = String(repeating: "x", count: 200)
        _ = compiler.push(#"{"op":"add","path":"/arr","value":["\#(item)"]}"# + "\n")

        for _ in 0..<20 {
            _ = compiler.push(#"{"op":"replace","path":"/arr/+0","value":null}"# + "\n")
            _ = compiler.push(#"{"op":"copy","from":"/arr/0","path":"/arr/-"}"# + "\n")
        }

        let result = compiler.getResult()
        XCTAssertEqual(
            result["arr"]?.arrayValue?.first,
            .string(item),
            "The writer skips the non-digit index, so the replace changes nothing"
        )
        let bytes = measureJSONValue(result, maxDepth: 100)?.bytes ?? .max
        XCTAssertLessThanOrEqual(bytes, limits.maxBytes)
        XCTAssertLessThanOrEqual(
            result["arr"]?.arrayValue?.count ?? 0,
            4,
            "Copies stop once the budget is spent"
        )
    }

    func testPatchBeyondByteBudgetIsRejectedAndStreamContinues() {
        let limits = SpecStreamLimits(
            maxDepth: 100,
            maxNodes: 1_000,
            maxBytes: 40,
            maxWork: 10_000
        )
        let compiler = SpecStreamCompiler(limits: limits)
        let long = String(repeating: "x", count: 100)
        _ = compiler.push(#"{"op":"add","path":"/long","value":"\#(long)"}"# + "\n")
        _ = compiler.push(#"{"op":"add","path":"/ok","value":1}"# + "\n")

        XCTAssertEqual(compiler.getPatches().count, 1)
        XCTAssertEqual(compiler.getResult()["ok"], .number(1))
        XCTAssertNil(compiler.getResult()["long"])
    }

    func testDecodePartialSkipsElementBeyondLimits() {
        let json = JSONValue.decode(
            #"""
            {"root":"small","elements":{
              "small":{"type":"Text","props":{"text":"hi"}},
              "big":{"type":"List","props":{"values":[1,2,3,4,5,6,7,8,9,10]}}
            }}
            """#
        )!
        let limits = SpecStreamLimits(
            maxDepth: 10,
            maxNodes: 8,
            maxBytes: 1_000,
            maxWork: 1_000
        )

        let spec = Spec.decodePartial(json, limits: limits)

        XCTAssertNotNil(spec.elements["small"])
        XCTAssertNil(spec.elements["big"])
    }

    func testContainersCountTowardTheMeasuredSize() {
        // Without a size of their own, a tree of empty containers measures as
        // nothing and a byte limit never stops it.
        let nested = JSONValue.array([.array([.array([])])])
        let size = measureJSONValue(nested, maxDepth: 10)
        XCTAssertEqual(size?.nodes, 3)
        XCTAssertEqual(size?.bytes, 6, "Each container adds its two brackets")
    }

    func testMeasureStopsAtItsByteAndNodeLimits() {
        let big = JSONValue.array((0..<100_000).map { .number(Double($0)) })

        XCTAssertNil(measureJSONValue(big, maxDepth: 10, maxBytes: 1_000))
        XCTAssertNil(measureJSONValue(big, maxDepth: 10, maxNodes: 100))
        XCTAssertNotNil(
            measureJSONValue(big, maxDepth: 10, maxNodes: 200_000, maxBytes: 10_000_000)
        )
    }

    private func nodeCount(_ value: JSONValue) -> Int {
        switch value {
        case .array(let items):
            return 1 + items.reduce(0) { $0 + nodeCount($1) }
        case .object(let object):
            return 1 + object.values.reduce(0) { $0 + nodeCount($1) }
        default:
            return 1
        }
    }
}
