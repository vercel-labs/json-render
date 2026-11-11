import Foundation

/// The state a store holds after its host replaces one spec with another.
///
/// When the spec is the same, the current state is kept so edits made through
/// `$bindState` survive a re-render. When the spec changes, the store resets to
/// the new spec's `state`, matching a fresh render of that spec. A spec without
/// `state` clears the store.
public func stateAfterSpecChange(
    previous: Spec,
    next: Spec,
    current: JSONValue
) -> JSONValue {
    guard previous != next else { return current }
    return next.state.map { JSONValue.object($0) } ?? .object([:])
}
