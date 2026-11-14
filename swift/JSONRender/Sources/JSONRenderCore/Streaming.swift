import Foundation

/// An error raised by a failing RFC 6902 `test` patch.
public struct SpecStreamError: Error, CustomStringConvertible {
    public let message: String
    public var description: String { message }
}

/// Parses one line of a SpecStream. Each line is a JSON patch operation.
/// Returns nil for blank lines, non-object lines, and invalid JSON.
public func parseSpecStreamLine(_ line: String) -> JsonPatch? {
    let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
    guard trimmed.hasPrefix("{"), let data = trimmed.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(JsonPatch.self, from: data)
}

/// Applies an RFC 6902 patch to a JSON document.
public func applySpecStreamPatch(_ root: inout JSONValue, _ patch: JsonPatch) throws {
    switch patch.op {
    case .add:
        root = addByPath(root, patch.path, patch.value ?? .null)

    case .replace:
        // The stream is applied to a partial document, so a replace writes the
        // value whether or not the target exists.
        root = setByPath(root, patch.path, patch.value ?? .null)

    case .remove:
        root = removeByPath(root, patch.path)

    case .move:
        guard let from = patch.from else { return }
        let moved = getByPath(root, from) ?? .null
        root = removeByPath(root, from)
        root = addByPath(root, patch.path, moved)

    case .copy:
        guard let from = patch.from else { return }
        let copied = getByPath(root, from) ?? .null
        root = addByPath(root, patch.path, copied)

    case .test:
        let actual = getByPath(root, patch.path)
        guard actual == patch.value else {
            throw SpecStreamError(
                message: "Test operation failed: value at \"\(patch.path)\" does not match"
            )
        }
    }
}

/// Applies an RFC 6902 patch while charging the write to `budget`.
///
/// The write is measured before `root` changes, so a patch that would pass a
/// limit leaves the document as it was. A `copy` charges the copied subtree in
/// full even though the copy shares storage with its source, which stops a
/// stream from describing a document far larger than its patches.
func applySpecStreamPatch(
    _ root: inout JSONValue,
    _ patch: JsonPatch,
    budget: inout SpecStreamBudget
) throws {
    switch patch.op {
    case .add:
        let value = patch.value ?? .null
        let segments = JSONPointer.parse(patch.path)
        guard !isBlockedWrite(segments) else { return }
        try budget.reserve(
            value,
            pathDepth: segments.count,
            replacing: valueReplacedByAdd(root, segments: segments)
        )
        root = addByPath(root, patch.path, value)

    case .replace:
        let value = patch.value ?? .null
        let segments = JSONPointer.parse(patch.path)
        guard !isBlockedWrite(segments) else { return }
        try budget.reserve(
            value,
            pathDepth: segments.count,
            replacing: valueAtSegments(root, segments, dense: true)
        )
        root = setByPath(root, patch.path, value)

    case .remove:
        let segments = JSONPointer.parse(patch.path)
        try budget.release(valueAtSegments(root, segments))
        root = removeByPath(root, patch.path)

    case .move:
        guard let from = patch.from else { return }
        let moved = getByPath(root, from) ?? .null
        let sourced = valueAtSegments(root, JSONPointer.parse(from))
        let segments = JSONPointer.parse(patch.path)
        if isBlockedWrite(segments) {
            // The source removal still happens; only the destination write is
            // skipped, so the source is released on its own.
            try budget.release(sourced)
        } else {
            try budget.move(moved, pathDepth: segments.count, releasing: sourced)
        }
        root = removeByPath(root, from)
        root = addByPath(root, patch.path, moved)

    case .copy:
        guard let from = patch.from else { return }
        let copied = getByPath(root, from) ?? .null
        let segments = JSONPointer.parse(patch.path)
        if !isBlockedWrite(segments) {
            try budget.reserve(
                copied,
                pathDepth: segments.count,
                replacing: valueReplacedByAdd(root, segments: segments)
            )
        }
        root = addByPath(root, patch.path, copied)

    case .test:
        let actual = getByPath(root, patch.path)
        guard actual == patch.value else {
            throw SpecStreamError(
                message: "Test operation failed: value at \"\(patch.path)\" does not match"
            )
        }
    }
}

/// Reads the value at already-parsed pointer segments.
///
/// Unlike `getByPath`, "/" is read as the member with an empty key, matching
/// what `addByPath`, `setByPath`, and `removeByPath` do with the same path.
///
/// With `dense`, array indexes are read the way the path writer reads them,
/// which accepts only plain digits. A budget that read `/arr/+0` as `arr[0]`
/// would credit the write for a replace the writer skips, letting a stream
/// repeat that replace to spend budget it never used. Removals keep the
/// lenient index so their release matches the value `removeByPath` takes out.
private func valueAtSegments(
    _ root: JSONValue,
    _ segments: [String],
    dense: Bool = false
) -> JSONValue? {
    var current = root
    for segment in segments {
        switch current {
        case .array(let array):
            let index: Int?
            if dense {
                index = isNumericIndex(segment) ? Int(segment) : nil
            } else {
                index = Int(segment)
            }
            guard let index, array.indices.contains(index) else { return nil }
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

/// Whether the path writer refuses the write, which leaves the document and
/// the budget unchanged. `writeByPath` skips paths with a `__proto__` segment.
private func isBlockedWrite(_ segments: [String]) -> Bool {
    segments.contains("__proto__")
}

/// The value an `add` removes, when the destination is an object member.
/// Arrays insert instead of replacing, and a missing or scalar parent is
/// replaced without the budget being credited for it.
private func valueReplacedByAdd(_ root: JSONValue, segments: [String]) -> JSONValue? {
    guard !segments.isEmpty else { return nil }
    let parent = segments.count == 1
        ? root
        : valueAtSegments(root, Array(segments.dropLast()), dense: true)
    guard case .object = parent else { return nil }
    return valueAtSegments(root, segments, dense: true)
}

/// Applies a patch to a decoded spec by round-tripping through JSON.
///
/// The result goes through `decodePartial`, which drops an element that is
/// still incomplete, so props that arrived before its `type` are lost rather
/// than waiting for the rest. Use `SpecStreamCompiler`, which keeps the raw
/// JSON and only decodes on demand, for a stream that patches an element in
/// several steps.
public func applySpecPatch(_ spec: inout Spec, _ patch: JsonPatch) throws {
    var root = spec.jsonValue
    var budget = SpecStreamBudget(limits: .default, initial: root)
    try applySpecStreamPatch(&root, patch, budget: &budget)
    spec = Spec.decodePartial(root)
}

/// Builds a spec from a stream of JSONL patches, buffering partial lines the
/// way core's `createSpecStreamCompiler` does.
public final class SpecStreamCompiler {
    /// The limits every patch in this stream is checked against.
    public let limits: SpecStreamLimits

    private var result: JSONValue
    private var budget: SpecStreamBudget
    private var buffer = ""
    private var appliedPatches: [JsonPatch] = []

    public init(initial: JSONValue = .object([:]), limits: SpecStreamLimits = .default) {
        self.limits = limits
        self.result = initial
        self.budget = SpecStreamBudget(limits: limits, initial: initial)
    }

    public convenience init(initial: Spec, limits: SpecStreamLimits = .default) {
        self.init(initial: initial.jsonValue, limits: limits)
    }

    /// Appends a chunk of text and applies every complete line.
    @discardableResult
    public func push(_ chunk: String) -> (result: JSONValue, newPatches: [JsonPatch]) {
        buffer += chunk
        var newPatches: [JsonPatch] = []

        var lines = buffer.components(separatedBy: "\n")
        buffer = lines.popLast() ?? ""

        for line in lines {
            guard let patch = parseSpecStreamLine(line) else { continue }
            do {
                try applySpecStreamPatch(&result, patch, budget: &budget)
            } catch {
                JSONRenderLog.warn("Dropped stream patch: \(error)")
                continue
            }
            appliedPatches.append(patch)
            newPatches.append(patch)
        }

        return (result, newPatches)
    }

    /// Applies any buffered partial line and returns the result.
    public func getResult() -> JSONValue {
        if let patch = parseSpecStreamLine(buffer) {
            do {
                try applySpecStreamPatch(&result, patch, budget: &budget)
                appliedPatches.append(patch)
            } catch {
                JSONRenderLog.warn("Dropped stream patch: \(error)")
            }
        }
        buffer = ""
        return result
    }

    /// Every patch applied so far.
    public func getPatches() -> [JsonPatch] {
        appliedPatches
    }

    /// Clears the buffer, patch log, and result.
    public func reset(initial: JSONValue = .object([:])) {
        result = initial
        budget = SpecStreamBudget(limits: limits, initial: initial)
        buffer = ""
        appliedPatches.removeAll()
    }
}

// MARK: - Partial spec decoding

extension Spec {
    /// Decodes a spec that may still be missing parts while streaming.
    ///
    /// A complete spec decodes exactly as `Decodable` does. Missing `root` or
    /// `elements` become `""` and `[:]`, and elements that fail to decode are
    /// skipped with a warning, so a half-written element does not blank the
    /// whole screen.
    ///
    /// An element that is larger than `limits` allows is skipped before it is
    /// serialized. A stream cannot build such an element, but a decoded
    /// document can arrive from elsewhere, and the same limits keep
    /// serialization from expanding beyond what the stream budget allows.
    public static func decodePartial(
        _ json: JSONValue,
        limits: SpecStreamLimits = .default
    ) -> Spec {
        guard case .object(let object) = json else {
            return Spec(root: "", elements: [:])
        }

        let root = object["root"]?.stringValue ?? ""
        let state = object["state"]?.objectValue

        var elements: [String: UIElement] = [:]
        if let rawElements = object["elements"]?.objectValue {
            for (key, value) in rawElements {
                guard isWithinLimits(value, limits) else {
                    JSONRenderLog.warn("Skipped element \"\(key)\": exceeds the spec expansion limits")
                    continue
                }
                if let element = decodeElement(value) {
                    elements[key] = element
                } else {
                    JSONRenderLog.warn("Skipped element \"\(key)\": does not match the element schema")
                }
            }
        }

        return Spec(root: root, elements: elements, state: state)
    }

    /// Decodes a spec from a JSON string, tolerating partial documents.
    public static func decodePartial(
        _ string: String,
        limits: SpecStreamLimits = .default
    ) -> Spec? {
        guard let json = JSONValue.decode(string) else { return nil }
        return decodePartial(json, limits: limits)
    }

    private static func isWithinLimits(_ value: JSONValue, _ limits: SpecStreamLimits) -> Bool {
        guard let size = measureJSONValue(value, maxDepth: limits.maxDepth) else { return false }
        return size.nodes <= limits.maxNodes && size.bytes <= limits.maxBytes
    }

    private static func decodeElement(_ value: JSONValue) -> UIElement? {
        guard let data = try? JSONEncoder().encode(value) else { return nil }
        return try? JSONDecoder().decode(UIElement.self, from: data)
    }

    /// The spec as a JSON value.
    public var jsonValue: JSONValue {
        JSONValue.fromCodable(self)
    }
}

extension JSONValue {
    /// Converts any Codable value into a JSON value.
    public static func fromCodable<T: Encodable>(_ value: T) -> JSONValue {
        guard let data = try? JSONEncoder().encode(value) else { return .null }
        return (try? JSONDecoder().decode(JSONValue.self, from: data)) ?? .null
    }
}
