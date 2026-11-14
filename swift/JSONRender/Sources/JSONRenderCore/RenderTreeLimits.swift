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

    /// The most bytes the templates of one build may expand to.
    ///
    /// A template is bounded on its own, but a spec can repeat many of them:
    /// thousands of elements that each expand a state value into a large prop
    /// stay under the node limits and still take gigabytes. Every expansion in
    /// the build draws from this budget and stops at it. Only template output
    /// counts: a `$state` or `$item` value is shared with the state it comes
    /// from, not copied, so binding a large value into props costs nothing.
    public var maxResolvedPropBytes: Int

    /// The most bytes the watch ids of one build may hold.
    ///
    /// A watch id copies the element key, the repeat path, and the watch path
    /// into a new string. An element with a long watch path that is listed
    /// many times as a child would otherwise hold that text once per visit.
    public var maxWatchIDBytes: Int

    /// The limits the renderer uses when none are given.
    ///
    /// The defaults allow large lists and deeply nested layouts while stopping
    /// a spec that expands into millions of nodes.
    public static let `default` = RenderTreeLimits(
        maxDepth: 100,
        maxRenderedNodes: 10_000,
        maxWork: 50_000,
        maxResolvedPropBytes: 32_000_000,
        maxWatchIDBytes: 4_000_000
    )

    public init(
        maxDepth: Int = 100,
        maxRenderedNodes: Int = 10_000,
        maxWork: Int = 50_000,
        maxResolvedPropBytes: Int = 32_000_000,
        maxWatchIDBytes: Int = 4_000_000
    ) {
        self.maxDepth = maxDepth
        self.maxRenderedNodes = maxRenderedNodes
        self.maxWork = maxWork
        self.maxResolvedPropBytes = max(1, maxResolvedPropBytes)
        self.maxWatchIDBytes = max(1, maxWatchIDBytes)
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
    private var watchIDBytes = 0

    /// Whether the build has stopped because it reached a limit.
    private(set) var isExhausted = false

    /// The budget every template expansion in the build draws from.
    let resolutionBudget: ResolutionBudget

    init(limits: RenderTreeLimits) {
        self.limits = limits
        self.resolutionBudget = ResolutionBudget(limit: limits.maxResolvedPropBytes)
    }

    /// Stops the build when a template was cut short by the resolution budget.
    func resolutionFits() -> Bool {
        guard !isExhausted else { return false }
        guard resolutionBudget.isSpent else { return true }
        return stop(
            "Spec exceeds the resolved prop size limit of \(limits.maxResolvedPropBytes) bytes. The spec was not rendered."
        )
    }

    /// Counts the watch ids an element would create, before they are built.
    /// Returns false when the build must stop.
    func chargeWatchIDs(_ bytes: Int) -> Bool {
        guard !isExhausted else { return false }
        watchIDBytes += bytes
        guard watchIDBytes <= limits.maxWatchIDBytes else {
            return stop(
                "Spec exceeds the watch id size limit of \(limits.maxWatchIDBytes) bytes. The spec was not rendered."
            )
        }
        return true
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
