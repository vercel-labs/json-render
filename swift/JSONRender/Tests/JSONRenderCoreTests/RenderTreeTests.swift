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
            buildRenderTreeWithWatches(spec: spec, registry: registry, store: state, dispatcher: dispatcher).watches
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
            buildRenderTreeWithWatches(spec: spec, registry: registry, store: state, dispatcher: dispatcher).watches
        }

        let tracker = WatchTracker()
        tracker.snapshot(records())
        XCTAssertEqual(calls.value, 0, "Taking the snapshot does not fire watch actions")

        state.set("/value", .string("b"))
        await tracker.process(records(), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 1, "The first change after the snapshot fires")
    }

    // MARK: - Watch change detection

    private func makeWatchSpec(
        watch: String,
        state: String = #"{"value":"a","other":0}"#
    ) -> Spec {
        Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"t","state":\#(state),"elements":{"t":{"type":"Text","props":{},"watch":{\#(watch)}}}}"#
            )!
        )
    }

    private func records(_ spec: Spec, _ state: StateStore) -> [WatchRecord] {
        buildRenderTreeWithWatches(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: state
        ).watches
    }

    func testWatchOnObjectPathIgnoresUnrelatedAndEqualChanges() async throws {
        let spec = makeWatchSpec(
            watch: #""/filters":{"action":"record"}"#,
            state: #"{"filters":{"q":"b"},"other":0}"#
        )
        let state = StateStore(spec: spec)
        let calls = Box<Int>(0)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("record") { _ in calls.value += 1 }

        let tracker = WatchTracker()
        tracker.snapshot(records(spec, state))

        state.set("/other", .number(1))
        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 0, "An unrelated path does not fire the watch")

        state.set("/filters", .object(["q": .string("b")]))
        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 0, "An equal object does not fire the watch")

        state.set("/filters", .object(["q": .string("c")]))
        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 1)

        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 1, "An unchanged object does not fire again")
    }

    func testWatchOnArrayPathIgnoresUnrelatedChanges() async throws {
        let spec = makeWatchSpec(
            watch: #""/items":{"action":"record"}"#,
            state: #"{"items":[1,2],"other":0}"#
        )
        let state = StateStore(spec: spec)
        let calls = Box<Int>(0)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("record") { _ in calls.value += 1 }

        let tracker = WatchTracker()
        tracker.snapshot(records(spec, state))

        state.set("/other", .number(1))
        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 0)

        state.set("/items", .array([.number(1), .number(2)]))
        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 0, "An equal array does not fire the watch")

        state.set("/items", .array([.number(1), .number(3)]))
        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 1)
    }

    func testWatchActionWritingAnEqualObjectDoesNotLoop() async throws {
        let spec = makeWatchSpec(
            watch: #""/filters":{"action":"setState","params":{"statePath":"/filters","value":{"q":"a"}}}"#,
            state: #"{"filters":{"q":"b"}}"#
        )
        let state = StateStore(spec: spec)
        let dispatches = Box<Int>(0)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.onDispatch = { _ in dispatches.value += 1 }

        let tracker = WatchTracker()
        tracker.snapshot(records(spec, state))

        state.set("/filters", .object(["q": .string("a")]))
        // The model processes watches after every state change, including the
        // one the watch action itself makes.
        for _ in 0..<50 {
            await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        }

        XCTAssertEqual(dispatches.value, 1, "Writing an equal value back does not fire again")
        XCTAssertEqual(state.get("/filters"), .object(["q": .string("a")]))
    }

    func testSlowWatchActionDoesNotFireAgainForALaterChange() async throws {
        let spec = makeWatchSpec(watch: #""/value":{"action":"record"}"#)
        let state = StateStore(spec: spec)
        let calls = Box<Int>(0)
        let gate = AsyncGate()
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("record") { _ in
            calls.value += 1
            if calls.value == 1 { await gate.wait() }
        }

        let tracker = WatchTracker()
        tracker.snapshot(records(spec, state))

        state.set("/value", .string("b"))
        let running = Task {
            await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        }

        // Wait for the slow handler to start, then change another path while
        // it is still running.
        var spins = 0
        while calls.value == 0 && spins < 100_000 {
            await Task.yield()
            spins += 1
        }
        XCTAssertEqual(calls.value, 1)

        state.set("/other", .number(1))
        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 1, "An unrelated change while the action runs does not fire it again")

        await gate.open()
        await running.value
        XCTAssertEqual(calls.value, 1)
    }

    func testWatchBindingsReadLiveStatePerBinding() async throws {
        // The second binding reads `/value` after the first one writes it, the
        // way an event's bindings resolve against live state.
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"t","state":{"trigger":0,"value":""},"elements":{"t":{"type":"Text","props":{},"watch":{"/trigger":[{"action":"setState","params":{"statePath":"/value","value":"new"}},{"action":"capture","params":{"seen":{"$state":"/value"}}}]}}}}"#
            )!
        )
        let state = StateStore(spec: spec)
        let seen = Box<JSONValue?>(nil)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("capture") { params in seen.value = params["seen"] }

        let tracker = WatchTracker()
        tracker.snapshot(records(spec, state))
        state.set("/trigger", .number(1))
        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)

        XCTAssertEqual(seen.value, .string("new"), "The second binding sees the first one's write")
    }

    func testSlowWatchDoesNotHoldUpAnotherWatch() async throws {
        // Each element's watch runs on its own, the way React runs each
        // element's effect. One record waiting on a slow handler must not delay
        // another record's watch.
        var registry = Fixtures.recordingRegistry()
        registry.components["Column"] = ComponentDefinition { _ in "Column" }
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"col","state":{"a":0,"b":0},"elements":{"col":{"type":"Column","props":{},"children":["wa","wb"]},"wa":{"type":"Text","props":{},"watch":{"/a":{"action":"slow"}}},"wb":{"type":"Text","props":{},"watch":{"/b":{"action":"fast"}}}}}"#
            )!
        )
        let state = StateStore(spec: spec)
        let gate = AsyncGate()
        let slowCalls = Box<Int>(0)
        let fastCalls = Box<Int>(0)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("slow") { _ in
            slowCalls.value += 1
            await gate.wait()
        }
        dispatcher.register("fast") { _ in fastCalls.value += 1 }

        func records() -> [WatchRecord] {
            buildRenderTreeWithWatches(
                spec: spec,
                registry: registry,
                store: state,
                dispatcher: dispatcher
            ).watches
        }

        let tracker = WatchTracker()
        tracker.snapshot(records())

        state.set("/a", .number(1))
        let slowPass = Task {
            await tracker.process(records(), dispatcher: dispatcher, store: state)
        }
        var spins = 0
        while slowCalls.value == 0 && spins < 100_000 {
            await Task.yield()
            spins += 1
        }
        XCTAssertEqual(slowCalls.value, 1)

        state.set("/b", .number(1))
        await tracker.process(records(), dispatcher: dispatcher, store: state)
        XCTAssertEqual(fastCalls.value, 1, "The other watch runs while the slow action waits")

        await gate.open()
        await slowPass.value
        XCTAssertEqual(fastCalls.value, 1, "The slow action's completion does not fire it again")
    }

    func testAddingBaselinesKeepsAPendingWatchChange() async throws {
        // `update(spec:)` adds baselines for watches it has not seen. It must
        // not reset the baseline of a watch whose pass has not run yet, or the
        // user edit it was waiting on never fires.
        let spec = makeWatchSpec(watch: #""/value":{"action":"record"}"#)
        let state = StateStore(spec: spec)
        let calls = Box<Int>(0)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("record") { _ in calls.value += 1 }

        let tracker = WatchTracker()
        tracker.snapshot(records(spec, state))

        state.set("/value", .string("b"))
        // A changed spec arrives before the watch pass, as the model's
        // `update(spec:)` does for a new spec.
        tracker.addBaselines(records(spec, state))

        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        XCTAssertEqual(calls.value, 1, "The unseen edit still fires")
    }

    func testRepeatRowsKeepTheirKeyWhenAnEarlierItemIsRemoved() throws {
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"list","state":{"items":[{"id":"a"},{"id":"b"}]},"elements":{"list":{"type":"List","props":{},"repeat":{"statePath":"/items","key":"id"},"children":["row"]},"row":{"type":"Text","props":{"label":{"$item":"id"}}}}}"#
            )!
        )
        let state = StateStore(spec: spec)

        func rowIDs() throws -> [String] {
            try XCTUnwrap(
                buildRenderTree(spec: spec, registry: Fixtures.recordingRegistry(), store: state)
            ).children.map(\.id)
        }

        let before = try rowIDs()
        XCTAssertEqual(before.count, 2)

        state.set("/items", .array([.object(["id": .string("b")])]))

        XCTAssertEqual(
            try rowIDs(),
            [before[1]],
            "Removing an earlier row does not hand its identity to the one after it"
        )
    }

    func testWatchOnHiddenElementFires() async throws {
        var registry = Fixtures.recordingRegistry()
        registry.components["Column"] = ComponentDefinition { _ in "Column" }
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"r","state":{"show":false,"value":"a"},"elements":{"r":{"type":"Column","props":{},"children":["hidden"]},"hidden":{"type":"Text","props":{},"visible":{"$state":"/show"},"watch":{"/value":{"action":"record"}}}}}"#
            )!
        )
        let state = StateStore(spec: spec)
        let calls = Box<Int>(0)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("record") { _ in calls.value += 1 }

        let build = buildRenderTreeWithWatches(
            spec: spec,
            registry: registry,
            store: state,
            dispatcher: dispatcher
        )
        XCTAssertNotNil(build.tree)
        XCTAssertTrue(try XCTUnwrap(build.tree).children.isEmpty, "The hidden element does not render")
        XCTAssertEqual(build.watches.count, 1, "The hidden element still contributes its watch")

        let tracker = WatchTracker()
        tracker.snapshot(build.watches)
        state.set("/value", .string("b"))
        await tracker.process(
            buildRenderTreeWithWatches(spec: spec, registry: registry, store: state, dispatcher: dispatcher).watches,
            dispatcher: dispatcher,
            store: state
        )
        XCTAssertEqual(calls.value, 1)
    }

    func testWatchParamsResolveComputedFunctions() async throws {
        var registry = Fixtures.recordingRegistry()
        registry.functions["shout"] = { arguments in
            .string((arguments["text"]?.stringValue ?? "").uppercased())
        }
        let received = Box<[String: JSONValue]>([:])
        let spec = makeWatchSpec(
            watch: #""/value":{"action":"record","params":{"label":{"$computed":"shout","args":{"text":{"$state":"/value"}}}}}"#
        )
        let state = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("record") { params in received.value = params }

        let tracker = WatchTracker(functions: registry.functions, directives: registry.directives)
        let records = buildRenderTreeWithWatches(
            spec: spec,
            registry: registry,
            store: state,
            dispatcher: dispatcher
        ).watches
        tracker.snapshot(records)

        state.set("/value", .string("hi"))
        await tracker.process(
            buildRenderTreeWithWatches(
                spec: spec,
                registry: registry,
                store: state,
                dispatcher: dispatcher
            ).watches,
            dispatcher: dispatcher,
            store: state
        )

        XCTAssertEqual(received.value["label"], .string("HI"))
    }

    func testSpecKnowsWhetherItWatchesState() {
        XCTAssertTrue(makeWatchSpec(watch: #""/value":{"action":"record"}"#).hasWatches)
        XCTAssertFalse(
            Spec.decodePartial(
                JSONValue.decode(#"{"root":"t","elements":{"t":{"type":"Text","props":{}}}}"#)!
            ).hasWatches
        )
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

/// A one-shot gate: a test handler waits until the test opens it.
actor AsyncGate {
    private var waiters: [CheckedContinuation<Void, Never>] = []
    private var isOpen = false

    func wait() async {
        if isOpen { return }
        await withCheckedContinuation { continuation in
            waiters.append(continuation)
        }
    }

    func open() {
        isOpen = true
        for waiter in waiters { waiter.resume() }
        waiters.removeAll()
    }
}
