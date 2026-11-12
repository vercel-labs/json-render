import Foundation

extension DynamicValue {
    /// The expression as a raw JSON value, so it can go through the generic
    /// prop and action resolvers.
    public var jsonValue: JSONValue {
        switch self {
        case .value(let value):
            return value
        case .state(let path):
            return .object(["$state": .string(path)])
        }
    }
}

extension ActionBindingList {
    /// The bindings in a list, whether the spec used one binding or an array.
    public var bindings: [ActionBinding] {
        switch self {
        case .actionBinding(let binding): return [binding]
        case .array(let bindings): return bindings
        }
    }
}

/// A rendered element and its rendered children. It carries the resolved props
/// and structure next to the platform content so tests can compare the tree
/// without inspecting views.
public struct RenderedElement<Render> {
    public let key: String
    public let component: String
    public let props: [String: JSONValue]
    public let bindings: [String: String]?
    public let children: [RenderedElement<Render>]
    public let slots: [String: [RenderedElement<Render>]]
    /// The source element, kept for watch paths and slot metadata.
    public let element: UIElement
    public let scope: RepeatScope?
    public let content: Render

    /// A stable identity for the element within its parent: the element key,
    /// plus the item path for elements rendered by a repeat.
    public var id: String {
        guard let scope else { return key }
        return "\(key)@\(scope.basePath)"
    }
}

/// Builds the rendered tree for a spec.
///
/// The build is a pure function of the spec and the current state. State
/// changes rebuild the tree; views are cheap value descriptions on SwiftUI.
/// Unknown component types warn and drop their subtree, and missing children
/// warn and leave a gap, matching the React renderer.
///
/// `ancestors` guards against a spec whose children form a cycle, which would
/// otherwise recurse forever. Shared `limits` guard against a spec whose
/// elements reference the same children, which would otherwise expand
/// exponentially. A build that reaches a limit stops, warns once, and renders
/// nothing, matching the other spec problems that leave nothing to render.
public func buildRenderTree<Render>(
    spec: Spec,
    registry: RendererRegistry<Render>,
    store: StateStore,
    dispatcher: ActionDispatcher? = nil,
    loading: Bool = false,
    limits: RenderTreeLimits = .default
) -> RenderedElement<Render>? {
    guard !spec.root.isEmpty else { return nil }
    guard spec.elements[spec.root] != nil else { return nil }

    let budget = RenderTreeBudget(limits: limits)
    let tree = buildElement(
        key: spec.root,
        spec: spec,
        registry: registry,
        store: store,
        dispatcher: dispatcher,
        loading: loading,
        scope: nil,
        depth: 1,
        ancestors: [],
        budget: budget
    )

    // A partial tree is not a valid rendering of the spec. When a limit stops
    // the build, drop whatever was built and let the caller render nothing.
    return budget.isExhausted ? nil : tree
}

private func buildElement<Render>(
    key: String,
    spec: Spec,
    registry: RendererRegistry<Render>,
    store: StateStore,
    dispatcher: ActionDispatcher?,
    loading: Bool,
    scope: RepeatScope?,
    depth: Int,
    ancestors: Set<String>,
    budget: RenderTreeBudget
) -> RenderedElement<Render>? {
    guard budget.visit(depth: depth) else { return nil }

    guard let element = spec.elements[key] else {
        if !loading {
            JSONRenderLog.warn(
                "Missing element \"\(key)\" referenced as a child. This element will not render."
            )
        }
        return nil
    }

    guard !ancestors.contains(key) else {
        JSONRenderLog.warn("Element \"\(key)\" contains itself. Stopped at the cycle.")
        return nil
    }

    let state = store.snapshot

    // A repeat container's own `$item`/`$index` condition filters items rather
    // than hiding the container, unless the container is already inside a
    // repeat scope.
    let split = element.repeat != nil && scope == nil
    let containerVisibility = split ? splitRepeatVisibility(element.visible).container : element.visible
    let itemFilter = split ? splitRepeatVisibility(element.visible).itemFilter : nil

    let baseContext = PropResolutionContext(
        stateModel: state,
        repeatItem: scope?.item,
        repeatIndex: scope?.index,
        repeatBasePath: scope?.basePath,
        functions: registry.functions,
        directives: registry.directives
    )

    guard evaluateVisibility(containerVisibility, baseContext.visibility) else {
        return nil
    }

    guard registry.canRender(element.type) else {
        JSONRenderLog.warn("No renderer for component type: \(element.type)")
        return nil
    }

    let props = resolveElementProps(element.props, baseContext)
    let bindings = resolveBindings(element.props, baseContext)

    var nextAncestors = ancestors
    nextAncestors.insert(key)

    let children: [RenderedElement<Render>]
    if element.repeat != nil {
        children = buildRepeatChildren(
            element: element,
            spec: spec,
            registry: registry,
            store: store,
            dispatcher: dispatcher,
            loading: loading,
            scope: scope,
            itemFilter: itemFilter,
            state: state,
            depth: depth + 1,
            ancestors: nextAncestors,
            budget: budget
        )
    } else {
        children = buildChildKeys(
            element.children ?? [],
            spec: spec,
            registry: registry,
            store: store,
            dispatcher: dispatcher,
            loading: loading,
            scope: scope,
            depth: depth + 1,
            ancestors: nextAncestors,
            budget: budget
        )
    }

    var slots: [String: [RenderedElement<Render>]] = [:]
    for (slotName, childKeys) in element.slots ?? [:] {
        if slotName == "default" {
            JSONRenderLog.warn(
                "Component \"\(element.type)\" uses slots.default. Use children for default slot content."
            )
        }
        slots[slotName] = buildChildKeys(
            childKeys,
            spec: spec,
            registry: registry,
            store: store,
            dispatcher: dispatcher,
            loading: loading,
            scope: scope,
            depth: depth + 1,
            ancestors: nextAncestors,
            budget: budget
        )
    }

    guard budget.renderNode() else { return nil }

    let emit = makeEmit(element: element, scope: scope, store: store, dispatcher: dispatcher, registry: registry)

    let context = ComponentRenderContext(
        element: UIElement(
            type: element.type,
            props: props,
            children: element.children,
            slots: element.slots,
            visible: element.visible,
            on: element.on,
            repeat: element.repeat,
            watch: element.watch
        ),
        key: key,
        props: props,
        bindings: bindings,
        children: children.map(\.content),
        childIDs: children.map(\.id),
        slots: slots.mapValues { $0.map(\.content) },
        scope: scope,
        loading: loading,
        emit: emit,
        on: { eventName in
            makeEventHandle(element: element, eventName: eventName, emit: emit)
        },
        getState: { [store] path in store.get(path) },
        setState: { [store] path, value in store.set(path, value) }
    )

    guard let definition = registry.component(for: element.type) else {
        JSONRenderLog.warn("No renderer for component type: \(element.type)")
        return nil
    }

    return RenderedElement(
        key: key,
        component: element.type,
        props: props,
        bindings: bindings,
        children: children,
        slots: slots,
        element: element,
        scope: scope,
        content: definition.render(context)
    )
}

private func buildChildKeys<Render>(
    _ childKeys: [String],
    spec: Spec,
    registry: RendererRegistry<Render>,
    store: StateStore,
    dispatcher: ActionDispatcher?,
    loading: Bool,
    scope: RepeatScope?,
    depth: Int,
    ancestors: Set<String>,
    budget: RenderTreeBudget
) -> [RenderedElement<Render>] {
    var rendered: [RenderedElement<Render>] = []
    for childKey in childKeys {
        guard !budget.isExhausted else { break }
        if let child = buildElement(
            key: childKey,
            spec: spec,
            registry: registry,
            store: store,
            dispatcher: dispatcher,
            loading: loading,
            scope: scope,
            depth: depth,
            ancestors: ancestors,
            budget: budget
        ) {
            rendered.append(child)
        }
    }
    return rendered
}

private func buildRepeatChildren<Render>(
    element: UIElement,
    spec: Spec,
    registry: RendererRegistry<Render>,
    store: StateStore,
    dispatcher: ActionDispatcher?,
    loading: Bool,
    scope: RepeatScope?,
    itemFilter: VisibilityCondition?,
    state: JSONValue,
    depth: Int,
    ancestors: Set<String>,
    budget: RenderTreeBudget
) -> [RenderedElement<Render>] {
    guard let repeatConfig = element.repeat else { return [] }

    guard let statePath = resolveRepeatStatePath(repeatConfig.statePath, repeatBasePath: scope?.basePath) else {
        JSONRenderLog.warn("$item in repeat.statePath used outside of a repeat scope")
        return []
    }

    let items = getByPath(state, statePath)?.arrayValue ?? []

    var rendered: [RenderedElement<Render>] = []
    for (index, item) in items.enumerated() {
        guard !budget.isExhausted else { break }
        if let itemFilter {
            let filterContext = VisibilityContext(
                stateModel: state,
                repeatItem: item,
                repeatIndex: index
            )
            guard evaluateVisibility(itemFilter, filterContext) else { continue }
        }

        let itemScope = RepeatScope(
            item: item,
            index: index,
            basePath: resolveRepeatItemStatePath(statePath, index: index)
        )

        rendered.append(contentsOf: buildChildKeys(
            element.children ?? [],
            spec: spec,
            registry: registry,
            store: store,
            dispatcher: dispatcher,
            loading: loading,
            scope: itemScope,
            depth: depth,
            ancestors: ancestors,
            budget: budget
        ))
    }
    return rendered
}

private func makeEmit<Render>(
    element: UIElement,
    scope: RepeatScope?,
    store: StateStore,
    dispatcher: ActionDispatcher?,
    registry: RendererRegistry<Render>
) -> (String) async -> Void {
    guard let on = element.on, let dispatcher else {
        return { _ in }
    }

    return { eventName in
        guard let list = on[eventName] else { return }
        for binding in list.bindings {
            guard let params = binding.params else {
                await dispatcher.dispatch(binding)
                continue
            }
            // Resolve against live state so a later action sees the writes from
            // an earlier one.
            let liveContext = PropResolutionContext(
                stateModel: store.snapshot,
                repeatItem: scope?.item,
                repeatIndex: scope?.index,
                repeatBasePath: scope?.basePath,
                functions: registry.functions,
                directives: registry.directives
            )
            var resolved: [String: JSONValue] = [:]
            for (key, value) in params {
                if let value = resolveActionParam(value.jsonValue, liveContext) {
                    resolved[key] = value
                }
            }
            await dispatcher.dispatch(binding, resolvedParams: resolved)
        }
    }
}

private func makeEventHandle(
    element: UIElement,
    eventName: String,
    emit: @escaping (String) async -> Void
) -> EventHandle {
    guard let list = element.on?[eventName] else {
        return EventHandle()
    }
    return EventHandle(
        isBound: true,
        shouldPreventDefault: list.bindings.contains { $0.preventDefault == true },
        emit: { await emit(eventName) }
    )
}

// MARK: - Recording for conformance tests

/// The part of a rendered tree that the conformance tests compare: component
/// name, resolved props, children, and slot children.
public struct RecordedElement: Codable, Equatable, Sendable {
    public var component: String
    public var props: [String: JSONValue]
    public var children: [RecordedElement]?
    public var slots: [String: [RecordedElement]]?

    public init(
        component: String,
        props: [String: JSONValue],
        children: [RecordedElement]? = nil,
        slots: [String: [RecordedElement]]? = nil
    ) {
        self.component = component
        self.props = props
        self.children = children
        self.slots = slots
    }

    enum CodingKeys: String, CodingKey {
        case component
        case props
        case children
        case slots
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.component = try container.decode(String.self, forKey: .component)
        self.props = try container.decode([String: JSONValue].self, forKey: .props)
        self.children = try container.decodeIfPresent([RecordedElement].self, forKey: .children)
        self.slots = try container.decodeIfPresent([String: [RecordedElement]].self, forKey: .slots)
    }
}

/// Projects a rendered tree onto the recordable shape.
public func record<Render>(_ element: RenderedElement<Render>) -> RecordedElement {
    RecordedElement(
        component: element.component,
        props: element.props,
        children: element.children.isEmpty ? nil : element.children.map(record),
        slots: element.slots.isEmpty
            ? nil
            : element.slots.mapValues { $0.map(record) }
    )
}

// MARK: - Watch

/// One watched state path on one rendered element.
public struct WatchRecord: Sendable {
    public let id: String
    public let path: String
    public let value: JSONValue?
    public let bindings: [ActionBindingList]
    public let scope: RepeatScope?
}

/// Collects the watch entries of a rendered tree against a state snapshot.
public func watchRecords<Render>(_ tree: RenderedElement<Render>, state: JSONValue) -> [WatchRecord] {
    var records: [WatchRecord] = []

    func visit(_ element: RenderedElement<Render>) {
        if let watch = element.element.watch {
            for (path, bindings) in watch {
                records.append(
                    WatchRecord(
                        id: "\(element.key)#\(element.scope?.basePath ?? "")/\(path)",
                        path: path,
                        value: getByPath(state, path),
                        bindings: [bindings],
                        scope: element.scope
                    )
                )
            }
        }
        for child in element.children { visit(child) }
        for slotChildren in element.slots.values {
            for child in slotChildren { visit(child) }
        }
    }

    visit(tree)
    return records
}

/// Fires `watch` actions when a watched state path changes.
///
/// The first update records the current values without firing, matching the
/// React renderer, which skips the initial mount. Call `snapshot(_:)` when the
/// tree first renders so the first state change after that compares against
/// the initial values and fires.
public final class WatchTracker {
    private var previous: [String: JSONValue?] = [:]
    private var hasSnapshot = false

    public init() {}

    /// Records the watched values of the initial render without running any
    /// watch actions.
    public func snapshot(_ records: [WatchRecord]) {
        var next: [String: JSONValue?] = [:]
        for record in records {
            next[record.id] = record.value
        }
        previous = next
        hasSnapshot = true
    }

    public func process(
        _ records: [WatchRecord],
        dispatcher: ActionDispatcher,
        store: StateStore
    ) async {
        var next: [String: JSONValue?] = [:]

        for record in records {
            next[record.id] = record.value
            guard hasSnapshot, let previousValue = previous[record.id] else { continue }
            guard !strictEquals(previousValue, record.value) else { continue }

            let context = PropResolutionContext(
                stateModel: store.snapshot,
                repeatItem: record.scope?.item,
                repeatIndex: record.scope?.index,
                repeatBasePath: record.scope?.basePath
            )

            for list in record.bindings {
                for binding in list.bindings {
                    var resolved: [String: JSONValue] = [:]
                    for (key, value) in binding.params ?? [:] {
                        if let value = resolveActionParam(value.jsonValue, context) {
                            resolved[key] = value
                        }
                    }
                    await dispatcher.dispatch(
                        binding,
                        resolvedParams: binding.params == nil ? nil : resolved
                    )
                }
            }
        }

        previous = next
        hasSnapshot = true
    }
}
