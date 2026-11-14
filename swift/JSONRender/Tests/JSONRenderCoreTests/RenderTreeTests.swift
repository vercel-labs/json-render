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

    func testResolvedPropsStayWithinTheBuildBudget() throws {
        // A binary tree of elements whose leaves each expand the same state
        // value into a large prop stays under the depth, node, and work
        // limits, but without a shared prop budget it would hold hundreds of
        // megabytes of strings.
        let source = String(repeating: "x", count: 1_024)
        let template = String(repeating: "${/source}", count: 900)
        let levels = 8
        var elements: [String: JSONValue] = [:]
        for level in 0..<levels {
            let children: [JSONValue] = level + 1 < levels
                ? [.string("level\(level + 1)"), .string("level\(level + 1)")]
                : [.string("leaf"), .string("leaf")]
            elements["level\(level)"] = .object([
                "type": .string("Column"),
                "props": .object([:]),
                "children": .array(children),
            ])
        }
        elements["leaf"] = .object([
            "type": .string("Text"),
            "props": .object([
                "text": .object(["$template": .string(template)]),
            ]),
        ])
        let json = JSONValue.object([
            "root": .string("level0"),
            "elements": .object(elements),
            "state": .object(["source": .string(source)]),
        ])
        let spec = Spec.decodePartial(json)
        let state = StateStore(spec: spec)
        let limits = RenderTreeLimits(
            maxDepth: 100,
            maxRenderedNodes: 10_000,
            maxWork: 50_000,
            maxResolvedPropBytes: 8_000_000
        )

        let recorder = WarningRecorder()
        let before = residentMemoryBytes()
        let tree = buildRenderTree(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: state,
            limits: limits
        )
        let after = residentMemoryBytes()

        let rendered = tree != nil
        XCTAssertFalse(rendered, "The build stops when its prop budget is spent")
        XCTAssertTrue(
            recorder.messages.contains { $0.contains("resolved prop size limit") },
            "Stopping at the prop budget warns"
        )
        #if os(Linux)
        XCTAssertLessThan(
            after - before,
            32 * 1024 * 1024,
            "Props do not accumulate past the shared budget"
        )
        #endif
    }

    func testRepeatedLiteralPropsStayWithinTheBuildBudget() throws {
        // Resolving props builds new containers, so an element with a large
        // literal array costs that array once per visit. Listing the same
        // element thousands of times stays under the depth, node, and work
        // limits, but without a budget on those containers it would hold the
        // array once per visit.
        let data = JSONValue.array((0..<5_000).map { .number(Double($0)) })
        let spec = Spec.decodePartial(
            JSONValue.object([
                "root": .string("root"),
                "elements": .object([
                    "root": .object([
                        "type": .string("Column"),
                        "props": .object([:]),
                        "children": .array((0..<500).map { _ in .string("row") }),
                    ]),
                    "row": .object([
                        "type": .string("Text"),
                        "props": .object(["data": data]),
                    ]),
                ]),
            ])
        )
        let state = StateStore(spec: spec)
        let recorder = WarningRecorder()
        let limits = RenderTreeLimits(maxResolvedPropBytes: 1_000_000)

        let before = residentMemoryBytes()
        let tree = buildRenderTree(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: state,
            limits: limits
        )
        let after = residentMemoryBytes()

        let rendered = tree != nil
        XCTAssertFalse(rendered, "The build stops when its prop budget is spent")
        XCTAssertTrue(
            recorder.messages.contains { $0.contains("resolved prop size limit") },
            "Stopping at the prop budget warns"
        )
        #if os(Linux)
        XCTAssertLessThan(
            after - before,
            16 * 1024 * 1024,
            "Repeated literal props do not accumulate past the shared budget"
        )
        #endif
    }

    func testLargeLiteralPropsRenderBelowTheBudget() throws {
        // One element with a large literal array is an ordinary spec, so the
        // default budget leaves it alone.
        let data = JSONValue.array((0..<20_000).map { .number(Double($0)) })
        let spec = Spec.decodePartial(
            JSONValue.object([
                "root": .string("root"),
                "elements": .object([
                    "root": .object([
                        "type": .string("Text"),
                        "props": .object(["data": data]),
                    ]),
                ]),
            ])
        )
        let state = StateStore(spec: spec)

        let tree = buildRenderTree(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: state
        )

        XCTAssertEqual(tree?.props["data"], data)
    }

    func testWatchThatRemountsStartsFromItsCurrentValue() async throws {
        // A row's watch goes away when the row does. When it mounts again it
        // starts over, the way React discards an unmounted element's effect
        // state, so the value it missed in between does not fire.
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"list","state":{"items":[{"id":"a"}],"value":"x"},"elements":{"list":{"type":"List","props":{},"repeat":{"statePath":"/items","key":"id"},"children":["row"]},"row":{"type":"Text","props":{},"watch":{"/value":{"action":"record"}}}}}"#
            )!
        )
        let state = StateStore(spec: spec)
        let calls = Box<Int>(0)
        let dispatcher = ActionDispatcher(store: state)
        dispatcher.register("record") { _ in calls.value += 1 }

        func records() -> [WatchRecord] {
            buildRenderTreeWithWatches(
                spec: spec,
                registry: Fixtures.recordingRegistry(),
                store: state,
                dispatcher: dispatcher
            ).watches
        }

        let tracker = WatchTracker()
        tracker.snapshot(records())
        XCTAssertEqual(records().count, 1)

        // The row goes away, the value changes, and the row comes back.
        state.set("/items", .array([]))
        await tracker.process(records(), dispatcher: dispatcher, store: state)
        state.set("/value", .string("y"))
        await tracker.process(records(), dispatcher: dispatcher, store: state)
        state.set("/items", .array([.object(["id": .string("a")])]))
        await tracker.process(records(), dispatcher: dispatcher, store: state)

        XCTAssertEqual(calls.value, 0, "A remounted watch does not fire for a value it missed")
    }

    func testPressParamsShareOneTemplateBudget() async throws {
        // A press carrying many template params would otherwise expand each of
        // them to its own limit before any state write check runs.
        let source = String(repeating: "x", count: 1_024 * 1_024)
        var params: [String: JSONValue] = [
            "statePath": .string("/out"),
            "value": .object(["$template": .string("${/source}")]),
        ]
        for index in 0..<100 {
            params["p\(index)"] = .object(["$template": .string("${/source}")])
        }
        let elements: [String: JSONValue] = [
            "b": .object([
                "type": .string("Button"),
                "props": .object([:]),
                "on": .object([
                    "press": .object([
                        "action": .string("setState"),
                        "params": .object(params),
                    ]),
                ]),
            ]),
        ]
        let spec = Spec.decodePartial(
            JSONValue.object([
                "root": .string("b"),
                "elements": .object(elements),
                "state": .object(["source": .string(source)]),
            ])
        )
        let store = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: store)
        var captured: ComponentRenderContext<String>?
        var registry = Fixtures.recordingRegistry()
        registry.components["Button"] = ComponentDefinition { context in
            captured = context
            return "Button"
        }
        _ = buildRenderTree(
            spec: spec,
            registry: registry,
            store: store,
            dispatcher: dispatcher
        )
        let context = try XCTUnwrap(captured)

        let before = residentMemoryBytes()
        await context.emit("press")
        let after = residentMemoryBytes()

        let wrote = store.get("/out") != nil
        XCTAssertFalse(wrote, "The action is dropped instead of using partial params")
        #if os(Linux)
        XCTAssertLessThan(
            after - before,
            32 * 1024 * 1024,
            "The params share one budget"
        )
        #endif
    }

    func testWatchParamsShareOneTemplateBudget() async throws {
        let source = String(repeating: "x", count: 1_024 * 1_024)
        var params: [String: JSONValue] = [:]
        for index in 0..<100 {
            params["p\(index)"] = .object(["$template": .string("${/source}")])
        }
        let elements: [String: JSONValue] = [
            "t": .object([
                "type": .string("Text"),
                "props": .object([:]),
                "watch": .object([
                    "/trigger": .object([
                        "action": .string("capture"),
                        "params": .object(params),
                    ]),
                ]),
            ]),
        ]
        let spec = Spec.decodePartial(
            JSONValue.object([
                "root": .string("t"),
                "elements": .object(elements),
                "state": .object(["trigger": .number(0), "source": .string(source)]),
            ])
        )
        let store = StateStore(spec: spec)
        let calls = Box<Int>(0)
        let dispatcher = ActionDispatcher(store: store)
        dispatcher.register("capture") { _ in calls.value += 1 }

        func records() -> [WatchRecord] {
            buildRenderTreeWithWatches(
                spec: spec,
                registry: Fixtures.recordingRegistry(),
                store: store,
                dispatcher: dispatcher
            ).watches
        }

        let tracker = WatchTracker()
        tracker.snapshot(records())
        store.set("/trigger", .number(1))

        let before = residentMemoryBytes()
        await tracker.process(records(), dispatcher: dispatcher, store: store)
        let after = residentMemoryBytes()

        XCTAssertEqual(calls.value, 0, "The action is dropped instead of using partial params")
        #if os(Linux)
        XCTAssertLessThan(after - before, 32 * 1024 * 1024)
        #endif
    }

    func testLongWatchIDsStayWithinTheBuildBudget() throws {
        // A watch id copies the watch path. A hidden element with a long path
        // listed many times as a child would hold that text once per visit.
        let watchPath = "/" + String(repeating: "w", count: 100_000)
        var elements: [String: JSONValue] = [
            "root": .object([
                "type": .string("Column"),
                "props": .object([:]),
                "children": .array((0..<500).map { _ in .string("hidden") }),
            ]),
            "hidden": .object([
                "type": .string("Text"),
                "props": .object([:]),
                "visible": .bool(false),
                "watch": .object([
                    watchPath: .object(["action": .string("record")]),
                ]),
            ]),
        ]
        let spec = Spec.decodePartial(
            JSONValue.object([
                "root": .string("root"),
                "elements": .object(elements),
            ])
        )
        let state = StateStore(spec: spec)
        let recorder = WarningRecorder()

        let before = residentMemoryBytes()
        let build = buildRenderTreeWithWatches(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: state
        )
        let after = residentMemoryBytes()

        let rendered = build.tree != nil
        XCTAssertFalse(rendered, "The build stops when its watch id budget is spent")
        XCTAssertTrue(
            recorder.messages.contains { $0.contains("watch id size limit") },
            "Stopping at the watch id budget warns"
        )
        #if os(Linux)
        XCTAssertLessThan(after - before, 32 * 1024 * 1024)
        #endif
    }

    func testSharedStateValuesDoNotCountAgainstThePropBudget() throws {
        // A `$state` prop shares the state value instead of copying it, so
        // binding the same large value into several elements allocates
        // nothing and must not count against the template budget.
        let data = JSONValue.string(String(repeating: "x", count: 1_000_000))
        var elements: [String: JSONValue] = [
            "root": .object([
                "type": .string("Column"),
                "props": .object([:]),
                "children": .array((0..<40).map { .string("c\($0)") }),
            ]),
        ]
        for index in 0..<40 {
            elements["c\(index)"] = .object([
                "type": .string("Text"),
                "props": .object([
                    "data": .object(["$state": .string("/data")]),
                ]),
            ])
        }
        let spec = Spec.decodePartial(
            JSONValue.object([
                "root": .string("root"),
                "elements": .object(elements),
                "state": .object(["data": data]),
            ])
        )
        let state = StateStore(spec: spec)

        let tree = buildRenderTree(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: state
        )

        let rendered = tree != nil
        XCTAssertTrue(rendered, "A shared state prop does not spend the prop budget")
    }

    func testStreamedSpecUpdatesReleaseRemovedWatchBaselines() {
        // A stream can replace the watched element with a fresh key in every
        // update. A baseline kept for each generation would hold that
        // generation's watched value.
        let tracker = WatchTracker()
        tracker.snapshot([watchRecord(id: "e0#/value", value: .string("v0"))])
        let before = peakResidentBytes()
        for index in 1...100 {
            let value = JSONValue.array(
                (0..<50_000).map { .number(Double($0 + index)) }
            )
            tracker.addBaselines([watchRecord(id: "e\(index)#/value", value: value)])
        }
        let after = peakResidentBytes()

        XCTAssertEqual(
            tracker.trackedWatchCount,
            1,
            "Only the mounted watch keeps a baseline"
        )
        #if os(Linux)
        XCTAssertLessThan(
            after - before,
            32 * 1024 * 1024,
            "Baselines for removed generations are released"
        )
        #endif
    }

    func testRemovedWatchDoesNotRunAQueuedAction() async throws {
        // A value queued while an action was still running must not run after
        // the element unmounts.
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
        var spins = 0
        while calls.value == 0 && spins < 100_000 {
            await Task.yield()
            spins += 1
        }
        XCTAssertEqual(calls.value, 1)

        // The value changes again while the action waits, then the element
        // goes away before the queued run starts.
        state.set("/value", .string("c"))
        await tracker.process(records(spec, state), dispatcher: dispatcher, store: state)
        tracker.addBaselines([])
        XCTAssertEqual(tracker.trackedWatchCount, 0)

        await gate.open()
        await running.value
        XCTAssertEqual(calls.value, 1, "The queued run does not start after the watch went away")
    }

    func testManySharedStatePropsRender() throws {
        // Ten thousand references to one state value share that value, so
        // props resolution must not walk or count it per reference.
        let data = JSONValue.array((0..<20_000).map { .number(Double($0)) })
        var props: [String: JSONValue] = [:]
        for index in 0..<10_000 {
            props["p\(index)"] = .object(["$state": .string("/data")])
        }
        let json = JSONValue.object([
            "root": .string("t"),
            "elements": .object([
                "t": .object([
                    "type": .string("Text"),
                    "props": .object(props),
                ]),
            ]),
            "state": .object(["data": data]),
        ])
        let spec = Spec.decodePartial(json)
        let state = StateStore(spec: spec)

        let start = Date()
        let tree = buildRenderTree(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: state
        )
        let elapsed = Date().timeIntervalSince(start)

        let rendered = tree != nil
        XCTAssertTrue(rendered, "Shared props do not stop the build")
        XCTAssertLessThan(elapsed, 5, "Shared props are not walked per reference")
    }

    private func watchRecord(id: String, value: JSONValue) -> WatchRecord {
        WatchRecord(id: id, path: "/value", value: value, bindings: [], scope: nil)
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
