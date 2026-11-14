import Foundation

/// Names for `$computed` expressions.
public typealias ComputedFunction = @Sendable ([String: JSONValue]) -> JSONValue

/// The most characters a `$template` expands to by default.
///
/// A template can repeat a state value, as `"${/x}${/x}"` does, and a watch
/// that writes the result back to the path it watches doubles it on every
/// pass. Bounding the output keeps one template from growing the state until
/// the app runs out of memory.
public let defaultTemplateOutputLimit = 1_000_000

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
    /// The most characters a `$template` may expand to.
    public var templateOutputLimit: Int

    public init(
        visibility: VisibilityContext,
        repeatBasePath: String? = nil,
        functions: [String: ComputedFunction] = [:],
        directives: [String: Directive] = [:],
        templateOutputLimit: Int = defaultTemplateOutputLimit
    ) {
        self.visibility = visibility
        self.repeatBasePath = repeatBasePath
        self.functions = functions
        self.directives = directives
        self.templateOutputLimit = templateOutputLimit
    }

    public init(
        stateModel: JSONValue,
        repeatItem: JSONValue? = nil,
        repeatIndex: Int? = nil,
        repeatBasePath: String? = nil,
        functions: [String: ComputedFunction] = [:],
        directives: [String: Directive] = [:],
        templateOutputLimit: Int = defaultTemplateOutputLimit
    ) {
        self.init(
            visibility: VisibilityContext(
                stateModel: stateModel,
                repeatItem: repeatItem,
                repeatIndex: repeatIndex
            ),
            repeatBasePath: repeatBasePath,
            functions: functions,
            directives: directives,
            templateOutputLimit: templateOutputLimit
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
    interpolatePaths(template, limit: context.templateOutputLimit) { path in
        templateValue(path, context)
    }
}

/// Replaces each `${path}` in a string with `value(path)`.
///
/// Matches core's `/\$\{([^}]+)\}/g`: a reference needs at least one character
/// between the braces, so `${}` and an unterminated `${` stay as written. Prop
/// templates and confirm titles share this loop so the two stay in step.
///
/// The result stops at `limit` characters and warns when it is cut short.
/// Without a limit, a template that repeats a state value grows the string on
/// every expansion, and a watch that writes the result back to that path turns
/// that into an unbounded loop.
func interpolatePaths(
    _ template: String,
    limit: Int = defaultTemplateOutputLimit,
    value: (String) -> String
) -> String {
    var result = ""
    var length = 0
    var truncated = false

    func append(_ text: Substring) {
        guard !truncated else { return }
        let remaining = limit - length
        guard remaining > 0 else {
            truncated = true
            return
        }
        if text.count <= remaining {
            result += text
            length += text.count
        } else {
            result += text.prefix(remaining)
            length = limit
            truncated = true
        }
    }

    var remainder = Substring(template)
    // Stop reading references once the output fills, so a template past the
    // limit does not keep resolving values it will discard.
    search: while !truncated, let start = remainder.range(of: "${") {
        append(remainder[..<start.lowerBound])
        let afterStart = remainder[start.upperBound...]
        guard let end = afterStart.firstIndex(of: "}") else {
            // An unterminated reference stays as written.
            append(remainder[start.lowerBound...])
            remainder = afterStart[afterStart.endIndex...]
            break search
        }
        if end == afterStart.startIndex {
            // `${}` is not a reference; keep it and keep scanning.
            append(Substring("${}"))
            remainder = afterStart[afterStart.index(after: end)...]
            continue
        }
        append(Substring(value(String(afterStart[..<end]))))
        remainder = afterStart[afterStart.index(after: end)...]
    }
    append(remainder)

    if truncated {
        JSONRenderLog.warn(
            "Template output stopped at the \(limit)-character limit. The rest of the template was dropped."
        )
    }
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
