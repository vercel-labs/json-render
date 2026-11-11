import XCTest
@testable import JSONRenderCore

final class RenderTreeTests: XCTestCase {
    private func build(
        _ json: String,
        registry: RendererRegistry<String> = Fixtures.recordingRegistry(),
        state: [String: JSONValue]? = nil,
        loading: Bool = false
    ) throws -> RenderedElement<String> {
        guard let raw = JSONValue.decode(json) else {
            throw SimpleError("Invalid test JSON")
        }
        let spec = Spec.decodePartial(raw)
        let store = StateStore(state ?? spec.state ?? [:])
        return try XCTUnwrap(
            buildRenderTree(spec: spec, registry: registry, store: store, loading: loading)
        )
    }

    func testChildrenRenderInSpecOrder() throws {
        let tree = try build(
            #"{"root":"r","elements":{"r":{"type":"Column","props":{},"children":["b","a"]},"a":{"type":"Text","props":{"text":"a"}},"b":{"type":"Text","props":{"text":"b"}}}}"#
        )
        XCTAssertEqual(tree.children.map(\.props["text"]), [.string("b"), .string("a")])
    }

    func testSlotsAreRenderedSeparately() throws {
        var captured: ComponentRenderContext<String>?
        let registry = RendererRegistry<String>(
            components: [
                "Card": ComponentDefinition { context in
                    captured = context
                    return "Card"
                },
                "Text": ComponentDefinition { _ in "Text" },
            ]
        )
        let tree = try build(
            #"{"root":"c","elements":{"c":{"type":"Card","props":{},"children":["body"],"slots":{"footer":["foot"]}},"body":{"type":"Text","props":{"text":"body"}},"foot":{"type":"Text","props":{"text":"footer"}}}}"#,
            registry: registry
        )

        XCTAssertEqual(tree.children.map(\.key), ["body"])
        XCTAssertEqual(tree.slots["footer"]?.map(\.key), ["foot"])
        XCTAssertEqual(captured?.slots["footer"]?.count, 1)
    }

    func testMissingChildWarnsAndIsSkipped() throws {
        let recorder = WarningRecorder()
        let tree = try build(
            #"{"root":"r","elements":{"r":{"type":"Column","props":{},"children":["a","missing"]},"a":{"type":"Text","props":{}}}}"#
        )
        XCTAssertEqual(tree.children.count, 1)
        XCTAssertTrue(recorder.messages.contains { $0.contains("Missing element \"missing\"") })
    }

    func testUnknownComponentDropsSubtree() throws {
        let recorder = WarningRecorder()
        let tree = try build(
            #"{"root":"r","elements":{"r":{"type":"Column","props":{},"children":["mystery"]},"mystery":{"type":"Mystery","props":{},"children":["child"]},"child":{"type":"Text","props":{}}}}"#
        )
        XCTAssertTrue(tree.children.isEmpty)
        XCTAssertTrue(recorder.messages.contains { $0.contains("No renderer for component type: Mystery") })
    }

    func testFallbackRendersUnknownComponent() throws {
        let registry = RendererRegistry<String>(
            components: ["Column": ComponentDefinition { _ in "column" }],
            fallback: ComponentDefinition { context in "fallback:\(context.element.type)" }
        )
        let tree = try build(
            #"{"root":"r","elements":{"r":{"type":"Column","props":{},"children":["mystery"]},"mystery":{"type":"Mystery","props":{}}}}"#,
            registry: registry
        )
        XCTAssertEqual(tree.children.first?.content, "fallback:Mystery")
    }

    func testBlurredVisibilityHidesSubtree() throws {
        let tree = try build(
            #"{"root":"r","state":{"show":false},"elements":{"r":{"type":"Column","props":{},"children":["a"]},"a":{"type":"Text","props":{},"visible":{"$state":"/show"}}}}"#
        )
        XCTAssertTrue(tree.children.isEmpty)
    }

    func testRepeatUsesKeyFilterAndScope() throws {
        let tree = try build(
            #"{"root":"list","state":{"items":[{"id":"a","on":true},{"id":"b","on":false}]},"elements":{"list":{"type":"List","props":{},"repeat":{"statePath":"/items","key":"id"},"visible":{"$item":"on","eq":true},"children":["item"]},"item":{"type":"Text","props":{"label":{"$item":"id"},"at":{"$index":true}}}}}"#
        )

        // The container's $item condition filters items instead of hiding the list.
        XCTAssertEqual(tree.component, "List")
        XCTAssertEqual(tree.children.count, 1)
        XCTAssertEqual(tree.children.first?.props["label"], .string("a"))
        XCTAssertEqual(tree.children.first?.scope?.basePath, "/items/0")
        XCTAssertEqual(tree.children.first?.scope?.index, 0)
    }

    func testNestedRepeatAndBindings() throws {
        let tree = try build(
            #"{"root":"list","state":{"groups":[{"items":[{"name":"x"}]}]},"elements":{"list":{"type":"List","props":{},"repeat":{"statePath":"/groups"},"children":["inner"]},"inner":{"type":"List","props":{},"repeat":{"statePath":{"$item":"items"}},"children":["row"]},"row":{"type":"Text","props":{"name":{"$item":"name"},"bound":{"$bindItem":"name"}}}}}"#
        )

        let inner = try XCTUnwrap(tree.children.first)
        XCTAssertEqual(inner.scope?.basePath, "/groups/0")
        let row = try XCTUnwrap(inner.children.first)
        XCTAssertEqual(row.props["name"], .string("x"))
        XCTAssertEqual(row.bindings?["bound"], "/groups/0/items/0/name")
    }

    func testEventsDispatchActions() async throws {
        let store = StateStore(["count": .number(0)])
        let dispatcher = ActionDispatcher(store: store)
        var captured: ComponentRenderContext<String>?

        var registry = Fixtures.recordingRegistry()
        registry.components["Button"] = ComponentDefinition { context in
            captured = context
            return "Button"
        }

        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"b","elements":{"b":{"type":"Button","props":{},"on":{"press":[{"action":"setState","params":{"statePath":"/count","value":1}},{"action":"setState","params":{"statePath":"/clicked","value":true}}]}}}}"#
            )!
        )
        let tree = try XCTUnwrap(
            buildRenderTree(spec: spec, registry: registry, store: store, dispatcher: dispatcher)
        )
        _ = tree
        let context = try XCTUnwrap(captured)
        XCTAssertTrue(context.on("press").isBound)
        XCTAssertFalse(context.on("click").isBound)

        await context.emit("press")
        XCTAssertEqual(store.get("/count"), .number(1))
        XCTAssertEqual(store.get("/clicked"), .bool(true))
    }

    func testWatchTrackerFiresOnChangeNotOnFirstRun() async throws {
        let store = StateStore(["value": .string("a")])
        let dispatcher = ActionDispatcher(
            store: store,
            handlers: ["record": { _ in }]
        )
        let calls = Box<Int>(0)
        dispatcher.register("record") { _ in calls.value += 1 }

        var registry = Fixtures.recordingRegistry()
        registry.components["Text"] = ComponentDefinition { context in
            context.element.watch == nil ? "plain" : "watching"
        }

        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"t","state":{"value":"a"},"elements":{"t":{"type":"Text","props":{},"watch":{"/value":{"action":"record"}}}}}"#
            )!
        )
        let state = StateStore(spec: spec)

        func records() -> [WatchRecord] {
            let tree = buildRenderTree(spec: spec, registry: registry, store: state, dispatcher: dispatcher)!
            return watchRecords(tree, state: state.snapshot)
        }

        let tracker = WatchTracker()
        await tracker.process(records(), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 0, "Initial mount does not fire watch actions")

        state.set("/value", .string("b"))
        await tracker.process(records(), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 1)

        await tracker.process(records(), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 1, "Unchanged values do not fire again")
    }

    func testWatchTrackerSnapshotFiresOnFirstChange() async throws {
        let calls = Box<Int>(0)
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"t","state":{"value":"a"},"elements":{"t":{"type":"Text","props":{},"watch":{"/value":{"action":"record"}}}}}"#
            )!
        )
        let state = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("record") { _ in calls.value += 1 }
        let registry = Fixtures.recordingRegistry()

        func records() -> [WatchRecord] {
            let tree = buildRenderTree(spec: spec, registry: registry, store: state, dispatcher: dispatcher)!
            return watchRecords(tree, state: state.snapshot)
        }

        let tracker = WatchTracker()
        tracker.snapshot(records())
        XCTAssertEqual(calls.value, 0, "Taking the snapshot does not fire watch actions")

        state.set("/value", .string("b"))
        await tracker.process(records(), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 1, "The first change after the snapshot fires")
    }

    func testCyclicSpecStopsAtTheCycle() throws {
        let recorder = WarningRecorder()
        let tree = try build(
            #"{"root":"a","elements":{"a":{"type":"Column","props":{},"children":["a"]}}}"#
        )
        XCTAssertEqual(tree.component, "Column")
        XCTAssertTrue(tree.children.isEmpty)
        XCTAssertTrue(recorder.messages.contains { $0.contains("contains itself") })

        _ = recorder
    }
}
