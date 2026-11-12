import Foundation

/// Limits that bound one rendered-tree build.
///
/// A spec's `elements` map can reference the same element from several parents.
/// The tree builder expands those references into separate nodes, so a small
/// spec can describe an exponentially large tree. One budget is shared by the
/// whole build, which stops before that expansion can exhaust memory or time.
///
/// The build is a pure function of the spec and state, and it runs again on
/// every state change, so the limits apply to each build rather than to a
/// model's lifetime.
public struct RenderTreeLimits: Equatable, Sendable {
    /// The deepest nesting the build allows. The root element is at depth 1.
    public var maxDepth: Int

    /// The most nodes the build renders, including the root.
    public var maxRenderedNodes: Int

    /// The most elements the build visits, including elements it drops
    /// because they are missing, hidden, or have no renderer.
    public var maxWork: Int

    /// The limits the renderer uses when none are given.
    ///
    /// The defaults allow large lists and deeply nested layouts while stopping
    /// a spec that expands into millions of nodes.
    public static let `default` = RenderTreeLimits(
        maxDepth: 100,
        maxRenderedNodes: 10_000,
        maxWork: 50_000
    )

    public init(
        maxDepth: Int = 100,
        maxRenderedNodes: Int = 10_000,
        maxWork: Int = 50_000
    ) {
        self.maxDepth = maxDepth
        self.maxRenderedNodes = maxRenderedNodes
        self.maxWork = maxWork
    }
}

/// Tracks one build's use of `RenderTreeLimits`.
///
/// This is a class so every recursive `buildElement` call shares the same
/// counts. Once a limit is reached the build stops and the first limit is
/// reported once, like the renderer's other recoverable spec problems.
final class RenderTreeBudget {
    private let limits: RenderTreeLimits
    private var work = 0
    private var renderedNodes = 0

    /// Whether the build has stopped because it reached a limit.
    private(set) var isExhausted = false

    init(limits: RenderTreeLimits) {
        self.limits = limits
    }

    /// Counts a visit to an element at `depth`.
    ///
    /// Returns false when the build must stop, either because an earlier call
    /// stopped it or because this visit reaches a limit.
    func visit(depth: Int) -> Bool {
        guard !isExhausted else { return false }
        guard depth <= limits.maxDepth else {
            return stop(
                "Spec exceeds the render tree depth limit of \(limits.maxDepth). The spec was not rendered."
            )
        }
        work += 1
        guard work <= limits.maxWork else {
            return stop(
                "Spec exceeds the element visit limit of \(limits.maxWork). The spec was not rendered."
            )
        }
        return true
    }

    /// Counts one rendered node. Returns false when the build must stop.
    func renderNode() -> Bool {
        guard !isExhausted else { return false }
        renderedNodes += 1
        guard renderedNodes <= limits.maxRenderedNodes else {
            return stop(
                "Spec exceeds the rendered node limit of \(limits.maxRenderedNodes). The spec was not rendered."
            )
        }
        return true
    }

    private func stop(_ message: String) -> Bool {
        isExhausted = true
        JSONRenderLog.warn(message)
        return false
    }
}
