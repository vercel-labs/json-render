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

    // The diff walks the two initial states side by side and only builds a
    // pointer for a value that actually changed. Flattening each side into
    // pointer keys first would allocate a full path string per leaf, which a
    // long key repeated over many leaves turns into hundreds of megabytes on
    // every streamed spec update.
    var removals: [[String]] = []
    var writes: [StateWrite] = []
    var path: [String] = []
    diffState(
        previous: previous.state,
        next: next.state,
        depth: 0,
        path: &path,
        removals: &removals,
        writes: &writes
    )

    var result = current
    // Removals run before writes. A field that changes from a scalar or null to
    // an object has its old leaf removed while its new children are written, so
    // removing the old parent after writing its children would discard them.
    for segments in removals {
        result = removeByPath(result, encodePointer(segments))
    }
    for write in writes {
        result = setByPath(result, encodePointer(write.segments), write.value)
    }
    return result
}

/// One leaf value the new initial state writes.
private struct StateWrite {
    let segments: [String]
    let value: JSONValue
}

/// The deepest object nesting the state diff descends into.
///
/// Matches core's `flattenToPointers`: a nested object deeper than this is
/// compared and written as one leaf value, so a pathological initial state
/// cannot make the diff recurse without bound.
private let maxStateDiffDepth = 20

/// Collects the leaf changes between two initial states.
///
/// Plain objects are compared member by member, and two equal subtrees are
/// skipped without visiting their leaves. Arrays, null, and scalars are leaves,
/// matching `flattenToPointers`.
private func diffState(
    previous: [String: JSONValue]?,
    next: [String: JSONValue]?,
    depth: Int,
    path: inout [String],
    removals: inout [[String]],
    writes: inout [StateWrite]
) {
    let old = previous ?? [:]
    let new = next ?? [:]
    guard !(old.isEmpty && new.isEmpty) else { return }

    var keys = Set(old.keys)
    keys.formUnion(new.keys)
    for key in keys {
        let previousValue = old[key]
        let nextValue = new[key]
        // Equal values, including a key both states drop, need no write.
        guard previousValue != nextValue else { continue }

        path.append(key)
        if let previousValue, isStateBranch(previousValue, depth: depth) {
            if let nextValue, isStateBranch(nextValue, depth: depth) {
                diffState(
                    previous: previousValue.objectValue,
                    next: nextValue.objectValue,
                    depth: depth + 1,
                    path: &path,
                    removals: &removals,
                    writes: &writes
                )
            } else {
                // The old value was an object and the new one is a leaf or
                // missing, so every old leaf goes and the new value replaces
                // the parent.
                collectRemovals(
                    previousValue.objectValue ?? [:],
                    depth: depth + 1,
                    path: &path,
                    into: &removals
                )
                if let nextValue {
                    writes.append(StateWrite(segments: path, value: nextValue))
                }
            }
        } else {
            if previousValue != nil {
                removals.append(path)
            }
            if let nextValue {
                if isStateBranch(nextValue, depth: depth) {
                    // The old value was a leaf or missing, so every new leaf is
                    // a write of its own.
                    collectWrites(
                        nextValue.objectValue ?? [:],
                        depth: depth + 1,
                        path: &path,
                        into: &writes
                    )
                } else {
                    writes.append(StateWrite(segments: path, value: nextValue))
                }
            }
        }
        path.removeLast()
    }
}

/// Whether `value` is compared member by member rather than as one leaf.
private func isStateBranch(_ value: JSONValue, depth: Int) -> Bool {
    depth < maxStateDiffDepth && value.objectValue != nil
}

/// Records the pointer of every leaf in a subtree that is going away.
private func collectRemovals(
    _ object: [String: JSONValue],
    depth: Int,
    path: inout [String],
    into removals: inout [[String]]
) {
    for (key, value) in object {
        path.append(key)
        if isStateBranch(value, depth: depth) {
            collectRemovals(
                value.objectValue ?? [:],
                depth: depth + 1,
                path: &path,
                into: &removals
            )
        } else {
            removals.append(path)
        }
        path.removeLast()
    }
}

/// Records a write for every leaf in a subtree that is new.
private func collectWrites(
    _ object: [String: JSONValue],
    depth: Int,
    path: inout [String],
    into writes: inout [StateWrite]
) {
    for (key, value) in object {
        path.append(key)
        if isStateBranch(value, depth: depth) {
            collectWrites(
                value.objectValue ?? [:],
                depth: depth + 1,
                path: &path,
                into: &writes
            )
        } else {
            writes.append(StateWrite(segments: path, value: value))
        }
        path.removeLast()
    }
}
