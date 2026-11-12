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

/// Applies a patch to a decoded spec by round-tripping through JSON.
///
/// The result goes through `decodePartial`, which drops an element that is
/// still incomplete, so props that arrived before its `type` are lost rather
/// than waiting for the rest. Use `SpecStreamCompiler`, which keeps the raw
/// JSON and only decodes on demand, for a stream that patches an element in
/// several steps.
public func applySpecPatch(_ spec: inout Spec, _ patch: JsonPatch) throws {
    var root = spec.jsonValue
    try applySpecStreamPatch(&root, patch)
    spec = Spec.decodePartial(root)
}

/// Builds a spec from a stream of JSONL patches, buffering partial lines the
/// way core's `createSpecStreamCompiler` does.
public final class SpecStreamCompiler {
    private var result: JSONValue
    private var buffer = ""
    private var appliedPatches: [JsonPatch] = []

    public init(initial: JSONValue = .object([:])) {
        self.result = initial
    }

    public convenience init(initial: Spec) {
        self.init(initial: initial.jsonValue)
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
                try applySpecStreamPatch(&result, patch)
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
                try applySpecStreamPatch(&result, patch)
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
    public static func decodePartial(_ json: JSONValue) -> Spec {
        guard case .object(let object) = json else {
            return Spec(root: "", elements: [:])
        }

        let root = object["root"]?.stringValue ?? ""
        let state = object["state"]?.objectValue

        var elements: [String: UIElement] = [:]
        if let rawElements = object["elements"]?.objectValue {
            for (key, value) in rawElements {
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
    public static func decodePartial(_ string: String) -> Spec? {
        guard let json = JSONValue.decode(string) else { return nil }
        return decodePartial(json)
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
