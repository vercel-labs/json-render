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
}
