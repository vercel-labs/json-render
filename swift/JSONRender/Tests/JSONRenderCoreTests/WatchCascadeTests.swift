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
}
