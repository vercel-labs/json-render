import Foundation

/// Names for `$computed` expressions.
public typealias ComputedFunction = @Sendable ([String: JSONValue]) -> JSONValue

/// A custom `$`-prefixed prop expression. Built-in expression keys always take
/// precedence, matching core's `defineDirective` rules.
public struct Directive: Sendable {
    public let name: String
    public let resolve: @Sendable (JSONValue, PropResolutionContext) -> JSONValue

    public init(name: String, resolve: @escaping @Sendable (JSONValue, PropResolutionContext) -> JSONValue) {
        precondition(name.hasPrefix("$"), "Directive names start with \"$\": got \"\(name)\"")
        precondition(!PropExpressionKeys.builtIn.contains(name), "Directive name \"\(name)\" conflicts with a built-in expression")
        self.name = name
        self.resolve = resolve
    }
}

/// Context for resolving prop expressions, mirroring core's
/// `PropResolutionContext`.
public struct PropResolutionContext: Sendable {
    /// State and repeat scope used by expression resolution.
    public var visibility: VisibilityContext
    /// Absolute state path of the current repeat item, e.g. `/todos/0`.
    public var repeatBasePath: String?
    /// Named functions for `$computed`.
    public var functions: [String: ComputedFunction]
    /// Custom directives by name.
    public var directives: [String: Directive]

    public init(
        visibility: VisibilityContext,
        repeatBasePath: String? = nil,
        functions: [String: ComputedFunction] = [:],
        directives: [String: Directive] = [:]
    ) {
        self.visibility = visibility
        self.repeatBasePath = repeatBasePath
        self.functions = functions
        self.directives = directives
    }

    public init(
        stateModel: JSONValue,
        repeatItem: JSONValue? = nil,
        repeatIndex: Int? = nil,
        repeatBasePath: String? = nil,
        functions: [String: ComputedFunction] = [:],
        directives: [String: Directive] = [:]
    ) {
        self.init(
            visibility: VisibilityContext(
                stateModel: stateModel,
                repeatItem: repeatItem,
                repeatIndex: repeatIndex
            ),
            repeatBasePath: repeatBasePath,
            functions: functions,
            directives: directives
        )
    }

    /// The current state model.
    public var stateModel: JSONValue { visibility.stateModel }
    /// The current repeat item.
    public var repeatItem: JSONValue? { visibility.repeatItem }
    /// The current repeat index.
    public var repeatIndex: Int? { visibility.repeatIndex }
}

/// Built-in prop expression keys. Directives cannot shadow these.
public enum PropExpressionKeys {
    public static let builtIn: Set<String> = [
        "$state", "$item", "$index", "$bindState", "$bindItem", "$cond", "$computed", "$template",
    ]
}

/// Resolves a single prop value, which may be a literal or a dynamic
/// expression. Returns `nil` when the expression resolves to nothing, so the
/// caller can omit the prop rather than write null.
public func resolvePropValue(_ value: JSONValue, _ context: PropResolutionContext) -> JSONValue? {
    switch value {
    case .null:
        return .null
    case .string, .number, .bool:
        return value
    case .array(let values):
        return .array(values.map { resolvePropValue($0, context) ?? .null })
    case .object(let object):
        return resolveObjectExpression(object, context)
    }
}

private func resolveObjectExpression(
    _ object: [String: JSONValue],
    _ context: PropResolutionContext
) -> JSONValue? {
    if let path = object["$state"]?.stringValue {
        return getByPath(context.stateModel, path)
    }
    if let itemPath = object["$item"]?.stringValue {
        guard let repeatItem = context.repeatItem else { return nil }
        if itemPath.isEmpty { return repeatItem }
        return getByPath(repeatItem, itemPath)
    }
    if object["$index"] == .bool(true) {
        guard let index = context.repeatIndex else { return nil }
        return .number(Double(index))
    }
    if let path = object["$bindState"]?.stringValue {
        return getByPath(context.stateModel, path)
    }
    if let itemPath = object["$bindItem"]?.stringValue {
        guard let resolved = resolveBindItemPath(itemPath, context) else { return nil }
        return getByPath(context.stateModel, resolved)
    }
    if object["$cond"] != nil, let thenValue = object["$then"], let elseValue = object["$else"] {
        let condition = object["$cond"]?.decoded(as: VisibilityCondition.self)
        let result = evaluateVisibility(condition, context.visibility)
        return resolvePropValue(result ? thenValue : elseValue, context)
    }
    if let name = object["$computed"]?.stringValue {
        guard let function = context.functions[name] else {
            JSONRenderLog.warn("Unknown $computed function: \"\(name)\"")
            return nil
        }
        var resolvedArguments: [String: JSONValue] = [:]
        if let arguments = object["args"]?.objectValue {
            for (key, argument) in arguments {
                resolvedArguments[key] = resolvePropValue(argument, context) ?? .null
            }
        }
        return function(resolvedArguments)
    }
    if let template = object["$template"]?.stringValue {
        return .string(interpolateTemplate(template, context))
    }

    if let directive = findDirective(object, context.directives) {
        return directive.resolve(.object(object), context)
    }

    var resolved: [String: JSONValue] = [:]
    for (key, value) in object {
        if let value = resolvePropValue(value, context) {
            resolved[key] = value
        }
    }
    return .object(resolved)
}

private func findDirective(
    _ object: [String: JSONValue],
    _ directives: [String: Directive]
) -> Directive? {
    guard !directives.isEmpty else { return nil }
    var match: Directive?
    for (key, directive) in directives where object[key] != nil {
        if let match {
            JSONRenderLog.warn(
                "Ambiguous directive: object has multiple directive keys (\"\(match.name)\" and \"\(key)\")"
            )
            return match
        }
        match = directive
    }
    return match
}

private func interpolateTemplate(_ template: String, _ context: PropResolutionContext) -> String {
    var result = ""
    var remainder = Substring(template)
    while let start = remainder.range(of: "${") {
        result += remainder[..<start.lowerBound]
        let afterStart = remainder[start.upperBound...]
        guard let end = afterStart.firstIndex(of: "}") else {
            result += remainder[start.lowerBound...]
            return result
        }
        let rawPath = String(afterStart[..<end])
        result += templateValue(rawPath, context)
        remainder = afterStart[afterStart.index(after: end)...]
    }
    result += remainder
    return result
}

private func templateValue(_ rawPath: String, _ context: PropResolutionContext) -> String {
    if rawPath.hasPrefix("/") {
        return getByPath(context.stateModel, rawPath)?.displayString ?? ""
    }
    if let repeatItem = context.repeatItem, let value = getByPath(repeatItem, rawPath), !value.isNull {
        return value.displayString
    }
    return getByPath(context.stateModel, "/" + rawPath)?.displayString ?? ""
}

/// Resolves every expression in an element's props. Keys whose expression
/// resolves to nothing are omitted, which is how the React renderer ends up
/// with `undefined` props.
public func resolveElementProps(
    _ props: [String: JSONValue],
    _ context: PropResolutionContext
) -> [String: JSONValue] {
    var resolved: [String: JSONValue] = [:]
    for (key, value) in props {
        if let value = resolvePropValue(value, context) {
            resolved[key] = value
        }
    }
    return resolved
}

/// Scans raw props for `$bindState` and `$bindItem` expressions and returns
/// prop name to absolute state path for write-back.
public func resolveBindings(
    _ props: [String: JSONValue],
    _ context: PropResolutionContext
) -> [String: String]? {
    var bindings: [String: String]?
    for (key, value) in props {
        guard case .object(let object) = value else { continue }
        if let path = object["$bindState"]?.stringValue {
            bindings = bindings ?? [:]
            bindings?[key] = path
        } else if let itemPath = object["$bindItem"]?.stringValue,
                  let resolved = resolveBindItemPath(itemPath, context) {
            bindings = bindings ?? [:]
            bindings?[key] = resolved
        }
    }
    return bindings
}

/// Resolves an action parameter. `{ "$item": "field" }` becomes an absolute
/// state path so it can be passed to `setState`, `pushState`, or `removeState`;
/// `{ "$index": true }` becomes the current index.
public func resolveActionParam(_ value: JSONValue, _ context: PropResolutionContext) -> JSONValue? {
    if case .object(let object) = value {
        if let itemPath = object["$item"]?.stringValue {
            guard let path = resolveBindItemPath(itemPath, context) else { return nil }
            return .string(path)
        }
        if object["$index"] == .bool(true) {
            guard let index = context.repeatIndex else { return nil }
            return .number(Double(index))
        }
    }
    return resolvePropValue(value, context)
}

/// Resolves a `$bindItem` path to an absolute state path.
public func resolveBindItemPath(_ itemPath: String, _ context: PropResolutionContext) -> String? {
    guard let repeatBasePath = context.repeatBasePath else {
        JSONRenderLog.warn("$bindItem used outside repeat scope: \"\(itemPath)\"")
        return nil
    }
    if itemPath.isEmpty { return repeatBasePath }
    return repeatBasePath + "/" + itemPath
}
