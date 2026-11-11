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
        XCTAssertEqual(record(tree).component, "Column")
        XCTAssertEqual(record(tree).children?.first?.props["text"], .string("Hi Ada"))
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
}
