#if canImport(SwiftUI)
import SwiftUI
import JSONRenderCore

/// Renders a spec with a registry of SwiftUI component renderers.
///
/// The view owns a state store seeded from `spec.state`. State changes rebuild
/// the tree, so components that read state through their props stay current.
/// Passing a different spec to an existing view renders the new spec and
/// resets the store to the new spec's `state`. Passing an equal spec keeps the
/// current state.
///
/// ```swift
/// JSONRenderView(spec: spec, registry: registry)
/// ```
public struct JSONRenderView: View {
    @StateObject private var model: JSONRenderModel

    private let spec: Spec
    private let loading: Bool

    /// Creates a renderer for a spec.
    ///
    /// - Parameters:
    ///   - spec: The spec to render.
    ///   - registry: Component renderers, action handlers, computed functions,
    ///     and directives.
    ///   - initialState: Overrides `spec.state` as the initial state model.
    ///   - navigate: Handles `onSuccess: { "navigate": "/path" }`.
    ///   - confirm: Asks the user to confirm an action. Returning false cancels
    ///     the action. When nil, actions with a `confirm` block run directly.
    ///   - loading: Whether the spec is still streaming in. While loading,
    ///     children that have not arrived yet are skipped without a warning, and
    ///     components receive `loading` in their render context.
    ///   - animation: Animates layout changes caused by state updates, such as
    ///     an element that a visibility condition shows or hides. When nil,
    ///     state changes apply without animation.
    public init(
        spec: Spec,
        registry: RendererRegistry<AnyView>,
        initialState: [String: JSONValue]? = nil,
        navigate: ((String) -> Void)? = nil,
        confirm: ((ActionConfirm) async -> Bool)? = nil,
        loading: Bool = false,
        animation: Animation? = nil
    ) {
        self.spec = spec
        self.loading = loading
        _model = StateObject(
            wrappedValue: JSONRenderModel(
                spec: spec,
                registry: registry,
                initialState: initialState,
                navigate: navigate,
                confirm: confirm,
                loading: loading,
                animation: animation
            )
        )
    }

    public var body: some View {
        Group {
            // Until `onChange` applies a new spec, the model still holds the
            // previous one. Treat that render as loading so children the
            // previous spec had not received yet do not warn.
            if let tree = model.tree(loading: loading || spec != model.spec) {
                tree.content
            } else {
                EmptyView()
            }
        }
        .onChange(of: spec) { newSpec in
            model.update(spec: newSpec)
        }
        .onChange(of: loading) { isLoading in
            model.loading = isLoading
        }
    }
}

/// Owns the state store, dispatcher, and watch tracker behind a
/// `JSONRenderView`.
public final class JSONRenderModel: ObservableObject {
    public private(set) var spec: Spec
    public let registry: RendererRegistry<AnyView>
    public let store: StateStore
    public let dispatcher: ActionDispatcher

    /// Animates the update that follows a state change. The transaction
    /// covers the whole view hierarchy, so an enclosing scroll view animates
    /// its content size change too.
    public var animation: Animation?

    /// Whether the spec is still streaming in. Watch processing builds the
    /// tree with this flag so missing children do not warn mid-stream.
    public var loading = false

    private let watchTracker = WatchTracker()
    private var subscription: StateSubscription?

    /// Increments on every state change so SwiftUI re-evaluates the body.
    @Published private(set) var revision = 0

    public init(
        spec: Spec,
        registry: RendererRegistry<AnyView>,
        initialState: [String: JSONValue]? = nil,
        navigate: ((String) -> Void)? = nil,
        confirm: ((ActionConfirm) async -> Bool)? = nil,
        loading: Bool = false,
        animation: Animation? = nil
    ) {
        self.spec = spec
        self.registry = registry
        self.loading = loading
        self.animation = animation
        self.store = StateStore(initialState ?? spec.state ?? [:])
        self.dispatcher = ActionDispatcher(
            store: store,
            handlers: registry.actions,
            navigate: navigate
        )
        self.dispatcher.requestConfirmation = confirm
        self.subscription = store.subscribe { [weak self] in
            self?.stateChanged()
        }
    }

    /// Applies a spec that the owning view received after the model was
    /// created.
    ///
    /// A different spec rebuilds the tree and resets the store to the new
    /// spec's `state`. An equal spec is ignored, so the current state, including
    /// edits made through `$bindState`, is kept.
    public func update(spec newSpec: Spec) {
        guard newSpec != spec else { return }
        let nextState = stateAfterSpecChange(
            previous: spec,
            next: newSpec,
            current: store.snapshot
        )
        spec = newSpec
        store.replace(nextState)
    }

    /// Builds the current tree.
    ///
    /// - Parameter loading: Whether the spec is still streaming in.
    public func tree(loading: Bool = false) -> RenderedElement<AnyView>? {
        buildRenderTree(
            spec: spec,
            registry: registry,
            store: store,
            dispatcher: dispatcher,
            loading: loading
        )
    }

    private func stateChanged() {
        if let animation, Thread.isMainThread {
            withAnimation(animation) { revision &+= 1 }
        } else {
            revision &+= 1
        }
        guard let tree = tree(loading: loading) else { return }
        let records = watchRecords(tree, state: store.snapshot)
        Task { @MainActor in
            await watchTracker.process(records, dispatcher: dispatcher, store: store)
        }
    }
}
#endif
