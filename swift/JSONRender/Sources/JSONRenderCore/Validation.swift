import Foundation

/// Severity of a structural spec problem.
public enum SpecIssueSeverity: String, Codable, Sendable, CaseIterable {
    case error
    case warning
}

/// Machine-readable spec issue codes, matching `@json-render/core`'s
/// `SpecIssue["code"]` union.
///
/// `specTooComplex` is the one code the Swift validator adds on its own: it
/// reports that the walk stopped at a limit instead of finishing.
public enum SpecIssueCode: String, Codable, Sendable, CaseIterable {
    case missingRoot = "missing_root"
    case rootNotFound = "root_not_found"
    case missingChild = "missing_child"
    case invalidVisible = "invalid_visible"
    case repeatWithoutChildren = "repeat_without_children"
    case repeatItemOutsideScope = "repeat_item_outside_scope"
    case repeatStateMismatch = "repeat_state_mismatch"
    case visibleInProps = "visible_in_props"
    case orphanedElement = "orphaned_element"
    case emptySpec = "empty_spec"
    case onInProps = "on_in_props"
    case repeatInProps = "repeat_in_props"
    case watchInProps = "watch_in_props"
    case specTooComplex = "spec_too_complex"
}

/// One structural problem in a spec.
public struct SpecIssue: Equatable, Sendable {
    public var severity: SpecIssueSeverity
    public var message: String
    public var elementKey: String?
    public var code: SpecIssueCode

    public init(
        severity: SpecIssueSeverity,
        message: String,
        elementKey: String? = nil,
        code: SpecIssueCode
    ) {
        self.severity = severity
        self.message = message
        self.elementKey = elementKey
        self.code = code
    }
}

/// The result of structural spec validation.
public struct SpecValidationResult: Equatable, Sendable {
    public var valid: Bool
    public var issues: [SpecIssue]

    public init(valid: Bool, issues: [SpecIssue]) {
        self.valid = valid
        self.issues = issues
    }
}

/// Limits that bound one validation walk.
///
/// The walk follows repeat scopes down the tree, and each layer can give every
/// branch a fresh context when its repeat path is relative to the item. A
/// small spec can then describe far more distinct contexts than elements, so
/// the walk needs the same kind of budget the rendered tree build uses. When a
/// limit is reached the walk stops and the result reports that part of the
/// spec was not validated.
public struct ValidateSpecLimits: Equatable, Sendable {
    /// The deepest element nesting the walk follows.
    public var maxDepth: Int
    /// The most element visits the walk makes.
    public var maxVisits: Int
    /// The most distinct repeat contexts the walk tracks.
    public var maxContexts: Int

    /// The limits the validator uses when none are given.
    public static let `default` = ValidateSpecLimits()

    public init(maxDepth: Int = 100, maxVisits: Int = 20_000, maxContexts: Int = 4_000) {
        self.maxDepth = max(1, maxDepth)
        self.maxVisits = max(1, maxVisits)
        self.maxContexts = max(1, maxContexts)
    }
}

/// Options for `validateSpec`.
public struct ValidateSpecOptions: Sendable {
    /// Also report elements that the root cannot reach.
    public var checkOrphans: Bool
    /// Bounds for the walk over repeat scopes.
    public var limits: ValidateSpecLimits

    public init(checkOrphans: Bool = false, limits: ValidateSpecLimits = .default) {
        self.checkOrphans = checkOrphans
        self.limits = limits
    }
}

/// Tracks one validation walk's use of `ValidateSpecLimits`.
private final class ValidationBudget {
    let limits: ValidateSpecLimits
    private(set) var visits = 0
    private(set) var contexts = 0
    /// Whether the walk stopped because it reached a limit.
    private(set) var stopped = false

    init(limits: ValidateSpecLimits) {
        self.limits = limits
    }

    /// Counts a visit at `depth`, and reports whether the walk may continue.
    func visit(depth: Int) -> Bool {
        guard !stopped else { return false }
        guard depth <= limits.maxDepth, visits < limits.maxVisits else {
            stopped = true
            return false
        }
        visits += 1
        return true
    }

    /// Counts one new repeat context, and reports whether the walk may
    /// continue.
    func takeContext() -> Bool {
        guard !stopped else { return false }
        guard contexts < limits.maxContexts else {
            stopped = true
            return false
        }
        contexts += 1
        return true
    }
}

/// Validates a decoded spec. Runs the same checks as core's `validateSpec`.
public func validateSpec(_ spec: Spec, options: ValidateSpecOptions = ValidateSpecOptions()) -> SpecValidationResult {
    validateSpecJSON(spec.jsonValue, options: options)
}

/// Validates a spec's JSON form. Use this when the source document may contain
/// malformed conditions, because the decoded model drops details such as an
/// object that mixes `$state` and `$item`.
public func validateSpecJSON(
    _ json: JSONValue,
    options: ValidateSpecOptions = ValidateSpecOptions()
) -> SpecValidationResult {
    guard case .object(let rootObject) = json else {
        return SpecValidationResult(
            valid: false,
            issues: [
                SpecIssue(severity: .error, message: "Spec has no root element defined.", code: .missingRoot),
            ]
        )
    }

    let elementsJSON = rootObject["elements"]?.objectValue ?? [:]
    var issues: [SpecIssue] = []

    // 1. Root
    let root = rootObject["root"]?.stringValue ?? ""
    if root.isEmpty {
        issues.append(
            SpecIssue(severity: .error, message: "Spec has no root element defined.", code: .missingRoot)
        )
        return SpecValidationResult(valid: false, issues: issues)
    }

    if elementsJSON[root] == nil {
        issues.append(
            SpecIssue(
                severity: .error,
                message: "Root element \"\(root)\" not found in elements map.",
                code: .rootNotFound
            )
        )
    }

    // 2. Empty spec
    if elementsJSON.isEmpty {
        issues.append(
            SpecIssue(severity: .error, message: "Spec has no elements.", code: .emptySpec)
        )
        return SpecValidationResult(valid: false, issues: issues)
    }

    // 3. Per-element checks
    for key in elementsJSON.keys.sorted() {
        guard let element = elementsJSON[key]?.objectValue else { continue }

        if let childKeys = element["children"]?.arrayValue {
            for child in childKeys.compactMap(\.stringValue) where elementsJSON[child] == nil {
                issues.append(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(key)\" references child \"\(child)\" which does not exist in the elements map.",
                        elementKey: key,
                        code: .missingChild
                    )
                )
            }
        }

        for slotName in (element["slots"]?.objectValue ?? [:]).keys.sorted() {
            let slotChildKeys = element["slots"]?[slotName]?.arrayValue ?? []
            for child in slotChildKeys.compactMap(\.stringValue) where elementsJSON[child] == nil {
                issues.append(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(key)\" references child \"\(child)\" in slot \"\(slotName)\" which does not exist in the elements map.",
                        elementKey: key,
                        code: .missingChild
                    )
                )
            }
        }

        if element.keys.contains("repeat") {
            let children = element["children"]?.arrayValue ?? []
            if children.isEmpty {
                issues.append(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(key)\" has \"repeat\" but no children. The repeated template must be a child element: add a child that renders one item (it may read fields with {\"$item\": \"field\"}).",
                        elementKey: key,
                        code: .repeatWithoutChildren
                    )
                )
            }
        }

        if let visible = element["visible"], !isValidVisibility(visible) {
            issues.append(
                SpecIssue(
                    severity: .error,
                    message: "Element \"\(key)\" has an invalid \"visible\" condition: \(JSONValue.encodedString(visible) ?? "null"). Valid forms: true, false, {\"$state\":\"/path\",\"eq\":value}, {\"$item\":\"field\",\"eq\":value}, {\"$index\":true,\"eq\":n}, an array of those (AND), or {\"$and\":[...]} / {\"$or\":[...]}. Use exactly one of $state, $item, or $index per condition object.",
                    elementKey: key,
                    code: .invalidVisible
                )
            )
        }

        if let props = element["props"]?.objectValue {
            let misplaced: [(String, SpecIssueCode)] = [
                ("visible", .visibleInProps),
                ("on", .onInProps),
                ("repeat", .repeatInProps),
                ("watch", .watchInProps),
            ]
            for (field, code) in misplaced where props.keys.contains(field) {
                issues.append(
                    SpecIssue(
                        severity: .error,
                        message: fieldMessage(field, key: key),
                        elementKey: key,
                        code: code
                    )
                )
            }
        }
    }

    // 4. Repeat paths, following repeat scopes down the tree
    var validatedKeys: Set<String> = []
    var validatedContexts: Set<String> = []
    let budget = ValidationBudget(limits: options.limits)

    func validateRepeatPaths(
        _ key: String,
        repeatBasePath: String?,
        sampleAvailable: Bool,
        ancestors: Set<String>,
        depth: Int
    ) {
        guard budget.visit(depth: depth) else { return }
        guard !ancestors.contains(key), let element = elementsJSON[key]?.objectValue else { return }
        validatedKeys.insert(key)

        let contextKey = "\(key)\u{0}\(repeatBasePath ?? "")\u{0}\(sampleAvailable)"
        guard !validatedContexts.contains(contextKey) else { return }
        guard budget.takeContext() else { return }
        validatedContexts.insert(contextKey)

        var childBasePath = repeatBasePath
        var childSampleAvailable = sampleAvailable

        if let repeatJSON = element["repeat"], let repeatObject = repeatJSON.objectValue {
            let rawStatePath = repeatObject["statePath"]
            let displayPath = rawStatePath.map { value -> String in
                if let string = value.stringValue { return "\"\(string)\"" }
                return JSONValue.encodedString(value) ?? "null"
            } ?? "null"

            var statePath: String?
            var isAbsolutePath = false
            if let absolute = rawStatePath?.stringValue {
                statePath = absolute
                isAbsolutePath = true
            } else if let item = rawStatePath?.objectValue?["$item"]?.stringValue,
                      let basePath = repeatBasePath {
                statePath = item.isEmpty || item == "/" ? basePath : joinStatePath(basePath, item)
            }

            guard let statePath else {
                issues.append(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(key)\" uses relative repeat statePath \(displayPath) outside a repeat scope.",
                        elementKey: key,
                        code: .repeatItemOutsideScope
                    )
                )
                childBasePath = nil
                childSampleAvailable = false
                let nextAncestors = ancestors.union([key])
                for childKey in childKeys(of: element) {
                    validateRepeatPaths(
                        childKey,
                        repeatBasePath: nil,
                        sampleAvailable: false,
                        ancestors: nextAncestors,
                        depth: depth + 1
                    )
                }
                for slotChildKey in slotChildKeys(of: element) {
                    validateRepeatPaths(
                        slotChildKey,
                        repeatBasePath: repeatBasePath,
                        sampleAvailable: sampleAvailable,
                        ancestors: nextAncestors,
                        depth: depth + 1
                    )
                }
                return
            }

            let state = rootObject["state"]
            let canCheckSample = state != nil && (isAbsolutePath || sampleAvailable)
            let value = canCheckSample ? getByPath(state, statePath) : nil

            if canCheckSample, value?.arrayValue == nil {
                let detail = value == nil ? " has no value there" : " has a \(jsTypeName(value)) there"
                issues.append(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(key)\" repeats over \"\(statePath)\" but state\(detail). Repeat statePath must reference an array in state; add sample items to state at that path.",
                        elementKey: key,
                        code: .repeatStateMismatch
                    )
                )
            }

            childBasePath = resolveRepeatItemStatePath(statePath, index: 0)
            childSampleAvailable = canCheckSample && (value?.arrayValue?.isEmpty == false)
        }

        let nextAncestors = ancestors.union([key])
        for childKey in childKeys(of: element) {
            validateRepeatPaths(
                childKey,
                repeatBasePath: childBasePath,
                sampleAvailable: childSampleAvailable,
                ancestors: nextAncestors,
                depth: depth + 1
            )
        }
        for slotChildKey in slotChildKeys(of: element) {
            validateRepeatPaths(
                slotChildKey,
                repeatBasePath: repeatBasePath,
                sampleAvailable: sampleAvailable,
                ancestors: nextAncestors,
                depth: depth + 1
            )
        }
    }

    if elementsJSON[root] != nil {
        validateRepeatPaths(root, repeatBasePath: nil, sampleAvailable: true, ancestors: [], depth: 1)
    }
    for key in elementsJSON.keys.sorted() where !validatedKeys.contains(key) {
        validateRepeatPaths(key, repeatBasePath: nil, sampleAvailable: true, ancestors: [], depth: 1)
    }

    if budget.stopped {
        JSONRenderLog.warn(
            "Spec validation stopped at its depth or visit limit; part of the spec was not validated."
        )
        issues.append(
            SpecIssue(
                severity: .error,
                message: "Spec is too large to validate: the walk stopped at its depth, visit, or repeat-context limit.",
                code: .specTooComplex
            )
        )
    }

    // 5. Orphans
    if options.checkOrphans {
        var reachable: Set<String> = []
        func walk(_ key: String, depth: Int) {
            guard depth <= options.limits.maxDepth else { return }
            guard elementsJSON[key] != nil, !reachable.contains(key) else { return }
            reachable.insert(key)
            let element = elementsJSON[key]?.objectValue ?? [:]
            for childKey in childKeys(of: element) { walk(childKey, depth: depth + 1) }
            for slotChildKey in slotChildKeys(of: element) { walk(slotChildKey, depth: depth + 1) }
        }
        if elementsJSON[root] != nil { walk(root, depth: 1) }

        for key in elementsJSON.keys.sorted() where !reachable.contains(key) {
            issues.append(
                SpecIssue(
                    severity: .warning,
                    message: "Element \"\(key)\" is not reachable from root \"\(root)\".",
                    elementKey: key,
                    code: .orphanedElement
                )
            )
        }
    }

    let valid = !issues.contains { $0.severity == .error }
    return SpecValidationResult(valid: valid, issues: issues)
}

private func fieldMessage(_ field: String, key: String) -> String {
    switch field {
    case "visible":
        return "Element \"\(key)\" has \"visible\" inside \"props\". It should be a top-level field on the element (sibling of type/props/children)."
    case "on":
        return "Element \"\(key)\" has \"on\" inside \"props\". It should be a top-level field on the element (sibling of type/props/children)."
    case "repeat":
        return "Element \"\(key)\" has \"repeat\" inside \"props\". It should be a top-level field on the element (sibling of type/props/children)."
    default:
        return "Element \"\(key)\" has \"watch\" inside \"props\". It should be a top-level field on the element (sibling of type/props/children)."
    }
}

private func childKeys(of element: [String: JSONValue]) -> [String] {
    (element["children"]?.arrayValue ?? []).compactMap(\.stringValue)
}

private func slotChildKeys(of element: [String: JSONValue]) -> [String] {
    let slots = element["slots"]?.objectValue ?? [:]
    return slots.keys.sorted().flatMap { (slots[$0]?.arrayValue ?? []).compactMap(\.stringValue) }
}

/// The `typeof` name JavaScript prints in the repeat mismatch message.
private func jsTypeName(_ value: JSONValue?) -> String {
    guard let value else { return "undefined" }
    switch value {
    case .string: return "string"
    case .number: return "number"
    case .bool: return "boolean"
    case .array, .object, .null: return "object"
    }
}

// MARK: - Strict visibility shape

/// Validates the strict visibility shape from core: each condition object has
/// exactly one of `$state`, `$item`, or `$index`, only known operator keys, and
/// no mixed or unknown keys.
public func isValidVisibility(_ value: JSONValue) -> Bool {
    switch value {
    case .bool:
        return true
    case .array(let conditions):
        return conditions.allSatisfy(isValidSingleCondition)
    case .object(let object):
        if object.count == 1, let and = object["$and"]?.arrayValue {
            return and.allSatisfy(isValidVisibility)
        }
        if object.count == 1, let or = object["$or"]?.arrayValue {
            return or.allSatisfy(isValidVisibility)
        }
        return isValidSingleCondition(object)
    default:
        return false
    }
}

private func isValidSingleCondition(_ value: JSONValue) -> Bool {
    guard case .object(let object) = value else { return false }
    return isValidSingleCondition(object)
}

private func isValidSingleCondition(_ object: [String: JSONValue]) -> Bool {
    let allowedKeys: Set<String> = ["$state", "$item", "$index", "eq", "neq", "gt", "gte", "lt", "lte", "not"]

    var sources = 0
    if let state = object["$state"] {
        guard state.stringValue != nil else { return false }
        sources += 1
    }
    if let item = object["$item"] {
        guard item.stringValue != nil else { return false }
        sources += 1
    }
    if let index = object["$index"] {
        guard index == .bool(true) else { return false }
        sources += 1
    }
    guard sources == 1 else { return false }

    for key in object.keys where !allowedKeys.contains(key) {
        return false
    }

    for operatorKey in ["gt", "gte", "lt", "lte"] {
        guard let operand = object[operatorKey] else { continue }
        switch operand {
        case .number:
            continue
        case .object(let reference):
            guard reference.count == 1, reference["$state"]?.stringValue != nil else { return false }
        default:
            return false
        }
    }

    if let not = object["not"], not != .bool(true) {
        return false
    }

    return true
}
