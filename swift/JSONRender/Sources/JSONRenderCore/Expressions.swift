import Foundation

/// Names for `$computed` expressions.
public typealias ComputedFunction = @Sendable ([String: JSONValue]) -> JSONValue

/// The most Unicode scalars a `$template` expands to by default.
///
/// A template can repeat a state value, as `"${/x}${/x}"` does, and a watch
/// that writes the result back to the path it watches doubles it on every
/// pass. Bounding the output keeps one template from growing the state until
/// the app runs out of memory. Scalars are counted rather than characters,
/// because a long run of combining marks is a single character but can still
/// be megabytes.
public let defaultTemplateOutputLimit = 1_000_000

/// Bounds the bytes a group of template expansions may produce.
///
/// The renderer gives one of these to an element's prop resolution, so the
/// templates of that element cannot each expand to the whole remaining prop
/// budget. Access is not synchronized: a budget belongs to one synchronous
/// resolution pass.
final class ResolutionBudget: @unchecked Sendable {
    private let limit: Int
    private var used = 0
    /// Whether an expansion was cut short because the budget ran out.
    private(set) var isSpent = false

    init(limit: Int) {
        self.limit = max(0, limit)
    }

    /// The bytes the next expansion may produce.
    var remaining: Int {
        max(0, limit - used)
    }

    /// Counts what one expansion produced. `truncated` reports that the
    /// expansion was cut short by this budget, so the caller can stop instead
    /// of using or rendering partial data.
    func charge(bytes: Int, truncated: Bool) {
        used += max(0, bytes)
        if truncated { isSpent = true }
    }
}

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
    /// The most Unicode scalars a `$template` may expand to.
    public var templateOutputLimit: Int
    /// The shared budget this context's templates expand within, when a caller
    /// has one. The renderer sets it so the props of one build stay bounded.
    var expansionBudget: ResolutionBudget?

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
    guard let budget = context.expansionBudget else {
        return interpolatePaths(template, limit: context.templateOutputLimit) { path in
            templateValue(path, context)
        }
    }
    // A template cannot take more than the shared budget has left, and what it
    // produces is charged before the next one starts.
    let remaining = budget.remaining
    guard remaining > 0 else {
        budget.charge(bytes: 0, truncated: true)
        return ""
    }
    let cap = min(context.templateOutputLimit, remaining)
    let result = interpolatePathsReporting(template, limit: cap) { path in
        templateValue(path, context)
    }
    // A cut caused by the shared budget is reported once by the caller that
    // owns the budget; a template that hits its own limit keeps its warning.
    let cutByBudget = result.truncated && cap < context.templateOutputLimit
    budget.charge(bytes: result.text.utf8.count, truncated: cutByBudget)
    if result.truncated && !cutByBudget {
        warnTemplateTruncated(limit: context.templateOutputLimit)
    }
    return result.text
}

private func warnTemplateTruncated(limit: Int) {
    JSONRenderLog.warn(
        "Template output stopped at the \(limit)-scalar limit. The rest of the template was dropped."
    )
}

/// Replaces each `${path}` in a string with `value(path)`.
///
/// Matches core's `/\$\{([^}]+)\}/g`: a reference needs at least one character
/// between the braces, so `${}` and an unterminated `${` stay as written. Prop
/// templates and confirm titles share this loop so the two stay in step.
///
/// The result stops at `limit` Unicode scalars and warns when it is cut
/// short. Counting scalars rather than characters keeps the bound meaningful:
/// a long run of combining marks is one character but many scalars, so a
/// character count would let it through. Without a limit, a template that
/// repeats a state value grows the string on every expansion, and a watch that
/// writes the result back to that path turns that into an unbounded loop.
func interpolatePaths(
    _ template: String,
    limit: Int = defaultTemplateOutputLimit,
    value: (String) -> String
) -> String {
    let result = interpolatePathsReporting(template, limit: limit, value: value)
    if result.truncated {
        warnTemplateTruncated(limit: limit)
    }
    return result.text
}

/// One expanded template, with whether the limit cut it short.
struct ExpandedTemplate {
    var text: String
    var truncated: Bool
}

/// Replaces each `${path}` in a string with `value(path)`, without warning.
///
/// Callers that own a shared budget use the truncation flag to stop instead of
/// using or rendering partial output.
func interpolatePathsReporting(
    _ template: String,
    limit: Int,
    value: (String) -> String
) -> ExpandedTemplate {
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
        let scalars = text.unicodeScalars
        if scalars.count <= remaining {
            result += text
            length += scalars.count
        } else {
            result += String(scalars.prefix(remaining))
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

    return ExpandedTemplate(text: result, truncated: truncated)
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
