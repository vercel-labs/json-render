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
    // Removals run before writes. A field that changes from a scalar or null to
    // an object has its old leaf removed while its new children are written, so
    // removing the old parent after writing its children would discard them.
    // The union below has no defined order, so the two kinds of change cannot
    // share one loop and rely on when each path happens to be visited.
    var removals: [String] = []
    var writes: [(path: String, value: JSONValue)] = []
    for path in Set(previousState.keys).union(nextState.keys) {
        let previousValue = previousState[path]
        let nextValue = nextState[path]
        guard previousValue != nextValue else { continue }
        if let nextValue {
            writes.append((path, nextValue))
        } else {
            removals.append(path)
        }
    }
    for path in removals {
        result = removeByPath(result, path)
    }
    for write in writes {
        result = setByPath(result, write.path, write.value)
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
