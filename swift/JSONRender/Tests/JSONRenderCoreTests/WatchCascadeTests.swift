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
