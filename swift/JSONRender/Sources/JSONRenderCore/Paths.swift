import Foundation

/// JSON Pointer helpers that match the behaviour of `@json-render/core`'s
/// `getByPath`, `setByPath`, `addByPath`, and `removeByPath` (RFC 6901 reads,
/// RFC 6902 writes for streamed patches).
public enum JSONPointer {
    /// Splits a JSON Pointer into unescaped tokens per RFC 6901 section 4.
    public static func parse(_ path: String) -> [String] {
        let raw = path.hasPrefix("/") ? String(path.dropFirst()) : path
        return raw.split(separator: "/", omittingEmptySubsequences: false).map { token in
            token.replacingOccurrences(of: "~1", with: "/")
                .replacingOccurrences(of: "~0", with: "~")
        }
    }
}

/// Reads a value by JSON Pointer path. Returns `nil` for a missing path.
public func getByPath(_ root: JSONValue?, _ path: String) -> JSONValue? {
    guard let root else { return nil }
    if path.isEmpty || path == "/" { return root }
    var current = root
    for segment in JSONPointer.parse(path) {
        switch current {
        case .array(let array):
            guard let index = Int(segment), array.indices.contains(index) else { return nil }
            current = array[index]
        case .object(let object):
            guard let next = object[segment] else { return nil }
            current = next
        default:
            return nil
        }
    }
    return current
}

/// Reads a value from an object state model by JSON Pointer path.
public func getByPath(_ state: [String: JSONValue], _ path: String) -> JSONValue? {
    getByPath(JSONValue.object(state), path)
}

/// Sets a value by JSON Pointer path, creating intermediate containers the way
/// core's `setByPath` does. Returns the updated root.
public func setByPath(_ root: JSONValue, _ path: String, _ value: JSONValue) -> JSONValue {
    writeByPath(root, JSONPointer.parse(path), value, mode: .set)
}

/// Adds a value using RFC 6902 "add" semantics: objects replace the member,
/// arrays insert before the index or append for `-`.
public func addByPath(_ root: JSONValue, _ path: String, _ value: JSONValue) -> JSONValue {
    writeByPath(root, JSONPointer.parse(path), value, mode: .add)
}

/// Removes a value using RFC 6902 "remove" semantics.
public func removeByPath(_ root: JSONValue, _ path: String) -> JSONValue {
    let segments = JSONPointer.parse(path)
    guard !segments.isEmpty else { return root }
    return removeValue(root, segments)
}

/// Resolves a `repeat.statePath`, which may be an absolute path or an
/// `{ "$item": "field" }` path relative to the enclosing repeat item.
public func resolveRepeatStatePath(_ statePath: RepeatStatePath, repeatBasePath: String?) -> String? {
    switch statePath {
    case .string(let path):
        return path
    case .item(let item):
        guard let repeatBasePath else { return nil }
        if item.isEmpty || item == "/" { return repeatBasePath }
        return joinStatePath(repeatBasePath, item)
    }
}

/// The absolute state path of one item in a repeated array.
public func resolveRepeatItemStatePath(_ statePath: String, index: Int) -> String {
    joinStatePath(statePath, String(index))
}

func joinStatePath(_ basePath: String, _ childPath: String) -> String {
    let child = childPath.hasPrefix("/") ? String(childPath.dropFirst()) : childPath
    if basePath.isEmpty || basePath == "/" { return "/\(child)" }
    return "\(basePath)/\(child)"
}

private enum PathWriteMode {
    case set
    case add
}

private func writeByPath(
    _ root: JSONValue,
    _ segments: [String],
    _ value: JSONValue,
    mode: PathWriteMode
) -> JSONValue {
    guard !segments.isEmpty, !segments.contains("__proto__") else { return root }
    return writeValue(root, segments, value, mode: mode)
}

private func writeValue(
    _ node: JSONValue,
    _ segments: [String],
    _ value: JSONValue,
    mode: PathWriteMode
) -> JSONValue {
    guard let segment = segments.first else { return node }
    let remaining = Array(segments.dropFirst())
    let isLast = remaining.isEmpty
    let nextIsNumeric = remaining.first.map { isNumericIndex($0) || $0 == "-" } ?? false

    if isLast {
        switch node {
        case .array(var array):
            if segment == "-" {
                array.append(value)
            } else if let index = denseIndex(segment, array.count) {
                if mode == .add {
                    array.insert(value, at: index)
                } else {
                    array[index] = value
                }
            }
            return .array(array)
        case .object(var object):
            object[segment] = value
            return .object(object)
        default:
            // A missing or scalar root is replaced with a container of the
            // shape the path implies.
            if segment == "-" {
                return .array([value])
            }
            if let index = denseIndex(segment, 0) {
                return .array(index == 0 ? [value] : [])
            }
            return .object([segment: value])
        }
    }

    switch node {
    case .array(var array):
        guard let index = denseIndex(segment, array.count) else { return node }
        let existing = index < array.count ? array[index] : nil
        let child = containerOrNew(existing, numericNext: nextIsNumeric)
        let updated = writeValue(child, remaining, value, mode: mode)
        if index < array.count {
            array[index] = updated
        } else if mode == .add || index == array.count {
            array.append(updated)
        }
        return .array(array)
    case .object(var object):
        let child = containerOrNew(object[segment], numericNext: nextIsNumeric)
        object[segment] = writeValue(child, remaining, value, mode: mode)
        return .object(object)
    default:
        // A scalar where a container is required is replaced, matching core's
        // `typeof current[segment] !== "object"` check. The root is a spec or
        // state object in practice, so this only matters for defensive use.
        let child = nextIsNumeric ? JSONValue.array([]) : .object([:])
        return .object([segment: writeValue(child, remaining, value, mode: mode)])
    }
}

private func containerOrNew(_ existing: JSONValue?, numericNext: Bool) -> JSONValue {
    if let existing, existing.isContainer { return existing }
    return numericNext ? .array([]) : .object([:])
}

private func removeValue(_ node: JSONValue, _ segments: [String]) -> JSONValue {
    guard let segment = segments.first else { return node }
    let remaining = Array(segments.dropFirst())
    if remaining.isEmpty {
        switch node {
        case .object(var object):
            object.removeValue(forKey: segment)
            return .object(object)
        case .array(var array):
            if let index = Int(segment), array.indices.contains(index) {
                array.remove(at: index)
            }
            return .array(array)
        default:
            return node
        }
    }
    switch node {
    case .object(var object):
        guard let child = object[segment], child.isContainer else { return node }
        object[segment] = removeValue(child, remaining)
        return .object(object)
    case .array(var array):
        guard let index = Int(segment), array.indices.contains(index), array[index].isContainer else {
            return node
        }
        array[index] = removeValue(array[index], remaining)
        return .array(array)
    default:
        return node
    }
}

/// Whether the value can hold nested members for a path write.
extension JSONValue {
    var isContainer: Bool {
        switch self {
        case .object, .array: return true
        default: return false
        }
    }
}

private func isNumericIndex(_ value: String) -> Bool {
    !value.isEmpty && value.allSatisfy(\.isNumber)
}

private func denseIndex(_ segment: String, _ count: Int) -> Int? {
    guard isNumericIndex(segment), let index = Int(segment), index <= count else { return nil }
    return index
}
