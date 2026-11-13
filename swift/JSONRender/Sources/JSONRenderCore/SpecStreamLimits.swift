import Foundation

/// Limits that bound the JSON document a spec stream builds.
///
/// A stream composes many patches into one document. A `copy` patch repeats a
/// subtree, and each appearance counts in full even though the copies share
/// storage, so a short stream can describe a document far larger than the text
/// that produced it. One budget is shared by every patch a compiler applies,
/// and a write that would pass a limit is rejected before the document
/// changes. `Spec.decodePartial` applies the same limits to each element
/// before it serializes the element.
public struct SpecStreamLimits: Equatable, Sendable {
    /// The deepest nesting the document may reach. The document root is at
    /// depth 1.
    public var maxDepth: Int

    /// The most values the document may hold, counting every member of every
    /// object and array as a value of its own.
    public var maxNodes: Int

    /// The most bytes the document's scalar values and keys may take, which
    /// approximates the size of the document once serialized.
    public var maxBytes: Int

    /// The most values the compiler may measure while checking patches. A
    /// write is measured before it is applied, and a stream that keeps asking
    /// for writes past a limit is stopped once this work is spent.
    public var maxWork: Int

    /// The limits the compiler uses when none are given.
    ///
    /// The defaults leave room for large specs and long props while stopping a
    /// short stream that expands into a document of millions of values.
    public static let `default` = SpecStreamLimits()

    public init(
        maxDepth: Int = 100,
        maxNodes: Int = 50_000,
        maxBytes: Int = 4_000_000,
        maxWork: Int = 200_000
    ) {
        self.maxDepth = max(1, maxDepth)
        self.maxNodes = max(1, maxNodes)
        self.maxBytes = max(1, maxBytes)
        self.maxWork = max(1, maxWork)
    }
}

/// The logical size of a JSON value.
///
/// Values are counted one at a time, so a subtree that shares storage with
/// another subtree still adds its full size to the document. That is what
/// makes repeated copies visible to a budget.
struct JSONValueSize: Equatable {
    var nodes = 0
    var bytes = 0

    /// The deepest nesting the value adds, where a scalar has depth 1.
    var depth = 0

    static let zero = JSONValueSize()
}

/// Measures `value` from the top of the document it is written into.
///
/// Returns nil when the value nests deeper than `maxDepth`, so a caller can
/// reject it without walking the rest. The walk is recursive but stops at
/// `maxDepth`, which keeps the stack bounded by the limit.
func measureJSONValue(_ value: JSONValue, maxDepth: Int) -> JSONValueSize? {
    var size = JSONValueSize()
    guard measureJSONValue(value, depth: 1, maxDepth: maxDepth, into: &size) else { return nil }
    return size
}

private func measureJSONValue(
    _ value: JSONValue,
    depth: Int,
    maxDepth: Int,
    into size: inout JSONValueSize
) -> Bool {
    guard depth <= maxDepth else { return false }
    size.nodes += 1
    size.depth = max(size.depth, depth)

    switch value {
    case .null:
        size.bytes += 4
    case .bool(let flag):
        size.bytes += flag ? 4 : 5
    case .number:
        size.bytes += 8
    case .string(let string):
        size.bytes += string.utf8.count + 2
    case .array(let items):
        for item in items {
            guard measureJSONValue(item, depth: depth + 1, maxDepth: maxDepth, into: &size) else {
                return false
            }
        }
    case .object(let object):
        for (key, child) in object {
            size.bytes += key.utf8.count + 3
            guard measureJSONValue(child, depth: depth + 1, maxDepth: maxDepth, into: &size) else {
                return false
            }
        }
    }
    return true
}

/// Tracks one document's use of `SpecStreamLimits` across patches.
struct SpecStreamBudget {
    let limits: SpecStreamLimits
    private(set) var nodes: Int
    private(set) var bytes: Int
    private(set) var work: Int

    init(limits: SpecStreamLimits, initial: JSONValue) {
        self.limits = limits
        if let size = measureJSONValue(initial, maxDepth: limits.maxDepth) {
            nodes = size.nodes
            bytes = size.bytes
            work = size.nodes
        } else {
            // The starting document is already past a limit. Every write that
            // grows it is rejected; a write that replaces part of it can
            // still shrink it back under the limit.
            nodes = limits.maxNodes
            bytes = limits.maxBytes
            work = limits.maxWork + 1
        }
    }

    /// Checks a write of `value` at a path `pathDepth` levels below the root,
    /// then records its size. `replaced` is the value the write removes, when
    /// the path already holds one.
    ///
    /// Throws before the document changes when the write would pass a limit.
    mutating func reserve(_ value: JSONValue, pathDepth: Int, replacing replaced: JSONValue?) throws {
        let added = try measure(value)
        let removed = try replaced.map { try measure($0) } ?? .zero
        try commit(added: added, removed: removed, pathDepth: pathDepth)
    }

    /// Checks a move that removes `source` and writes `value` at a path
    /// `pathDepth` levels below the root.
    ///
    /// The destination is not credited even when it already holds a value. The
    /// source removal can take that value with it, so leaving the charge in
    /// place can only make the budget stricter. Both sides are measured and
    /// checked before either is recorded, so a rejected move leaves the budget
    /// as it was.
    mutating func move(_ value: JSONValue, pathDepth: Int, releasing source: JSONValue?) throws {
        let added = try measure(value)
        let removed = try source.map { try measure($0) } ?? .zero
        try commit(added: added, removed: removed, pathDepth: pathDepth)
    }

    /// Records a write once all of its measurements are taken. Every check
    /// runs before any of the counts change, so a thrown error leaves them
    /// untouched.
    private mutating func commit(
        added: JSONValueSize,
        removed: JSONValueSize,
        pathDepth: Int
    ) throws {
        guard pathDepth + added.depth <= limits.maxDepth else {
            throw SpecStreamError(
                message: "Stream patch exceeds the spec depth limit of \(limits.maxDepth)."
            )
        }
        let nextNodes = nodes - removed.nodes + added.nodes
        guard nextNodes <= limits.maxNodes else {
            throw SpecStreamError(
                message: "Stream patch exceeds the spec node limit of \(limits.maxNodes)."
            )
        }
        let nextBytes = bytes - removed.bytes + added.bytes
        guard nextBytes <= limits.maxBytes else {
            throw SpecStreamError(
                message: "Stream patch exceeds the spec size limit of \(limits.maxBytes) bytes."
            )
        }

        nodes = nextNodes
        bytes = nextBytes
    }

    /// Records the removal of `value`, when the document held one at the path.
    mutating func release(_ value: JSONValue?) throws {
        guard let value else { return }
        let removed = try measure(value)
        nodes = max(0, nodes - removed.nodes)
        bytes = max(0, bytes - removed.bytes)
    }

    private mutating func measure(_ value: JSONValue) throws -> JSONValueSize {
        guard work <= limits.maxWork else {
            throw SpecStreamError(
                message: "Stream exceeds the spec patch work limit of \(limits.maxWork)."
            )
        }
        guard let size = measureJSONValue(value, maxDepth: limits.maxDepth) else {
            throw SpecStreamError(
                message: "Stream patch exceeds the spec depth limit of \(limits.maxDepth)."
            )
        }
        work += size.nodes
        return size
    }
}
