import Foundation

/// The state a store holds after its host replaces one spec with another.
///
/// When the spec is the same, the current state is kept so edits made through
/// `$bindState` survive a re-render. When the spec changes, only the initial
/// state keys whose value changed are written, so a streaming spec that fills
/// in props does not wipe what the user has typed. An initial state key that
/// the new spec drops is removed. This mirrors the React renderer, whose state
/// provider diffs the old and new `initialState` and updates only the changed
/// pointers.
public func stateAfterSpecChange(
    previous: Spec,
    next: Spec,
    current: JSONValue
) -> JSONValue {
    guard previous != next else { return current }

    let previousState = flattenState(previous.state)
    let nextState = flattenState(next.state)

    var result = current
    for path in Set(previousState.keys).union(nextState.keys) {
        let previousValue = previousState[path]
        let nextValue = nextState[path]
        guard previousValue != nextValue else { continue }
        if let nextValue {
            result = setByPath(result, path, nextValue)
        } else {
            result = removeByPath(result, path)
        }
    }
    return result
}

/// The state object's pointers to leaf values.
///
/// Plain objects recurse so a nested key is compared on its own; arrays and
/// other values are leaves, matching core's `flattenToPointers`.
private func flattenState(_ state: [String: JSONValue]?) -> [String: JSONValue] {
    guard let state else { return [:] }
    var flat: [String: JSONValue] = [:]

    func visit(_ object: [String: JSONValue], prefix: String) {
        for (key, value) in object {
            let pointer = "\(prefix)/\(key)"
            if let nested = value.objectValue {
                visit(nested, prefix: pointer)
            } else {
                flat[pointer] = value
            }
        }
    }

    visit(state, prefix: "")
    return flat
}
