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
    ///   - limits: Bounds for each rendered-tree build. A spec that exceeds a
    ///     limit is not rendered and logs one warning. Raise the limits for
    ///     specs that legitimately render more nodes.
    public init(
        spec: Spec,
        registry: RendererRegistry<AnyView>,
        initialState: [String: JSONValue]? = nil,
        navigate: ((String) -> Void)? = nil,
        confirm: ((ActionConfirm) async -> Bool)? = nil,
        loading: Bool = false,
        animation: Animation? = nil,
        limits: RenderTreeLimits = .default
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
                animation: animation,
                limits: limits
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

    /// Bounds for each rendered-tree build.
    public let limits: RenderTreeLimits

    private let watchTracker: WatchTracker
    private var subscription: StateSubscription?

    /// Whether any element in the current spec watches state. A state change
    /// only needs its own build when a watch could fire.
    private var hasWatches: Bool

    /// Increments on every state change so SwiftUI re-evaluates the body.
    @Published private(set) var revision = 0

    public init(
        spec: Spec,
        registry: RendererRegistry<AnyView>,
        initialState: [String: JSONValue]? = nil,
        navigate: ((String) -> Void)? = nil,
        confirm: ((ActionConfirm) async -> Bool)? = nil,
        loading: Bool = false,
        animation: Animation? = nil,
        limits: RenderTreeLimits = .default
    ) {
        self.spec = spec
        self.registry = registry
        self.loading = loading
        self.animation = animation
        self.limits = limits
        self.store = StateStore(initialState ?? spec.state ?? [:])
        self.dispatcher = ActionDispatcher(
            store: store,
            handlers: registry.actions,
            navigate: navigate
        )
        self.dispatcher.requestConfirmation = confirm
        self.watchTracker = WatchTracker(
            functions: registry.functions,
            directives: registry.directives
        )
        self.hasWatches = spec.hasWatches
        // Record the watched values of the initial render, so the first state
        // change compares against them and runs its watch actions.
        if hasWatches {
            watchTracker.snapshot(buildWatches())
        }
        self.subscription = store.subscribe { [weak self] in
            self?.stateChanged()
        }
    }

    /// Applies a spec that the owning view received after the model was
    /// created.
    ///
    /// A different spec rebuilds the tree and updates only the initial state
    /// keys whose value changed. An equal spec is ignored, so the current
    /// state, including edits made through `$bindState`, is kept.
    public func update(spec newSpec: Spec) {
        guard newSpec != spec else { return }
        let currentState = store.snapshot
        let nextState = stateAfterSpecChange(
            previous: spec,
            next: newSpec,
            current: currentState
        )
        spec = newSpec
        hasWatches = newSpec.hasWatches
        // A watch that appears with the new spec records its current value as
        // its baseline, the way a watch does when its element first mounts, so
        // the state merge below can still fire it.
        if hasWatches {
            watchTracker.snapshot(buildWatches())
        }
        if nextState != currentState {
            store.replace(nextState)
        }
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
            loading: loading,
            limits: limits
        )
    }

    /// The watch entries of the current state, from one build of the tree.
    private func buildWatches() -> [WatchRecord] {
        buildRenderTreeWithWatches(
            spec: spec,
            registry: registry,
            store: store,
            dispatcher: dispatcher,
            loading: loading,
            limits: limits
        ).watches
    }

    /// Store listeners run on the thread that changed the state. Actions run
    /// on the cooperative pool, so changes from a background thread are
    /// applied on the main thread, where SwiftUI expects published changes and
    /// where `withAnimation` takes effect.
    private func stateChanged() {
        if Thread.isMainThread {
            applyStateChange()
        } else {
            DispatchQueue.main.async { [weak self] in
                self?.applyStateChange()
            }
        }
    }

    private func applyStateChange() {
        if let animation {
            withAnimation(animation) { revision &+= 1 }
        } else {
            revision &+= 1
        }
        // The body builds the tree for SwiftUI; the watches come from a build
        // of their own, so skip it when the spec has no watch to run.
        guard hasWatches else { return }
        let records = buildWatches()
        Task { @MainActor in
            await watchTracker.process(records, dispatcher: dispatcher, store: store)
        }
    }
}
#endif
