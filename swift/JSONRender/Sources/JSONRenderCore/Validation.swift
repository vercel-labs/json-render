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
/// reports that a validation walk stopped at a limit instead of finishing,
/// whether the walk itself or the number and size of its issues ran out of
/// budget.
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
    /// The most bytes the repeat context keys may hold, counted as they are
    /// built. The key holds the repeat base path, which grows by the `$item`
    /// name at every layer, so a long name repeated down a deep tree would
    /// otherwise allocate a large key per visit.
    public var maxContextKeyBytes: Int

    /// The most issues the validator reports.
    ///
    /// An element may reference one missing child thousands of times, and each
    /// reference is its own issue, so a small document can describe far more
    /// problems than a reader can use. When the count is reached the result
    /// carries one more issue that says the rest were not reported.
    public var maxIssues: Int

    /// The most bytes the reported issue messages may hold.
    ///
    /// Every message quotes text from the document. The names in a message are
    /// shortened, but a document with many problems still describes more
    /// message text than it holds itself.
    public var maxIssueBytes: Int

    /// The limits the validator uses when none are given.
    public static let `default` = ValidateSpecLimits()

    public init(
        maxDepth: Int = 100,
        maxVisits: Int = 20_000,
        maxContextKeyBytes: Int = 8_000_000,
        maxIssues: Int = 1_000,
        maxIssueBytes: Int = 1_000_000
    ) {
        self.maxDepth = max(1, maxDepth)
        self.maxVisits = max(1, maxVisits)
        self.maxContextKeyBytes = max(1, maxContextKeyBytes)
        self.maxIssues = max(1, maxIssues)
        self.maxIssueBytes = max(1, maxIssueBytes)
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
    private(set) var contextKeyBytes = 0
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

    /// Counts the size of a context key before it is built, and reports
    /// whether the walk may continue.
    func takeContextKey(bytes: Int) -> Bool {
        guard !stopped else { return false }
        contextKeyBytes += bytes
        guard contextKeyBytes <= limits.maxContextKeyBytes else {
            stopped = true
            return false
        }
        return true
    }
}

/// Collects the issues of one validation walk while keeping them bounded.
///
/// Every diagnostic quotes text from the document, and one element can
/// reference a missing child thousands of times, so the messages together
/// would otherwise copy far more text than the document holds. The collector
/// stops adding issues at a count or byte limit. The result then carries one
/// final issue that says the rest were not reported, so a shortened result
/// never reads as a clean spec.
///
/// That summary takes the severity of the issues it stands in for. Dropped
/// warnings stay warnings, so a spec whose only problems are unreachable
/// elements is still valid, as it is in core's `validateSpec`; a dropped error
/// keeps the spec invalid.
private struct SpecIssueCollector {
    private let limits: ValidateSpecLimits
    private(set) var issues: [SpecIssue] = []
    private var messageBytes = 0
    /// Whether an issue was dropped because the walk reached a limit.
    private(set) var dropped = false
    /// Whether a dropped issue was an error, which decides the severity of the
    /// summary and whether the spec is valid.
    private var droppedError = false

    init(limits: ValidateSpecLimits) {
        self.limits = limits
    }

    /// Adds one issue, or drops it when the diagnostics budget is spent.
    mutating func add(_ issue: SpecIssue) {
        let bytes = issue.message.utf8.count
        guard !dropped,
              issues.count < limits.maxIssues,
              messageBytes + bytes <= limits.maxIssueBytes
        else {
            dropped = true
            if issue.severity == .error {
                droppedError = true
            }
            return
        }
        issues.append(issue)
        messageBytes += bytes
    }

    /// The reported issues, with one summary issue when the budget cut them
    /// short.
    func finish() -> [SpecIssue] {
        guard dropped else { return issues }
        let severity: SpecIssueSeverity
        let subject: String
        if droppedError {
            severity = .error
            subject = "problems"
        } else {
            severity = .warning
            subject = "warnings"
        }
        return issues + [
            SpecIssue(
                severity: severity,
                message: "Spec has more \(subject) than the validator reports at once; the remaining \(subject) were not reported.",
                code: .specTooComplex
            )
        ]
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
    var issues = SpecIssueCollector(limits: options.limits)

    // 1. Root
    let root = rootObject["root"]?.stringValue ?? ""
    if root.isEmpty {
        issues.add(
            SpecIssue(severity: .error, message: "Spec has no root element defined.", code: .missingRoot)
        )
        return SpecValidationResult(valid: false, issues: issues.finish())
    }

    if elementsJSON[root] == nil {
        issues.add(
            SpecIssue(
                severity: .error,
                message: "Root element \"\(diagnosticName(root))\" not found in elements map.",
                code: .rootNotFound
            )
        )
    }

    // 2. Empty spec
    if elementsJSON.isEmpty {
        issues.add(
            SpecIssue(severity: .error, message: "Spec has no elements.", code: .emptySpec)
        )
        return SpecValidationResult(valid: false, issues: issues.finish())
    }

    // 3. Per-element checks
    for key in elementsJSON.keys.sorted() {
        guard let element = elementsJSON[key]?.objectValue else { continue }
        // Every message below quotes the key, so shorten it once rather than
        // once per problem the element has.
        let displayKey = diagnosticName(key)

        if let childKeys = element["children"]?.arrayValue {
            for child in childKeys.compactMap(\.stringValue) where elementsJSON[child] == nil {
                issues.add(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(displayKey)\" references child \"\(diagnosticName(child))\" which does not exist in the elements map.",
                        elementKey: key,
                        code: .missingChild
                    )
                )
            }
        }

        for slotName in (element["slots"]?.objectValue ?? [:]).keys.sorted() {
            let slotChildKeys = element["slots"]?[slotName]?.arrayValue ?? []
            for child in slotChildKeys.compactMap(\.stringValue) where elementsJSON[child] == nil {
                issues.add(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(displayKey)\" references child \"\(diagnosticName(child))\" in slot \"\(diagnosticName(slotName))\" which does not exist in the elements map.",
                        elementKey: key,
                        code: .missingChild
                    )
                )
            }
        }

        if element.keys.contains("repeat") {
            let children = element["children"]?.arrayValue ?? []
            if children.isEmpty {
                issues.add(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(displayKey)\" has \"repeat\" but no children. The repeated template must be a child element: add a child that renders one item (it may read fields with {\"$item\": \"field\"}).",
                        elementKey: key,
                        code: .repeatWithoutChildren
                    )
                )
            }
        }

        if let visible = element["visible"], !isValidVisibility(visible) {
            issues.add(
                SpecIssue(
                    severity: .error,
                    message: "Element \"\(displayKey)\" has an invalid \"visible\" condition: \(diagnosticName(JSONValue.encodedString(visible) ?? "null")). Valid forms: true, false, {\"$state\":\"/path\",\"eq\":value}, {\"$item\":\"field\",\"eq\":value}, {\"$index\":true,\"eq\":n}, an array of those (AND), or {\"$and\":[...]} / {\"$or\":[...]}. Use exactly one of $state, $item, or $index per condition object.",
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
                issues.add(
                    SpecIssue(
                        severity: .error,
                        message: fieldMessage(field, key: displayKey),
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

        // Charge the key before building it: it copies the whole repeat base
        // path, which grows at every layer.
        let keyBytes = key.utf8.count + (repeatBasePath?.utf8.count ?? 0) + 2
        guard budget.takeContextKey(bytes: keyBytes) else { return }
        let contextKey = "\(key)\u{0}\(repeatBasePath ?? "")\u{0}\(sampleAvailable)"
        guard !validatedContexts.contains(contextKey) else { return }
        validatedContexts.insert(contextKey)

        var childBasePath = repeatBasePath
        var childSampleAvailable = sampleAvailable

        if let repeatJSON = element["repeat"], let repeatObject = repeatJSON.objectValue {
            let rawStatePath = repeatObject["statePath"]

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
                // The path is quoted in this message only, so the quoted form
                // is built here and shortened: it comes from the document.
                let displayPath = rawStatePath.map { value -> String in
                    if let string = value.stringValue { return "\"\(diagnosticName(string))\"" }
                    return diagnosticName(JSONValue.encodedString(value) ?? "null")
                } ?? "null"
                issues.add(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(diagnosticName(key))\" uses relative repeat statePath \(displayPath) outside a repeat scope.",
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
                issues.add(
                    SpecIssue(
                        severity: .error,
                        message: "Element \"\(diagnosticName(key))\" repeats over \"\(diagnosticName(statePath))\" but state\(detail). Repeat statePath must reference an array in state; add sample items to state at that path.",
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
            "Spec validation stopped at a limit; part of the spec was not validated."
        )
        issues.add(
            SpecIssue(
                severity: .error,
                message: "Spec is too large to validate: the walk stopped at its depth, visit, or context size limit.",
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
            issues.add(
                SpecIssue(
                    severity: .warning,
                    message: "Element \"\(diagnosticName(key))\" is not reachable from root \"\(diagnosticName(root))\".",
                    elementKey: key,
                    code: .orphanedElement
                )
            )
        }
    }

    if issues.dropped {
        JSONRenderLog.warn(
            "Spec validation stopped reporting issues at its count or size limit; the rest were not reported."
        )
    }

    let reported = issues.finish()
    let valid = !reported.contains { $0.severity == .error }
    return SpecValidationResult(valid: valid, issues: reported)
}

/// The most bytes of a spec-supplied name to quote in a diagnostic.
///
/// The keys, paths, and values in a document are arbitrary text, so quoting
/// one in full would let a document make every diagnostic it describes as
/// large as that text.
private let maxDiagnosticNameBytes = 120

/// A spec-supplied name shortened for a diagnostic message.
private func diagnosticName(_ name: String) -> String {
    guard name.utf8.count > maxDiagnosticNameBytes else { return name }
    return String(decoding: name.utf8.prefix(maxDiagnosticNameBytes), as: UTF8.self) + "..."
}

private func fieldMessage(_ field: String, key displayKey: String) -> String {
    switch field {
    case "visible":
        return "Element \"\(displayKey)\" has \"visible\" inside \"props\". It should be a top-level field on the element (sibling of type/props/children)."
    case "on":
        return "Element \"\(displayKey)\" has \"on\" inside \"props\". It should be a top-level field on the element (sibling of type/props/children)."
    case "repeat":
        return "Element \"\(displayKey)\" has \"repeat\" inside \"props\". It should be a top-level field on the element (sibling of type/props/children)."
    default:
        return "Element \"\(displayKey)\" has \"watch\" inside \"props\". It should be a top-level field on the element (sibling of type/props/children)."
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
