import Foundation

/// Repeat scope for one item of a repeated element, mirroring React's
/// `RepeatScopeProvider`.
public struct RepeatScope: Equatable, Sendable {
    public let item: JSONValue
    public let index: Int
    /// Absolute state path of the item, for example `/todos/0`.
    public let basePath: String

    public init(item: JSONValue, index: Int, basePath: String) {
        self.item = item
        self.index = index
        self.basePath = basePath
    }
}

/// Handle returned by `ComponentRenderContext.on(_:)`. It mirrors the React
/// renderer's `EventHandle` so a component can tell whether an event has a
/// binding and whether it should prevent the platform default.
public struct EventHandle {
    public let isBound: Bool
    public let shouldPreventDefault: Bool
    public let emit: () async -> Void

    public init(
        isBound: Bool = false,
        shouldPreventDefault: Bool = false,
        emit: @escaping () async -> Void = {}
    ) {
        self.isBound = isBound
        self.shouldPreventDefault = shouldPreventDefault
        self.emit = emit
    }
}

/// Everything a registered component needs to render one element.
public struct ComponentRenderContext<Render> {
    /// The element being rendered. Its props are the resolved props.
    public let element: UIElement
    /// The element's key in the spec's elements map.
    public let key: String
    /// Props after expression resolution.
    public let props: [String: JSONValue]
    /// Prop name to absolute state path, for two-way bindings.
    public let bindings: [String: String]?
    /// Default children, rendered once per repeat item when the element repeats.
    public let children: [Render]
    /// A stable identity for each entry in `children`, in the same order.
    ///
    /// Use it as the `ForEach` identity so that a child that appears or
    /// disappears, for example through a visibility condition, does not shift
    /// the identity of its siblings.
    public let childIDs: [String]
    /// Named slot children, keyed by slot name.
    public let slots: [String: [Render]]
    /// The enclosing repeat scope, when the element is inside a repeated element.
    public let scope: RepeatScope?
    /// Whether the spec is still streaming in.
    public let loading: Bool

    private let emitEvent: (String) async -> Void
    private let eventHandle: (String) -> EventHandle
    private let readState: (String) -> JSONValue?
    private let writeState: (String, JSONValue) -> Void

    init(
        element: UIElement,
        key: String,
        props: [String: JSONValue],
        bindings: [String: String]?,
        children: [Render],
        childIDs: [String],
        slots: [String: [Render]],
        scope: RepeatScope?,
        loading: Bool,
        emit: @escaping (String) async -> Void,
        on: @escaping (String) -> EventHandle,
        getState: @escaping (String) -> JSONValue?,
        setState: @escaping (String, JSONValue) -> Void
    ) {
        self.element = element
        self.key = key
        self.props = props
        self.bindings = bindings
        self.children = children
        self.childIDs = childIDs
        self.slots = slots
        self.scope = scope
        self.loading = loading
        self.emitEvent = emit
        self.eventHandle = on
        self.readState = getState
        self.writeState = setState
    }

    /// Emits an event such as `"press"` or `"change"`.
    public func emit(_ eventName: String) async {
        await emitEvent(eventName)
    }

    /// Returns a handle for an event, including whether a binding exists.
    public func on(_ eventName: String) -> EventHandle {
        eventHandle(eventName)
    }

    /// Reads a resolved prop by name.
    public func prop(_ name: String) -> JSONValue? {
        props[name]
    }

    /// The absolute state path bound to a prop, when the prop is a binding.
    public func binding(_ prop: String) -> String? {
        bindings?[prop]
    }

    /// Reads a state value by JSON Pointer path.
    public func stateValue(at path: String) -> JSONValue? {
        readState(path)
    }

    /// Writes a state value by JSON Pointer path.
    public func setState(at path: String, to value: JSONValue) {
        writeState(path, value)
    }

    /// The children paired with their element identities, for a view container
    /// that lists them. Hiding one child then does not shift the identity of
    /// the children after it, which would lose their state and focus.
    public var identifiedChildren: [IdentifiedChild<Render>] {
        identifyChildren(children, ids: childIDs)
    }
}

/// A rendered child paired with a stable identity.
public struct IdentifiedChild<Render>: Identifiable {
    /// The identity to give the child in a `ForEach`.
    public let id: String
    /// The child's position in the parent's `children`.
    public let index: Int
    /// The rendered child.
    public let content: Render
}

/// Pairs each child with the element identity at the same position.
///
/// A child without an id falls back to its index. Repeated ids, which a spec
/// that references the same child twice produces, get a unique suffix.
public func identifyChildren<Render>(_ children: [Render], ids: [String]) -> [IdentifiedChild<Render>] {
    var seen: [String: Int] = [:]
    return children.indices.map { index in
        let base = index < ids.count ? ids[index] : "#\(index)"
        let count = seen[base, default: 0]
        seen[base] = count + 1
        return IdentifiedChild(
            id: count == 0 ? base : "\(base)#\(count)",
            index: index,
            content: children[index]
        )
    }
}

/// A component renderer registered for one catalog component name.
public struct ComponentDefinition<Render> {
    public let render: (ComponentRenderContext<Render>) -> Render

    public init(_ render: @escaping (ComponentRenderContext<Render>) -> Render) {
        self.render = render
    }
}

/// Component renderers, action handlers, `$computed` functions, and custom
/// directives, keyed by name.
///
/// The renderer looks up a component by the element's `type`. When the type is
/// missing it uses `fallback`; when that is also missing it warns and drops the
/// subtree, matching the React renderer.
public final class RendererRegistry<Render> {
    public var components: [String: ComponentDefinition<Render>]
    public var fallback: ComponentDefinition<Render>?
    public var actions: [String: ActionHandler]
    public var functions: [String: ComputedFunction]
    public var directives: [String: Directive]

    public init(
        components: [String: ComponentDefinition<Render>] = [:],
        fallback: ComponentDefinition<Render>? = nil,
        actions: [String: ActionHandler] = [:],
        functions: [String: ComputedFunction] = [:],
        directives: [String: Directive] = [:]
    ) {
        self.components = components
        self.fallback = fallback
        self.actions = actions
        self.functions = functions
        self.directives = directives
    }

    /// Registers or replaces a component renderer.
    public func register(_ type: String, _ definition: ComponentDefinition<Render>) {
        components[type] = definition
    }

    /// The renderer for a component type, or the fallback when one is set.
    public func component(for type: String) -> ComponentDefinition<Render>? {
        components[type] ?? fallback
    }

    /// Whether a type can render at all.
    public func canRender(_ type: String) -> Bool {
        components[type] != nil || fallback != nil
    }
}
