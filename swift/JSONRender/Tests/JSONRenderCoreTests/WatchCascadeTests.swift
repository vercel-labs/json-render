import XCTest
@testable import JSONRenderCore

/// A watch that appends to the array it watches changes that array again. The
/// renderer runs a watch pass for every state change, so without a budget a
/// streamed change starts a chain that never stops.
final class WatchCascadeTests: XCTestCase {
    private func selfAppendingSpec() -> Spec {
        Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"t","state":{"items":[]},"elements":{"t":{"type":"Text","props":{},"watch":{"/items":{"action":"pushState","params":{"statePath":"/items","value":"x"}}}}}}"#
            )!
        )
    }

    private func watches(
        _ spec: Spec,
        _ store: StateStore,
        _ dispatcher: ActionDispatcher
    ) -> [WatchRecord] {
        buildRenderTreeWithWatches(
            spec: spec,
            registry: Fixtures.recordingRegistry(),
            store: store,
            dispatcher: dispatcher
        ).watches
    }

    func testSelfAppendingWatchStops() async throws {
        let recorder = WarningRecorder()
        let spec = selfAppendingSpec()
        let store = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: store)
        let tracker = WatchTracker()
        tracker.snapshot(watches(spec, store, dispatcher))

        // A streamed spec update or another external write starts the chain.
        store.set("/items", .array([.string("seed")]))

        // The renderer schedules one pass per state change. Bound the loop so a
        // regression fails instead of hanging the suite.
        for _ in 0..<300 {
            await tracker.process(
                watches(spec, store, dispatcher),
                dispatcher: dispatcher,
                store: store
            )
        }

        let count = store.get("/items")?.arrayValue?.count ?? 0
        XCTAssertGreaterThan(count, 1, "The watch ran and appended while it had budget")
        XCTAssertLessThan(count, 100, "The cascade stops after the shared watch budget")
        XCTAssertTrue(
            recorder.messages.contains { $0.contains("Stopped watch actions") },
            "Stopping the cascade warns instead of failing silently"
        )
    }

    func testSelfDoublingTemplateStopsAtTheOutputLimit() async throws {
        // A watch whose setState value repeats the path it watches doubles that
        // value on every pass. Without a limit the template reaches a gigabyte
        // in about thirty passes, well inside the cascade budget.
        let recorder = WarningRecorder()
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"t","state":{},"elements":{"t":{"type":"Text","props":{},"watch":{"/x":{"action":"setState","params":{"statePath":"/x","value":{"$template":"${/x}${/x}"}}}}}}}"#
            )!
        )
        let store = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: store)
        let tracker = WatchTracker()
        tracker.snapshot(watches(spec, store, dispatcher))

        // The stream fills `/x` in, which starts the chain.
        store.set("/x", .string("x"))
        for _ in 0..<22 {
            await tracker.process(
                watches(spec, store, dispatcher),
                dispatcher: dispatcher,
                store: store
            )
        }

        let text = try XCTUnwrap(store.get("/x")?.stringValue)
        XCTAssertLessThanOrEqual(
            text.count,
            defaultTemplateOutputLimit,
            "The template output stops at the limit instead of doubling without bound"
        )
        XCTAssertGreaterThan(text.count, defaultTemplateOutputLimit / 2, "The chain ran")
        XCTAssertTrue(
            recorder.messages.contains { $0.contains("Template output stopped") },
            "Cutting a template short warns"
        )
    }

    func testWatchesWritingEachOtherStayOnOneBudget() async throws {
        // Two records, each writing the array the other watches: neither write
        // is the chain's own trigger, so a budget that refilled per record
        // would let them feed each other forever.
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"""
                {"root":"col","state":{"a":[],"b":[]},"elements":{
                  "col":{"type":"Column","props":{},"children":["ta","tb"]},
                  "ta":{"type":"Text","props":{},"watch":{"/a":{"action":"pushState","params":{"statePath":"/b","value":"x"}}}},
                  "tb":{"type":"Text","props":{},"watch":{"/b":{"action":"pushState","params":{"statePath":"/a","value":"x"}}}}
                }}
                """#
            )!
        )
        var registry = Fixtures.recordingRegistry()
        registry.components["Column"] = ComponentDefinition { _ in "Column" }
        let store = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: store)
        let tracker = WatchTracker()

        func watches() -> [WatchRecord] {
            buildRenderTreeWithWatches(
                spec: spec,
                registry: registry,
                store: store,
                dispatcher: dispatcher
            ).watches
        }

        tracker.snapshot(watches())
        store.set("/a", .array([.string("seed")]))

        for _ in 0..<300 {
            await tracker.process(watches(), dispatcher: dispatcher, store: store)
        }

        let total = (store.get("/a")?.arrayValue?.count ?? 0)
            + (store.get("/b")?.arrayValue?.count ?? 0)
        XCTAssertGreaterThan(total, 2, "The watches ran")
        XCTAssertLessThan(total, 100, "One chain's budget stops both watches")
    }

    func testWatchPushingToItsOwnListStaysWithinTheStateWriteLimit() async throws {
        // Each push is small enough on its own, so a per-value check alone
        // lets the list grow without bound. The list after the push is what
        // the limit has to cover.
        let recorder = WarningRecorder()
        let item = String(repeating: "x", count: 1_000)
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"t","state":{"list":[]},"elements":{"t":{"type":"Text","props":{},"watch":{"/list":{"action":"pushState","params":{"statePath":"/list","value":"\#(item)"}}}}}}"#
            )!
        )
        let store = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: store)
        dispatcher.maxStateWriteBytes = 4_096
        let tracker = WatchTracker()
        tracker.snapshot(watches(spec, store, dispatcher))

        store.set("/list", .array([.string("seed")]))
        for _ in 0..<20 {
            await tracker.process(watches(spec, store, dispatcher), dispatcher: dispatcher, store: store)
        }

        let list = try XCTUnwrap(store.get("/list")?.arrayValue)
        let bytes = measureJSONValue(.array(list), maxDepth: 100)?.bytes ?? .max
        XCTAssertLessThanOrEqual(bytes, 4_096, "The list stops growing at the limit")
        XCTAssertTrue(
            recorder.messages.contains { $0.contains("state write limits") },
            "Dropping the push warns"
        )
    }

    func testWatchCopyingItsOwnArrayStopsAtTheNodeLimit() async throws {
        // A copy of the array holds only containers, so it adds almost no
        // bytes. Without a value count the byte limit never trips and the
        // array doubles until the app runs out of memory.
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"t","state":{"a":[]},"elements":{"t":{"type":"Text","props":{},"watch":{"/a":{"action":"pushState","params":{"statePath":"/a","value":{"$state":"/a"}}}}}}}"#
            )!
        )
        let store = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: store)
        dispatcher.maxStateWriteNodes = 2_000
        let tracker = WatchTracker()
        tracker.snapshot(watches(spec, store, dispatcher))

        store.set("/a", .array([.string("seed")]))
        for _ in 0..<16 {
            await tracker.process(watches(spec, store, dispatcher), dispatcher: dispatcher, store: store)
        }

        let value = try XCTUnwrap(store.get("/a"))
        let nodes = measureJSONValue(value, maxDepth: 1_000)?.nodes ?? .max
        XCTAssertLessThanOrEqual(nodes, 2_000, "The array stops doubling at the value limit")
    }

    func testCascadeBudgetCountsDispatchesAndRefillsOnExternalChange() async throws {
        let spec = selfAppendingSpec()
        let store = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: store)
        let tracker = WatchTracker(maxCascadeDispatches: 3)
        tracker.snapshot(watches(spec, store, dispatcher))

        store.set("/items", .array([.string("seed")]))
        for _ in 0..<20 {
            await tracker.process(
                watches(spec, store, dispatcher),
                dispatcher: dispatcher,
                store: store
            )
        }
        XCTAssertEqual(
            store.get("/items")?.arrayValue?.count,
            4,
            "The seed plus exactly three watch appends"
        )

        // A change the watch did not cause starts a new chain with a new budget.
        store.set("/items", .array([.string("again")]))
        for _ in 0..<20 {
            await tracker.process(
                watches(spec, store, dispatcher),
                dispatcher: dispatcher,
                store: store
            )
        }
        XCTAssertEqual(
            store.get("/items")?.arrayValue?.count,
            4,
            "An external change refills the budget for three more appends"
        )
    }

    func testPassArrivingDuringSuspendedActionDoesNotRefillBudget() async throws {
        let spec = Spec.decodePartial(
            JSONValue.decode(
                #"{"root":"t","state":{"items":[]},"elements":{"t":{"type":"Text","props":{},"watch":{"/items":{"action":"appendThenWait"}}}}}"#
            )!
        )
        let store = StateStore(spec: spec)
        let dispatcher = ActionDispatcher(store: store)
        let tracker = WatchTracker(maxCascadeDispatches: 1)
        let appends = TestCounter()

        dispatcher.register("appendThenWait") { _ in
            let count = appends.increment()
            var items = store.get("/items")?.arrayValue ?? []
            items.append(.string("item\(count)"))
            store.set("/items", .array(items))
            if count == 1 {
                // The renderer schedules the next pass from this write. Call it
                // here, so it starts while this pass is still awaiting the
                // action, as it would from the store listener.
                await tracker.process(
                    buildRenderTreeWithWatches(
                        spec: spec,
                        registry: Fixtures.recordingRegistry(),
                        store: store,
                        dispatcher: dispatcher
                    ).watches,
                    dispatcher: dispatcher,
                    store: store
                )
            }
        }

        tracker.snapshot(watches(spec, store, dispatcher))
        store.set("/items", .array([.string("seed")]))
        await tracker.process(
            watches(spec, store, dispatcher),
            dispatcher: dispatcher,
            store: store
        )

        XCTAssertEqual(
            appends.value,
            1,
            "A pass that arrives during a suspended action must not refill the budget"
        )
        XCTAssertEqual(
            store.get("/items")?.arrayValue?.count,
            2,
            "The seed plus the one append the budget allows"
        )
    }
}

/// Counts calls from concurrent action handlers.
private final class TestCounter: @unchecked Sendable {
    private let lock = NSLock()
    private var count = 0

    @discardableResult
    func increment() -> Int {
        lock.lock()
        defer { lock.unlock() }
        count += 1
        return count
    }

    var value: Int {
        lock.lock()
        defer { lock.unlock() }
        return count
    }
}
