import Foundation

/// Context for evaluating visibility conditions, mirroring core's
/// `VisibilityContext`.
public struct VisibilityContext: Sendable {
    /// The full state model.
    public var stateModel: JSONValue
    /// The current repeat item, when inside a repeat scope.
    public var repeatItem: JSONValue?
    /// The current repeat array index, when inside a repeat scope.
    public var repeatIndex: Int?

    public init(stateModel: JSONValue, repeatItem: JSONValue? = nil, repeatIndex: Int? = nil) {
        self.stateModel = stateModel
        self.repeatItem = repeatItem
        self.repeatIndex = repeatIndex
    }

    public init(stateModel: [String: JSONValue], repeatItem: JSONValue? = nil, repeatIndex: Int? = nil) {
        self.init(stateModel: .object(stateModel), repeatItem: repeatItem, repeatIndex: repeatIndex)
    }
}

/// Evaluates a visibility condition. A missing condition is visible.
///
/// - `boolean` is the result.
/// - an array of single conditions is an implicit AND.
/// - `$and` and `$or` combine nested conditions.
/// - a single condition resolves its source and applies its operator, then
///   inverts the result when `not` is true.
public func evaluateVisibility(
    _ condition: VisibilityCondition?,
    _ context: VisibilityContext
) -> Bool {
    guard let condition else { return true }
    switch condition {
    case .bool(let value):
        return value
    case .singleCondition(let single):
        return evaluateCondition(single, context)
    case .array(let conditions):
        return conditions.allSatisfy { evaluateCondition($0, context) }
    case .andCondition(let group):
        return group.and.allSatisfy { evaluateVisibility($0, context) }
    case .orCondition(let group):
        return group.or.contains { evaluateVisibility($0, context) }
    }
}

/// Evaluates one condition against the context.
public func evaluateCondition(_ condition: SingleCondition, _ context: VisibilityContext) -> Bool {
    let value = conditionValue(condition, context)
    let result: Bool

    switch condition {
    case .stateCondition(let state):
        result = compare(value: value, eq: state.eq, neq: state.neq, gt: state.gt, gte: state.gte, lt: state.lt, lte: state.lte, not: state.not, context: context)
    case .itemCondition(let item):
        result = compare(value: value, eq: item.eq, neq: item.neq, gt: item.gt, gte: item.gte, lt: item.lt, lte: item.lte, not: item.not, context: context)
    case .indexCondition(let index):
        result = compare(value: value, eq: index.eq, neq: index.neq, gt: index.gt, gte: index.gte, lt: index.lt, lte: index.lte, not: index.not, context: context)
    }
    return result
}

private func compare(
    value: JSONValue?,
    eq: JSONValue?,
    neq: JSONValue?,
    gt: ComparisonValue?,
    gte: ComparisonValue?,
    lt: ComparisonValue?,
    lte: ComparisonValue?,
    not: Bool?,
    context: VisibilityContext
) -> Bool {
    var result: Bool
    if let eq {
        result = strictEquals(value, resolveComparisonValue(eq, context))
    } else if let neq {
        result = !strictEquals(value, resolveComparisonValue(neq, context))
    } else if let gt {
        result = compareNumbers(value, resolveComparisonValue(gt, context)) { $0 > $1 }
    } else if let gte {
        result = compareNumbers(value, resolveComparisonValue(gte, context)) { $0 >= $1 }
    } else if let lt {
        result = compareNumbers(value, resolveComparisonValue(lt, context)) { $0 < $1 }
    } else if let lte {
        result = compareNumbers(value, resolveComparisonValue(lte, context)) { $0 <= $1 }
    } else {
        result = value?.isTruthy ?? false
    }
    return not == true ? !result : result
}

/// Resolves the left-hand side of a condition.
func conditionValue(_ condition: SingleCondition, _ context: VisibilityContext) -> JSONValue? {
    switch condition {
    case .indexCondition:
        guard let index = context.repeatIndex else { return nil }
        return .number(Double(index))
    case .itemCondition(let item):
        guard let repeatItem = context.repeatItem else { return nil }
        if item.item.isEmpty { return repeatItem }
        return getByPath(repeatItem, item.item)
    case .stateCondition(let state):
        return getByPath(context.stateModel, state.state)
    }
}

private func resolveComparisonValue(_ value: JSONValue, _ context: VisibilityContext) -> JSONValue? {
    if case .object(let object) = value, let path = object["$state"]?.stringValue {
        return getByPath(context.stateModel, path)
    }
    return value
}

private func resolveComparisonValue(_ value: ComparisonValue, _ context: VisibilityContext) -> JSONValue? {
    switch value {
    case .number(let number): return .number(number)
    case .state(let path): return getByPath(context.stateModel, path)
    }
}

private func compareNumbers(
    _ value: JSONValue?,
    _ rhs: JSONValue?,
    _ comparison: (Double, Double) -> Bool
) -> Bool {
    guard let lhs = value?.doubleValue, let rhs = rhs?.doubleValue else { return false }
    return comparison(lhs, rhs)
}

/// JavaScript `===` for JSON values. Objects and arrays are compared by
/// reference there, so two structurally equal containers are never equal here.
func strictEquals(_ lhs: JSONValue?, _ rhs: JSONValue?) -> Bool {
    switch (lhs, rhs) {
    case (.none, .none):
        return true
    case (.some(.null), .some(.null)):
        return true
    case (.some(.string(let lhs)), .some(.string(let rhs))):
        return lhs == rhs
    case (.some(.number(let lhs)), .some(.number(let rhs))):
        return lhs == rhs
    case (.some(.bool(let lhs)), .some(.bool(let rhs))):
        return lhs == rhs
    default:
        return false
    }
}

/// True when a condition references the repeat item scope (`$item` or
/// `$index`) anywhere in its tree.
public func conditionUsesItemScope(_ condition: VisibilityCondition?) -> Bool {
    guard let condition else { return false }
    switch condition {
    case .bool:
        return false
    case .singleCondition(let single):
        switch single {
        case .itemCondition, .indexCondition: return true
        case .stateCondition: return false
        }
    case .array(let conditions):
        return conditions.contains { single in
            switch single {
            case .itemCondition, .indexCondition: return true
            case .stateCondition: return false
            }
        }
    case .andCondition(let group):
        return group.and.contains { conditionUsesItemScope($0) }
    case .orCondition(let group):
        return group.or.contains { conditionUsesItemScope($0) }
    }
}

/// Splits a repeat container's visible condition into a container gate and a
/// per-item filter, the way core's `splitRepeatVisibility` does. Top-level AND
/// structures partition cleanly. A single item-scoped condition or an `$or`
/// that mixes scopes becomes a per-item filter.
public func splitRepeatVisibility(_ condition: VisibilityCondition?) -> (
    container: VisibilityCondition?,
    itemFilter: VisibilityCondition?
) {
    guard let condition, conditionUsesItemScope(condition) else {
        return (condition, nil)
    }

    func partition(_ parts: [VisibilityCondition]) -> (VisibilityCondition?, VisibilityCondition?) {
        let container = parts.filter { !conditionUsesItemScope($0) }
        let items = parts.filter { conditionUsesItemScope($0) }
        return (
            container.isEmpty ? nil : .andCondition(AndCondition(and: container)),
            items.isEmpty ? nil : .andCondition(AndCondition(and: items))
        )
    }

    switch condition {
    case .array(let conditions):
        return partition(conditions.map { .singleCondition($0) })
    case .andCondition(let group):
        return partition(group.and)
    default:
        return (nil, condition)
    }
}
