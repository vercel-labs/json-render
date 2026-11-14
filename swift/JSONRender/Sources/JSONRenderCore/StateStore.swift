import Foundation

/// In-memory state model with path-based reads and writes, mirroring core's
/// `createStateStore`. Writes replace only the containers along the path, so
/// unchanged branches keep their identity.
public final class StateStore: @unchecked Sendable {
    private let lock = NSLock()
    private var state: JSONValue
    private var listeners: [UUID: () -> Void] = [:]
    private var changeCount = 0

    public init(_ initialState: JSONValue = .object([:])) {
        self.state = initialState
    }

    public convenience init(_ initialState: [String: JSONValue]) {
        self.init(.object(initialState))
    }

    /// The current state model.
    public var snapshot: JSONValue {
        lock.lock()
        defer { lock.unlock() }
        return state
    }

    /// The current state model as an object.
    public var objectSnapshot: [String: JSONValue] {
        snapshot.objectValue ?? [:]
    }

    /// Counts the writes that changed the state. A watch pass uses this to tell
    /// whether the change that triggered it came from its own actions.
    public var version: Int {
        lock.lock()
        defer { lock.unlock() }
        return changeCount
    }

    /// Reads a value by JSON Pointer path.
    public func get(_ path: String) -> JSONValue? {
        getByPath(snapshot, path)
    }

    /// Writes a value by JSON Pointer path and notifies listeners when the
    /// value changes. Containers are always treated as changed, matching the
    /// reference comparison core uses.
    public func set(_ path: String, _ value: JSONValue) {
        lock.lock()
        let previous = getByPath(state, path)
        if strictEquals(previous, value) {
            lock.unlock()
            return
        }
        state = setByPath(state, path, value)
        changeCount &+= 1
        let callbacks = Array(listeners.values)
        lock.unlock()
        for callback in callbacks { callback() }
    }

    /// Writes a value derived from the current one at `path` as one step.
    ///
    /// The read and the write happen under the same lock, so two writers
    /// cannot overwrite each other's change the way a separate `get` and `set`
    /// can. `transform` receives the current value, or nil when the path holds
    /// nothing, and returns the value to store; nil leaves the state as it is.
    /// It runs while the store is locked, so it must not call back into the
    /// store.
    func modify(_ path: String, _ transform: (JSONValue?) -> JSONValue?) {
        lock.lock()
        let previous = getByPath(state, path)
        guard let next = transform(previous), !strictEquals(previous, next) else {
            lock.unlock()
            return
        }
        state = setByPath(state, path, next)
        changeCount &+= 1
        let callbacks = Array(listeners.values)
        lock.unlock()
        for callback in callbacks { callback() }
    }

    /// Writes several paths and notifies listeners once if any value changed.
    public func update(_ updates: [String: JSONValue]) {
        lock.lock()
        var next = state
        var changed = false
        for (path, value) in updates {
            if strictEquals(getByPath(next, path), value) { continue }
            next = setByPath(next, path, value)
            changed = true
        }
        guard changed else {
            lock.unlock()
            return
        }
        state = next
        changeCount &+= 1
        let callbacks = Array(listeners.values)
        lock.unlock()
        for callback in callbacks { callback() }
    }

    /// Replaces the whole state model, for example when a host swaps specs.
    public func replace(_ next: JSONValue) {
        lock.lock()
        state = next
        changeCount &+= 1
        let callbacks = Array(listeners.values)
        lock.unlock()
        for callback in callbacks { callback() }
    }

    /// Adds a change listener. The returned subscription removes it.
    @discardableResult
    public func subscribe(_ listener: @escaping () -> Void) -> StateSubscription {
        let id = UUID()
        lock.lock()
        listeners[id] = listener
        lock.unlock()
        return StateSubscription { [weak self] in
            guard let self else { return }
            self.lock.lock()
            self.listeners.removeValue(forKey: id)
            self.lock.unlock()
        }
    }

    /// Creates a store seeded from a spec's initial state.
    public convenience init(spec: Spec) {
        self.init(spec.state.map { JSONValue.object($0) } ?? .object([:]))
    }
}

/// Cancels a state store subscription.
public final class StateSubscription {
    private var cancelHandler: (() -> Void)?

    init(_ cancel: @escaping () -> Void) {
        self.cancelHandler = cancel
    }

    public func cancel() {
        cancelHandler?()
        cancelHandler = nil
    }

    deinit {
        cancel()
    }
}
