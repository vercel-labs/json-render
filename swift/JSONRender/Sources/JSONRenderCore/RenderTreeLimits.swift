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

    /// The most bytes the resolved props of one build may hold.
    ///
    /// A template is bounded on its own, but a spec can repeat many of them:
    /// thousands of elements that each expand a state value into a large prop
    /// stay under the node limits and still take gigabytes. The build measures
    /// the props of every element it resolves and stops at this total.
    public var maxResolvedPropBytes: Int

    /// The limits the renderer uses when none are given.
    ///
    /// The defaults allow large lists and deeply nested layouts while stopping
    /// a spec that expands into millions of nodes.
    public static let `default` = RenderTreeLimits(
        maxDepth: 100,
        maxRenderedNodes: 10_000,
        maxWork: 50_000,
        maxResolvedPropBytes: 32_000_000
    )

    public init(
        maxDepth: Int = 100,
        maxRenderedNodes: Int = 10_000,
        maxWork: Int = 50_000,
        maxResolvedPropBytes: Int = 32_000_000
    ) {
        self.maxDepth = maxDepth
        self.maxRenderedNodes = maxRenderedNodes
        self.maxWork = maxWork
        self.maxResolvedPropBytes = max(1, maxResolvedPropBytes)
    }
}

/// Tracks one build's use of `RenderTreeLimits`.
///
/// This is a class so every recursive `buildElement` call shares the same
/// counts. Once a limit is reached the build stops and the first limit is
/// reported once, like the renderer's other recoverable spec problems.
final class RenderTreeBudget {
    /// The deepest prop nesting the build measures before treating the value
    /// as past the prop budget.
    private static let maxPropDepth = 1_000

    private let limits: RenderTreeLimits
    private var work = 0
    private var renderedNodes = 0
    private var resolvedPropBytes = 0

    /// Whether the build has stopped because it reached a limit.
    private(set) var isExhausted = false

    init(limits: RenderTreeLimits) {
        self.limits = limits
    }

    /// The prop bytes the build may still resolve.
    ///
    /// A template is limited to this, so one expansion cannot go past what the
    /// whole build has left.
    var remainingResolvedPropBytes: Int {
        max(0, limits.maxResolvedPropBytes - resolvedPropBytes)
    }

    /// Counts one element's resolved props against the build's prop budget.
    /// Returns false when the build must stop.
    func chargeProps(_ props: [String: JSONValue]) -> Bool {
        guard !isExhausted else { return false }
        guard let size = measureJSONValue(.object(props), maxDepth: Self.maxPropDepth) else {
            return stop(
                "Spec exceeds the resolved prop depth limit of \(Self.maxPropDepth). The spec was not rendered."
            )
        }
        resolvedPropBytes += size.bytes
        guard resolvedPropBytes <= limits.maxResolvedPropBytes else {
            return stop(
                "Spec exceeds the resolved prop size limit of \(limits.maxResolvedPropBytes) bytes. The spec was not rendered."
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
