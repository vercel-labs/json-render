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
    buildRenderTreeWithWatches(
        spec: spec,
        registry: registry,
        store: store,
        dispatcher: dispatcher,
        loading: loading,
        limits: limits
    ).tree
}

/// One build of a spec: the rendered tree and the watch entries the build saw.
///
/// The watches come from the same pass that renders the tree, so a state
/// change costs one build even when the spec watches state. They also include
/// elements that the build hid, which a walk over the rendered tree would miss.
public struct RenderTreeBuild<Render> {
    /// The root element, or nil when the spec renders nothing or a limit
    /// stopped the build.
    public let tree: RenderedElement<Render>?
    /// The watch entries of every element the build reached, in tree order.
    public let watches: [WatchRecord]
}

/// Builds the rendered tree and the watch entries for the spec.
///
/// An element's watch is recorded before its visibility is evaluated, matching
/// the React renderer, which runs the watch for a hidden element too. Children
/// of a hidden element do not contribute watches because they never mount.
public func buildRenderTreeWithWatches<Render>(
    spec: Spec,
    registry: RendererRegistry<Render>,
    store: StateStore,
    dispatcher: ActionDispatcher? = nil,
    loading: Bool = false,
    limits: RenderTreeLimits = .default
) -> RenderTreeBuild<Render> {
    guard !spec.root.isEmpty, spec.elements[spec.root] != nil else {
        return RenderTreeBuild(tree: nil, watches: [])
    }

    let budget = RenderTreeBudget(limits: limits)
    let watches = WatchCollector()
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
        budget: budget,
        watches: watches
    )

    // A partial tree is not a valid rendering of the spec. When a limit stops
    // the build, drop whatever was built and let the caller render nothing.
    guard !budget.isExhausted else {
        return RenderTreeBuild(tree: nil, watches: [])
    }
    return RenderTreeBuild(tree: tree, watches: watches.records)
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
    budget: RenderTreeBudget,
    watches: WatchCollector
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

    // Collect the watch before the visibility check: the React renderer runs
    // the watch effect of a hidden element too.
    watches.collect(key: key, element: element, scope: scope, state: state)

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
            budget: budget,
            watches: watches
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
            budget: budget,
            watches: watches
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
            budget: budget,
            watches: watches
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
    budget: RenderTreeBudget,
    watches: WatchCollector
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
            budget: budget,
            watches: watches
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
    budget: RenderTreeBudget,
    watches: WatchCollector
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
            budget: budget,
            watches: watches
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
///
/// The name avoids the `record` method that `XCTestCase` declares, which would
/// otherwise take precedence over an unqualified call in a test.
public func recordedElement<Render>(_ element: RenderedElement<Render>) -> RecordedElement {
    RecordedElement(
        component: element.component,
        props: element.props,
        children: element.children.isEmpty ? nil : element.children.map(recordedElement),
        slots: element.slots.isEmpty
            ? nil
            : element.slots.mapValues { $0.map(recordedElement) }
    )
}

// MARK: - Watch

extension Spec {
    /// Whether any element in the spec has a watch, so a caller can skip the
    /// watch pass for a spec that never watches state.
    public var hasWatches: Bool {
        elements.values.contains { $0.watch != nil }
    }
}

/// One watched state path on one rendered element.
public struct WatchRecord: Sendable {
    public let id: String
    public let path: String
    public let value: JSONValue?
    public let bindings: [ActionBindingList]
    public let scope: RepeatScope?

    /// An identity that tells two entries for the same element and path apart
    /// when the element renders inside a repeat.
    static func id(key: String, scope: RepeatScope?, path: String) -> String {
        "\(key)#\(scope?.basePath ?? "")/\(path)"
    }
}

/// Gathers the watch entries as a build walks the spec.
///
/// Collection happens during the build rather than over the rendered tree, so
/// an element whose `visible` condition hides it still contributes its watch.
final class WatchCollector {
    private(set) var records: [WatchRecord] = []

    func collect(key: String, element: UIElement, scope: RepeatScope?, state: JSONValue) {
        guard let watch = element.watch else { return }
        for (path, bindings) in watch {
            records.append(
                WatchRecord(
                    id: WatchRecord.id(key: key, scope: scope, path: path),
                    path: path,
                    value: getByPath(state, path),
                    bindings: [bindings],
                    scope: scope
                )
            )
        }
    }
}

/// Fires `watch` actions when a watched state path changes.
///
/// The first update records the current values without firing, matching the
/// React renderer, which skips the initial mount. Call `snapshot(_:)` when the
/// spec first renders so the first state change after that compares against
/// the initial values and fires.
///
/// A watch that writes the path it watches, such as `pushState` on its own
/// array, would otherwise dispatch forever: every append changes the watched
/// value, which starts another pass. Each pass can dispatch only from a budget
/// that is shared by the whole chain of state changes, so a spec cannot exhaust
/// the host's CPU or memory that way. The budget refills when a state change
/// arrives that the tracker's own actions did not cause, such as user input or
/// a streamed spec update.
///
/// The renderer schedules a pass for every state change, and an action can
/// change state before it suspends, so the next pass can arrive while the
/// current one is still awaiting that action. Passes run one at a time: a pass
/// that arrives during another replaces the waiting one and returns, and the
/// running pass takes it next. Running both at once would compare the store
/// against a version the running pass has not recorded yet, and the newer pass
/// would mistake the running pass's own writes for an external change and
/// refill the budget.
public final class WatchTracker {
    /// The default number of watch actions one chain of state changes may run.
    public static let defaultMaxCascadeDispatches = 64

    /// The most actions one chain of watch-driven state changes may dispatch.
    public let maxCascadeDispatches: Int

    private var remainingCascadeDispatches: Int
    private var warnedAboutCascade = false
    /// The store version left by the previous pass, so the next pass can tell
    /// whether its change came from an action this tracker dispatched.
    private var expectedVersion: Int?
    private var previous: [String: JSONValue?] = [:]
    private var hasSnapshot = false
    private let functions: [String: ComputedFunction]
    private let directives: [String: Directive]

    /// One pass waiting to run.
    private struct QueuedPass {
        let records: [WatchRecord]
        let dispatcher: ActionDispatcher
        let store: StateStore
    }

    /// Guards the pass queue so a caller on another thread cannot start a
    /// second pass. Only the pass that sets `isProcessing` runs the queue.
    private let queueLock = NSLock()
    private var queuedPass: QueuedPass?
    private var isProcessing = false

    /// - Parameters:
    ///   - functions: Named functions for `$computed` parameters, from the
    ///     registry, so a watch action resolves them like an event does.
    ///   - directives: Custom directives for the same reason.
    ///   - maxCascadeDispatches: The most watch actions one chain of
    ///     watch-driven state changes may run before the tracker stops.
    public init(
        functions: [String: ComputedFunction] = [:],
        directives: [String: Directive] = [:],
        maxCascadeDispatches: Int = WatchTracker.defaultMaxCascadeDispatches
    ) {
        self.functions = functions
        self.directives = directives
        self.maxCascadeDispatches = max(1, maxCascadeDispatches)
        self.remainingCascadeDispatches = max(1, maxCascadeDispatches)
    }

    /// Records the watched values of the initial render without running any
    /// watch actions, and starts a new chain with a full budget.
    public func snapshot(_ records: [WatchRecord]) {
        var next: [String: JSONValue?] = [:]
        for record in records {
            next[record.id] = record.value
        }
        previous = next
        hasSnapshot = true
        remainingCascadeDispatches = maxCascadeDispatches
        warnedAboutCascade = false
        expectedVersion = nil
    }

    /// Runs a watch pass for the given records.
    ///
    /// Only one pass runs at a time. If a pass is already running, this call
    /// replaces any pass that is waiting and returns, and the running pass
    /// picks up the newest records when it finishes. The renderer builds one
    /// pass per state change and does not await these calls, so the latest
    /// records are the ones that matter.
    public func process(
        _ records: [WatchRecord],
        dispatcher: ActionDispatcher,
        store: StateStore
    ) async {
        queueLock.lock()
        queuedPass = QueuedPass(records: records, dispatcher: dispatcher, store: store)
        if isProcessing {
            queueLock.unlock()
            return
        }
        isProcessing = true
        queueLock.unlock()

        while true {
            queueLock.lock()
            guard let pass = queuedPass else {
                isProcessing = false
                queueLock.unlock()
                return
            }
            queuedPass = nil
            queueLock.unlock()
            await runPass(pass)
        }
    }

    private func runPass(_ pass: QueuedPass) async {
        let records = pass.records
        let dispatcher = pass.dispatcher
        let store = pass.store

        defer { expectedVersion = store.version }

        if expectedVersion != store.version {
            // The change that triggered this pass did not come from an action
            // this tracker dispatched, so it starts a new chain and a full
            // budget.
            remainingCascadeDispatches = maxCascadeDispatches
            warnedAboutCascade = false
        }

        var next: [String: JSONValue?] = [:]

        // Record this pass's values before running the actions, so a state
        // change that lands while a slow action waits compares against them
        // instead of the values from before this pass.
        for record in records {
            next[record.id] = record.value
        }
        let wasSnapshot = hasSnapshot
        let prior = previous
        previous = next
        hasSnapshot = true
        guard wasSnapshot else { return }

        for record in records {
            // Values are compared structurally: a write to an unrelated path
            // does not change the value at this path, and an action that
            // writes an equal object back does not fire the watch again.
            guard let previousValue = prior[record.id], previousValue != record.value else { continue }

            let context = PropResolutionContext(
                stateModel: store.snapshot,
                repeatItem: record.scope?.item,
                repeatIndex: record.scope?.index,
                repeatBasePath: record.scope?.basePath,
                functions: functions,
                directives: directives
            )

            for list in record.bindings {
                for binding in list.bindings {
                    guard consumeCascadeDispatch() else { return }
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
    }

    /// Takes one dispatch from the budget shared by the current chain of state
    /// changes, and warns once when the chain has spent it.
    private func consumeCascadeDispatch() -> Bool {
        guard remainingCascadeDispatches > 0 else {
            if !warnedAboutCascade {
                warnedAboutCascade = true
                JSONRenderLog.warn(
                    "Stopped watch actions after \(maxCascadeDispatches) in one chain of state changes; the watched state keeps changing."
                )
            }
            return false
        }
        remainingCascadeDispatches -= 1
        return true
    }
}
