import XCTest
@testable import JSONRenderCore

final class RenderTreeLimitsTests: XCTestCase {
    /// A spec whose `elements` map is a layered DAG: every element references
    /// the next layer twice, so the full expansion is 2^layers - 1 nodes from a
    /// map of `layers` entries. Forty layers would be over a trillion nodes.
    private func layeredSpec(layers: Int) -> Spec {
        var entries: [String] = []
        for index in 0..<layers {
            let next = index + 1
            let children = next < layers ? "[\"e\(next)\",\"e\(next)\"]" : "[]"
            entries.append("\"e\(index)\":{\"type\":\"Column\",\"props\":{},\"children\":\(children)}")
        }
        let json = "{\"root\":\"e0\",\"elements\":{\(entries.joined(separator: ","))}}"
        return Spec.decodePartial(JSONValue.decode(json)!)
    }

    /// A spec that nests `length` elements in a chain.
    private func chainSpec(length: Int) -> Spec {
        var entries: [String] = []
        for index in 0..<length {
            let children = index + 1 < length ? "[\"e\(index + 1)\"]" : "[]"
            entries.append("\"e\(index)\":{\"type\":\"Column\",\"props\":{},\"children\":\(children)}")
        }
        let json = "{\"root\":\"e0\",\"elements\":{\(entries.joined(separator: ","))}}"
        return Spec.decodePartial(JSONValue.decode(json)!)
    }

    private func nodeCount<Render>(_ element: RenderedElement<Render>) -> Int {
        var count = 1
        for child in element.children {
            count += nodeCount(child)
        }
        for slot in element.slots.values {
            for child in slot {
                count += nodeCount(child)
            }
        }
        return count
    }

    func testLayeredDAGStopsAtTheRenderedNodeLimit() {
        let recorder = WarningRecorder()
        let spec = layeredSpec(layers: 40)

        let start = Date()
        let tree = buildRenderTree(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: StateStore()
        )
        let elapsed = Date().timeIntervalSince(start)

        XCTAssertNil(tree, "A build that reaches a limit renders nothing")
        XCTAssertLessThan(elapsed, 5, "The build stops at the node limit instead of expanding the DAG")
        XCTAssertEqual(
            recorder.messages.filter { $0.contains("rendered node limit") }.count,
            1,
            "The limit is reported once"
        )
    }

    func testChainDeeperThanTheDepthLimitStops() {
        let recorder = WarningRecorder()
        let spec = chainSpec(length: RenderTreeLimits.default.maxDepth + 10)

        let tree = buildRenderTree(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: StateStore()
        )

        XCTAssertNil(tree)
        XCTAssertTrue(recorder.messages.contains { $0.contains("depth limit") })
    }

    func testVisitLimitStopsTheBuild() {
        let recorder = WarningRecorder()
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"r","elements":{"r":{"type":"Column","props":{},"children":["missing-a","missing-b","missing-c"]}}}"#
            )!
        )

        let tree = buildRenderTree(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: StateStore(),
            limits: RenderTreeLimits(maxDepth: 10, maxRenderedNodes: 10, maxWork: 2)
        )

        XCTAssertNil(tree)
        XCTAssertTrue(recorder.messages.contains { $0.contains("element visit limit") })
    }

    func testDepthLimitCountsTheRootAsOneLevel() {
        let rootOnly = Spec.decodePartial(
            JSONValue.decode(#"{"root":"r","elements":{"r":{"type":"Column","props":{}}}}"#)!
        )
        let withChild = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"r","elements":{"r":{"type":"Column","props":{},"children":["c"]},"c":{"type":"Text","props":{}}}}"#
            )!
        )
        let limits = RenderTreeLimits(maxDepth: 1, maxRenderedNodes: 10, maxWork: 10)
        let registry = Fixtures.recordingRegistry()

        XCTAssertNotNil(
            buildRenderTree(spec: rootOnly, registry: registry, store: StateStore(), limits: limits)
        )
        XCTAssertNil(
            buildRenderTree(spec: withChild, registry: registry, store: StateStore(), limits: limits)
        )
    }

    func testSpecWithinTheLimitsRendersCompletely() throws {
        let spec = layeredSpec(layers: 5)

        let tree = try XCTUnwrap(
            buildRenderTree(
                spec: spec,
                registry: Fixtures.recordingRegistry(),
                store: StateStore(),
                limits: RenderTreeLimits(maxDepth: 10, maxRenderedNodes: 31, maxWork: 100)
            )
        )

        XCTAssertEqual(nodeCount(tree), 31)
    }

    func testCustomLimitsAllowADeeperSpec() throws {
        let spec = chainSpec(length: RenderTreeLimits.default.maxDepth + 10)

        let tree = try XCTUnwrap(
            buildRenderTree(
                spec: spec,
                registry: Fixtures.recordingRegistry(),
                store: StateStore(),
                limits: RenderTreeLimits(maxDepth: 500, maxRenderedNodes: 10_000, maxWork: 10_000)
            )
        )

        XCTAssertEqual(nodeCount(tree), RenderTreeLimits.default.maxDepth + 10)
    }
}
