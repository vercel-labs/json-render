import XCTest
@testable import JSONRenderCore

/// Thread-safe box for values written from action handlers.
final class Box<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var storage: Value

    init(_ value: Value) {
        self.storage = value
    }

    var value: Value {
        get {
            lock.lock()
            defer { lock.unlock() }
            return storage
        }
        set {
            lock.lock()
            storage = newValue
            lock.unlock()
        }
    }
}

final class ActionTests: XCTestCase {
    private func makeDispatcher(
        handlers: [String: ActionHandler] = [:],
        navigate: ((String) -> Void)? = nil,
        state: [String: JSONValue] = [:]
    ) -> (ActionDispatcher, StateStore) {
        let store = StateStore(state)
        return (ActionDispatcher(store: store, handlers: handlers, navigate: navigate), store)
    }

    func testSetState() async {
        let (dispatcher, store) = makeDispatcher()
        let binding = ActionBinding(
            action: "setState",
            params: [
                "statePath": .value(.string("/count")),
                "value": .value(.number(3)),
            ]
        )
        await dispatcher.dispatch(binding)
        XCTAssertEqual(store.get("/count"), .number(3))
    }

    func testPushStateResolvesNestedStateAndClearsInput() async {
        let (dispatcher, store) = makeDispatcher(state: [
            "draft": .string("Buy milk"),
            "todos": .array([]),
        ])
        let binding = ActionBinding(
            action: "pushState",
            params: [
                "statePath": .value(.string("/todos")),
                "value": .value(.object(["title": .object(["$state": "/draft"])])),
                "clearStatePath": .value(.string("/draft")),
            ]
        )
        await dispatcher.dispatch(binding)
        XCTAssertEqual(store.get("/todos"), .array([.object(["title": .string("Buy milk")])]))
        XCTAssertEqual(store.get("/draft"), .string(""))
    }

    func testRemoveState() async {
        let (dispatcher, store) = makeDispatcher(state: [
            "todos": .array([.string("a"), .string("b"), .string("c")]),
        ])
        await dispatcher.dispatch(
            ActionBinding(
                action: "removeState",
                params: [
                    "statePath": .value(.string("/todos")),
                    "index": .value(.number(1)),
                ]
            )
        )
        XCTAssertEqual(store.get("/todos"), .array([.string("a"), .string("c")]))
    }

    func testHandlerReceivesResolvedParams() async {
        let received = Box<[String: JSONValue]?>(nil)
        let (dispatcher, _) = makeDispatcher(
            handlers: [
                "save": { params in received.value = params },
            ],
            state: ["name": .string("Ada")]
        )
        await dispatcher.dispatch(
            ActionBinding(
                action: "save",
                params: [
                    "label": .state("/name"),
                    "count": .value(.number(2)),
                ]
            )
        )
        XCTAssertEqual(received.value?["label"], .string("Ada"))
        XCTAssertEqual(received.value?["count"], .number(2))
    }

    func testPreResolvedParamsTakePrecedence() async {
        let received = Box<[String: JSONValue]?>(nil)
        let (dispatcher, store) = makeDispatcher(
            handlers: ["save": { params in received.value = params }],
            state: ["name": .string("Ada")]
        )
        await dispatcher.dispatch(
            ActionBinding(action: "save", params: ["label": .state("/name")]),
            resolvedParams: ["label": .string("Override")]
        )
        XCTAssertEqual(received.value?["label"], .string("Override"))
        XCTAssertEqual(store.get("/name"), .string("Ada"))
    }

    func testSuccessSetAndNavigate() async {
        let navigated = Box<String?>(nil)
        let (dispatcher, store) = makeDispatcher(
            handlers: ["save": { _ in }],
            navigate: { navigated.value = $0 }
        )
        // Deliver inline: the default hops to the main thread, which no run
        // loop pumps while an async test waits.
        dispatcher.deliverToHost = { $0() }

        await dispatcher.dispatch(
            ActionBinding(
                action: "save",
                onSuccess: .set(["/saved": .bool(true)])
            )
        )
        XCTAssertEqual(store.get("/saved"), .bool(true))

        await dispatcher.dispatch(
            ActionBinding(
                action: "save",
                onSuccess: .navigate("/done")
            )
        )
        XCTAssertEqual(navigated.value, "/done")
    }

    func testDecodesActionCallbacks() async throws {
        let spec = try XCTUnwrap(
            Spec.decodePartial(
                #"{"root":"b","elements":{"b":{"type":"Button","props":{},"on":{"press":{"action":"save","onSuccess":{"action":"track","params":{"event":"saved"}},"onError":{"action":"report"}}}}}}"#
            )
        )
        let element = try XCTUnwrap(spec.elements["b"], "Element with action callbacks decodes")
        let binding = try XCTUnwrap(element.on?["press"]?.bindings.first)
        XCTAssertEqual(
            binding.onSuccess,
            .action(ActionOnSuccessAction(action: "track", params: ["event": .value(.string("saved"))]))
        )
        XCTAssertEqual(binding.onError, .action(ActionOnErrorAction(action: "report")))

        let encoded = try JSONEncoder().encode(binding)
        XCTAssertEqual(try JSONDecoder().decode(ActionBinding.self, from: encoded), binding)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        let onSuccess = try XCTUnwrap(object["onSuccess"] as? [String: Any])
        XCTAssertEqual(onSuccess["action"] as? String, "track")

        let tracked = Box<[String: JSONValue]?>(nil)
        let (dispatcher, _) = makeDispatcher(
            handlers: [
                "save": { _ in },
                "track": { params in tracked.value = params },
            ]
        )
        await dispatcher.dispatch(binding)
        XCTAssertEqual(tracked.value, ["event": .string("saved")])
    }

    func testErrorHandlerWritesMessage() async {
        struct Failure: LocalizedError {
            var errorDescription: String? { "Network down" }
        }

        let (dispatcher, store) = makeDispatcher(
            handlers: ["save": { _ in throw Failure() }]
        )
        await dispatcher.dispatch(
            ActionBinding(
                action: "save",
                onError: .set(["/error": .string("$error.message")])
            )
        )
        XCTAssertEqual(store.get("/error"), .string("Network down"))
    }

    func testUnknownActionWarns() async {
        let recorder = WarningRecorder()
        let (dispatcher, _) = makeDispatcher()
        await dispatcher.dispatch(ActionBinding(action: "doesNotExist"))
        XCTAssertTrue(recorder.messages.contains { $0.contains("Unknown action") })
    }

    func testConfirmCanCancel() async {
        let received = Box<Bool>(false)
        let (dispatcher, _) = makeDispatcher(handlers: ["save": { _ in received.value = true }])
        dispatcher.requestConfirmation = { _ in false }

        await dispatcher.dispatch(
            ActionBinding(
                action: "save",
                confirm: ActionConfirm(title: "Save?", message: "Are you sure?")
            )
        )
        XCTAssertFalse(received.value)
    }

    func testNavigateIsDeliveredToTheHost() async {
        let navigated = Box<[String]>([])
        let (dispatcher, _) = makeDispatcher(
            handlers: ["save": { _ in }],
            navigate: { path in navigated.value.append(path) }
        )
        let deliveries = Box<Int>(0)
        dispatcher.deliverToHost = { work in
            deliveries.value += 1
            work()
        }

        await dispatcher.dispatch(
            ActionBinding(action: "save", onSuccess: .navigate("/done"))
        )

        XCTAssertEqual(deliveries.value, 1, "Navigate goes through host delivery")
        XCTAssertEqual(navigated.value, ["/done"])
    }

    func testRunOnMainThreadRunsInlineOnTheMainThread() {
        // XCTest runs synchronous tests on the main thread; the fast path must
        // not defer the work, so a main-thread host sees navigate immediately.
        XCTAssertTrue(Thread.isMainThread)
        let ran = Box<Bool>(false)
        runOnMainThread { ran.value = true }
        XCTAssertTrue(ran.value)
    }

    func testPushStateExpandsTheIDToken() async throws {
        let (dispatcher, store) = makeDispatcher(state: ["todos": .array([])])

        for _ in 0..<2 {
            await dispatcher.dispatch(
                ActionBinding(
                    action: "pushState",
                    params: [
                        "statePath": .value(.string("/todos")),
                        "value": .value(
                            .object([
                                "id": .string("$id"),
                                "title": .string("Write tests"),
                                "done": .bool(false),
                            ])
                        ),
                    ]
                )
            )
        }

        let todos = try XCTUnwrap(store.get("/todos")?.arrayValue)
        XCTAssertEqual(todos.count, 2)
        let ids = todos.compactMap { $0["id"]?.stringValue }
        XCTAssertEqual(ids.count, 2)
        for id in ids {
            XCTAssertNotEqual(id, "$id")
            XCTAssertNotNil(
                id.range(of: #"^\d+-\d+$"#, options: .regularExpression),
                "Expected a generated id, got \"\(id)\""
            )
        }
        XCTAssertNotEqual(ids[0], ids[1], "Each push gets a new id")
        XCTAssertEqual(todos[0]["title"], .string("Write tests"))
    }

    func testPushStateExpandsTheObjectIDToken() async throws {
        let (dispatcher, store) = makeDispatcher(state: ["todos": .array([])])

        await dispatcher.dispatch(
            ActionBinding(
                action: "pushState",
                params: [
                    "statePath": .value(.string("/todos")),
                    "value": .value(.object(["id": .object(["$id": .bool(true)])])),
                ]
            )
        )

        let todos = try XCTUnwrap(store.get("/todos")?.arrayValue)
        let id = try XCTUnwrap(todos.first?["id"]?.stringValue)
        XCTAssertNotEqual(id, "$id")
        XCTAssertNil(todos.first?["id"]?.objectValue)
    }

    func testOversizedStateWriteIsDropped() async throws {
        let recorder = WarningRecorder()
        let (dispatcher, store) = makeDispatcher(state: ["value": .string("keep")])
        dispatcher.maxStateWriteBytes = 32

        await dispatcher.dispatch(
            ActionBinding(
                action: "setState",
                params: [
                    "statePath": .value(.string("/value")),
                    "value": .value(.string(String(repeating: "x", count: 64))),
                ]
            )
        )

        XCTAssertEqual(store.get("/value"), .string("keep"), "The oversized write is dropped")
        XCTAssertTrue(recorder.messages.contains { $0.contains("state write limit") })
    }

    func testPushStateExpandsTheIDTokenInsideANestedValue() async throws {
        let (dispatcher, store) = makeDispatcher(state: ["todos": .array([])])

        await dispatcher.dispatch(
            ActionBinding(
                action: "pushState",
                params: [
                    "statePath": .value(.string("/todos")),
                    "value": .value(.object(["todo": .object(["id": .string("$id")])])),
                ]
            )
        )

        let todos = try XCTUnwrap(store.get("/todos")?.arrayValue)
        let id = try XCTUnwrap(todos.first?["todo"]?["id"]?.stringValue)
        XCTAssertNotEqual(id, "$id")
    }

    func testResolveActionInterpolatesConfirmation() {
        let resolved = resolveAction(
            ActionBinding(
                action: "delete",
                params: ["path": .state("/file")],
                confirm: ActionConfirm(title: "Delete ${/file}", message: "Remove ${/file}?")
            ),
            stateModel: .object(["file": .string("notes.txt")])
        )
        XCTAssertEqual(resolved.params["path"], .string("notes.txt"))
        XCTAssertEqual(resolved.confirm?.title, "Delete notes.txt")
        XCTAssertEqual(resolved.confirm?.message, "Remove notes.txt?")
    }

    func testInterpolateStateLeavesAnEmptyReference() {
        let state = JSONValue.object(["file": .string("notes.txt")])

        XCTAssertEqual(interpolateState("${}", stateModel: state), "${}")
        XCTAssertEqual(interpolateState("a ${} b", stateModel: state), "a ${} b")
        XCTAssertEqual(interpolateState("Delete ${/file}?", stateModel: state), "Delete notes.txt?")
    }
}
