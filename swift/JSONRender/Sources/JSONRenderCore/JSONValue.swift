import Foundation

/// Any JSON value, mirroring the `unknown` values core passes through specs,
/// state, props, and action params.
public enum JSONValue: Codable, Equatable, Sendable {
    case object([String: JSONValue])
    case array([JSONValue])
    case string(String)
    case number(Double)
    case bool(Bool)
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Value is not valid JSON"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .object(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }

    /// The value as a Swift object dictionary, or `nil` for other JSON types.
    public var objectValue: [String: JSONValue]? {
        if case .object(let value) = self { return value }
        return nil
    }

    /// The value as a Swift array, or `nil` for other JSON types.
    public var arrayValue: [JSONValue]? {
        if case .array(let value) = self { return value }
        return nil
    }

    /// The value as a string, or `nil` for other JSON types.
    public var stringValue: String? {
        if case .string(let value) = self { return value }
        return nil
    }

    /// The value as a number, or `nil` for other JSON types.
    public var doubleValue: Double? {
        if case .number(let value) = self { return value }
        return nil
    }

    /// The value as an integer when it is a whole number that fits in `Int`,
    /// or `nil` otherwise. `Int(exactly:)` returns nil instead of trapping for
    /// values past `Int.max`, such as `1e19` in a spec.
    public var intValue: Int? {
        guard case .number(let value) = self else { return nil }
        return Int(exactly: value)
    }

    /// The value as a Boolean, or `nil` for other JSON types.
    public var boolValue: Bool? {
        if case .bool(let value) = self { return value }
        return nil
    }

    /// Whether the value is JSON null (or absent).
    public var isNull: Bool {
        if case .null = self { return true }
        return false
    }

    /// JavaScript truthiness for a JSON value. Core evaluates conditions with
    /// `Boolean(value)`, so `""`, `0`, and `null` are false.
    public var isTruthy: Bool {
        switch self {
        case .null: return false
        case .bool(let value): return value
        case .number(let value): return value != 0 && !value.isNaN
        case .string(let value): return !value.isEmpty
        case .array, .object: return true
        }
    }

    /// Reads a member of an object value. Returns `nil` when the value is not
    /// an object or the key is absent.
    public subscript(key: String) -> JSONValue? {
        guard case .object(let object) = self else { return nil }
        return object[key]
    }

    /// Reads an array element. Returns `nil` when the value is not an array or
    /// the index is out of bounds.
    public subscript(index: Int) -> JSONValue? {
        guard case .array(let array) = self, array.indices.contains(index) else { return nil }
        return array[index]
    }

    /// Converts the value to a string for display, using the same coercion
    /// rules as `String(value)` where core interpolates `${path}` templates.
    public var displayString: String {
        switch self {
        case .null: return ""
        case .string(let value): return value
        case .number(let value):
            // A whole number prints without a decimal point. Values past
            // `Int.max` cannot be converted, so they print in Swift's form
            // instead of trapping.
            if let integer = Int(exactly: value) { return String(integer) }
            return String(value)
        case .bool(let value): return value ? "true" : "false"
        case .array, .object:
            return JSONValue.encodedString(self) ?? ""
        }
    }

    /// Encodes the value to a JSON string, or `nil` when encoding fails.
    public static func encodedString(_ value: JSONValue) -> String? {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(value) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Decodes a JSON string, returning `nil` for invalid JSON.
    public static func decode(_ string: String) -> JSONValue? {
        guard let data = string.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(JSONValue.self, from: data)
    }

    /// Decodes the value as a model type, returning `nil` when the shape does
    /// not match. Used where core casts a value it has already parsed.
    public func decoded<T: Decodable>(as type: T.Type) -> T? {
        guard let data = try? JSONEncoder().encode(self) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }
}

extension Double {
    /// The value rounded to a whole number and clamped to `range`.
    ///
    /// `Int(_:)` traps for a value past `Int.max`, which a spec-supplied
    /// number can reach, so clamping happens in `Double` first. A value that
    /// is not finite yields `fallback`.
    public func clampedInt(to range: ClosedRange<Int>, fallback: Int) -> Int {
        guard isFinite else { return fallback }
        let lower = Double(range.lowerBound)
        let upper = Double(range.upperBound)
        return Int(min(upper, max(lower, rounded())))
    }
}

extension JSONValue: ExpressibleByStringLiteral {
    public init(stringLiteral value: String) { self = .string(value) }
}

extension JSONValue: ExpressibleByIntegerLiteral {
    public init(integerLiteral value: Int) { self = .number(Double(value)) }
}

extension JSONValue: ExpressibleByFloatLiteral {
    public init(floatLiteral value: Double) { self = .number(value) }
}

extension JSONValue: ExpressibleByBooleanLiteral {
    public init(booleanLiteral value: Bool) { self = .bool(value) }
}

extension JSONValue: ExpressibleByNilLiteral {
    public init(nilLiteral: ()) { self = .null }
}

extension JSONValue: ExpressibleByArrayLiteral {
    public init(arrayLiteral elements: JSONValue...) { self = .array(elements) }
}

extension JSONValue: ExpressibleByDictionaryLiteral {
    public init(dictionaryLiteral elements: (String, JSONValue)...) {
        self = .object(Dictionary(uniqueKeysWithValues: elements))
    }
}

/// Coding key used by generated model types for keys that are not valid Swift
/// identifiers, such as `$state` and `$item`.
public struct DynamicCodingKey: CodingKey {
    public let stringValue: String
    public let intValue: Int?

    public init(_ string: String) {
        self.stringValue = string
        self.intValue = nil
    }

    public init?(stringValue: String) {
        self.stringValue = stringValue
        self.intValue = nil
    }

    public init?(intValue: Int) {
        self.stringValue = String(intValue)
        self.intValue = intValue
    }
}

extension Dictionary where Key == String, Value == JSONValue {
    /// Reads a string prop, or `nil` when absent or a different JSON type.
    public func string(_ key: String) -> String? { self[key]?.stringValue }

    /// Reads a string prop, falling back to a default.
    public func string(_ key: String, default fallback: String) -> String {
        self[key]?.stringValue ?? fallback
    }

    /// Reads a numeric prop, or `nil` when absent or a different JSON type.
    public func number(_ key: String) -> Double? { self[key]?.doubleValue }

    /// Reads a Boolean prop, or `nil` when absent or a different JSON type.
    public func bool(_ key: String) -> Bool? { self[key]?.boolValue }

    /// Reads an array of strings, skipping elements that are not strings.
    public func strings(_ key: String) -> [String] {
        self[key]?.arrayValue?.compactMap(\.stringValue) ?? []
    }

    /// Reads an object prop, or `nil` when absent or a different JSON type.
    public func object(_ key: String) -> [String: JSONValue]? { self[key]?.objectValue }
}
