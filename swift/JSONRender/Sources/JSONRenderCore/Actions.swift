import Foundation

/// Resolves dynamic values in an action binding against a state model.
///
/// The renderer resolves each parameter with `resolveActionParam` first, which
/// also handles repeat scope. This function resolves anything still left, such
/// as `{ "$state": "/path" }` written directly in a spec.
public func resolveAction(
    _ binding: ActionBinding,
    stateModel: JSONValue,
    resolvedParams: [String: JSONValue]? = nil
) -> ResolvedAction {
    var params: [String: JSONValue] = resolvedParams ?? [:]
    if resolvedParams == nil, let bindingParams = binding.params {
        for (key, value) in bindingParams {
            params[key] = resolveDynamicValue(value, stateModel: stateModel) ?? .null
        }
    }

    var confirm = binding.confirm
    if let existing = confirm {
        confirm = ActionConfirm(
            title: interpolateState(existing.title, stateModel: stateModel),
            message: interpolateState(existing.message, stateModel: stateModel),
            confirmLabel: existing.confirmLabel,
            cancelLabel: existing.cancelLabel,
            variant: existing.variant
        )
    }

    return ResolvedAction(
        action: binding.action,
        params: params,
        confirm: confirm,
        onSuccess: binding.onSuccess,
        onError: binding.onError
    )
}

/// Resolves `{ "$state": "/path" }` and arrays or objects containing it.
public func resolveDynamicValue(_ value: DynamicValue, stateModel: JSONValue) -> JSONValue? {
    switch value {
    case .value(let value):
        return deepResolveDynamicValue(value, stateModel: stateModel)
    case .state(let path):
        return getByPath(stateModel, path)
    }
}

/// Resolves every `$state` expression in a JSON value, leaving other values
/// alone. The `pushState` built-in uses this for the object it appends.
public func deepResolveDynamicValue(_ value: JSONValue, stateModel: JSONValue) -> JSONValue {
    switch value {
    case .object(let object):
        if let path = object["$state"]?.stringValue, object.count == 1 {
            return getByPath(stateModel, path) ?? .null
        }
        return .object(object.mapValues { deepResolveDynamicValue($0, stateModel: stateModel) })
    case .array(let values):
        return .array(values.map { deepResolveDynamicValue($0, stateModel: stateModel) })
    default:
        return value
    }
}

/// Interpolates `${path}` expressions in a title or message.
public func interpolateState(_ template: String, stateModel: JSONValue) -> String {
    var result = ""
    var remainder = Substring(template)
    while let start = remainder.range(of: "${") {
        result += remainder[..<start.lowerBound]
        let afterStart = remainder[start.upperBound...]
        guard let end = afterStart.firstIndex(of: "}") else {
            result += remainder[start.lowerBound...]
            return result
        }
        let path = String(afterStart[..<end])
        result += getByPath(stateModel, path)?.displayString ?? ""
        remainder = afterStart[afterStart.index(after: end)...]
    }
    result += remainder
    return result
}

/// An action binding with dynamic values resolved.
public struct ResolvedAction: Equatable, Sendable {
    public var action: String
    public var params: [String: JSONValue]
    public var confirm: ActionConfirm?
    public var onSuccess: ActionOnSuccess?
    public var onError: ActionOnError?

    public init(
        action: String,
        params: [String: JSONValue] = [:],
        confirm: ActionConfirm? = nil,
        onSuccess: ActionOnSuccess? = nil,
        onError: ActionOnError? = nil
    ) {
        self.action = action
        self.params = params
        self.confirm = confirm
        self.onSuccess = onSuccess
        self.onError = onError
    }
}

/// Host-supplied action handler. Handlers run after the built-in actions have
/// had their turn, so a host cannot accidentally shadow `setState`.
public typealias ActionHandler = @Sendable ([String: JSONValue]) async throws -> Void

/// Context for one action execution, mirroring core's `ActionExecutionContext`.
public struct ActionExecutionContext {
    public var action: ResolvedAction
    public var handler: ActionHandler
    public var setState: (String, JSONValue) -> Void
    public var navigate: ((String) -> Void)?
    public var executeAction: ((ActionBinding) async -> Void)?

    public init(
        action: ResolvedAction,
        handler: @escaping ActionHandler,
        setState: @escaping (String, JSONValue) -> Void,
        navigate: ((String) -> Void)? = nil,
        executeAction: ((ActionBinding) async -> Void)? = nil
    ) {
        self.action = action
        self.handler = handler
        self.setState = setState
        self.navigate = navigate
        self.executeAction = executeAction
    }
}

/// Runs a handler and then its `onSuccess` or `onError` handler. Errors are
/// rethrown when the binding has no `onError`, the same way core behaves.
public func executeAction(_ context: ActionExecutionContext) async throws {
    do {
        try await context.handler(context.action.params)
        guard let onSuccess = context.action.onSuccess else { return }
        switch onSuccess {
        case .navigate(let path):
            context.navigate?(path)
        case .set(let values):
            for (path, value) in values {
                context.setState(path, value)
            }
        case .action(let chained):
            await context.executeAction?(ActionBinding(action: chained.action, params: chained.params))
        }
    } catch {
        guard let onError = context.action.onError else { throw error }
        switch onError {
        case .set(let values):
            for (path, value) in values {
                let resolved: JSONValue
                if value == .string("$error.message") {
                    resolved = .string(error.localizedDescription)
                } else {
                    resolved = value
                }
                context.setState(path, resolved)
            }
        case .action(let chained):
            await context.executeAction?(ActionBinding(action: chained.action, params: chained.params))
        }
    }
}

/// Executes action bindings against a state store and a handler table.
///
/// The built-in actions `setState`, `pushState`, and `removeState` run before
/// host handlers, matching the React action provider. Unknown actions warn and
/// do nothing so a spec that references an action the host has not registered
/// still renders.
public final class ActionDispatcher: @unchecked Sendable {
    public private(set) var handlers: [String: ActionHandler]
    public var navigate: ((String) -> Void)?
    /// Called when a binding carries a `confirm` block. Returning false cancels
    /// the action. When nil, the action runs without a prompt.
    public var requestConfirmation: ((ActionConfirm) async -> Bool)?
    /// Called before an action runs, for logging and devtools.
    public var onDispatch: ((ResolvedAction) -> Void)?

    private let store: StateStore

    public init(
        store: StateStore,
        handlers: [String: ActionHandler] = [:],
        navigate: ((String) -> Void)? = nil
    ) {
        self.store = store
        self.handlers = handlers
        self.navigate = navigate
    }

    /// Registers or replaces a handler.
    public func register(_ name: String, handler: @escaping ActionHandler) {
        handlers[name] = handler
    }

    /// Resolves and runs one binding.
    public func dispatch(_ binding: ActionBinding, resolvedParams: [String: JSONValue]? = nil) async {
        let resolved = resolveAction(binding, stateModel: store.snapshot, resolvedParams: resolvedParams)

        if let confirm = resolved.confirm, let requestConfirmation {
            let accepted = await requestConfirmation(confirm)
            guard accepted else { return }
        }

        onDispatch?(resolved)
        await run(resolved)
    }

    /// Runs an already resolved action.
    public func run(_ resolved: ResolvedAction) async {
        if runBuiltIn(resolved) { return }

        guard let handler = handlers[resolved.action] else {
            JSONRenderLog.warn("Unknown action: \"\(resolved.action)\"")
            return
        }

        let context = ActionExecutionContext(
            action: resolved,
            handler: handler,
            setState: { [store] path, value in store.set(path, value) },
            navigate: navigate,
            executeAction: { [weak self] binding in
                await self?.dispatch(binding)
            }
        )

        do {
            try await executeAction(context)
        } catch {
            JSONRenderLog.warn("Action \"\(resolved.action)\" failed: \(error.localizedDescription)")
        }
    }

    /// Returns true when the action was one of the built-ins.
    private func runBuiltIn(_ resolved: ResolvedAction) -> Bool {
        switch resolved.action {
        case "setState":
            guard let statePath = resolved.params["statePath"]?.stringValue else { return true }
            store.set(statePath, resolved.params["value"] ?? .null)
            return true

        case "pushState":
            guard let statePath = resolved.params["statePath"]?.stringValue else { return true }
            let value = deepResolveDynamicValue(resolved.params["value"] ?? .null, stateModel: store.snapshot)
            var array = store.get(statePath)?.arrayValue ?? []
            array.append(value)
            store.set(statePath, .array(array))
            if let clearPath = resolved.params["clearStatePath"]?.stringValue {
                store.set(clearPath, .string(""))
            }
            return true

        case "removeState":
            guard let statePath = resolved.params["statePath"]?.stringValue else { return true }
            guard let index = resolved.params["index"]?.intValue else { return true }
            guard var array = store.get(statePath)?.arrayValue else { return true }
            guard array.indices.contains(index) else { return true }
            array.remove(at: index)
            store.set(statePath, .array(array))
            return true

        default:
            return false
        }
    }
}
