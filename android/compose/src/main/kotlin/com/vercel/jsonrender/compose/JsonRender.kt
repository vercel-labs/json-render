package com.vercel.jsonrender.compose

import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** App-provided composables keyed by the component types permitted in a spec. */
typealias ComponentRegistry = Map<String, @Composable (ComponentContext) -> Unit>
typealias ChildWrapper = @Composable (content: @Composable () -> Unit) -> Unit

class ComponentContext internal constructor(
    val id: String,
    val props: JsonObject,
    private val bindings: Map<String, String>,
    private val children: @Composable (ChildWrapper) -> Unit,
    private val events: Set<String>,
    private val slot: @Composable (String) -> Unit,
    private val emitAction: (String) -> Unit,
    private val writeState: (String, JsonElement) -> Unit,
) {
    /** Emits the actions bound to this event, in spec order. */
    fun emit(event: String) = emitAction(event)

    /** Returns the state pointer for a writable prop. */
    fun binding(prop: String): String? = bindings[prop]

    /** Requests a state write when [prop] has a two-way binding. */
    fun write(prop: String, value: JsonElement) {
        binding(prop)?.let { writeState(it, value) }
    }

    fun hasEvent(event: String): Boolean = event in events

    @Composable
    fun RenderChildren() = children { content -> content() }

    /** Applies one layout wrapper to each child without changing its composition identity. */
    @Composable
    fun RenderChildren(wrapper: ChildWrapper) = children(wrapper)

    @Composable
    fun RenderSlot(name: String) = slot(name)
}

/**
 * Renders a committed [spec] using registered composables. The host owns [state]
 * and supplies updated snapshots in response to [onStateChange].
 */
@Composable
fun JsonRender(
    spec: Spec,
    registry: ComponentRegistry = FoundationComponents,
    modifier: Modifier = Modifier,
    state: JsonObject = spec.state,
    onAction: (ActionBinding) -> Unit = {},
    onStateChange: (String, JsonElement) -> Unit = { _, _ -> },
    expressions: ExpressionRegistry = ExpressionRegistry(),
    watchCascadeLimit: Int = 64,
) {
    val types = registry.keys.toSet()
    val build = remember(spec, types, state, expressions) { buildRender(spec, types, state, expressions) }
    val watchTracker = remember(watchCascadeLimit) { WatchTracker(watchCascadeLimit) }
    val actionHandler = rememberUpdatedState(onAction)
    LaunchedEffect(state, build.watches) {
        for (watch in watchTracker.changes(build.watches)) {
            val actions = resolveActions(watch.binding, state, watch.scope, expressions)
            for (action in actions) {
                if (!watchTracker.allowDispatch()) return@LaunchedEffect
                actionHandler.value(action)
            }
        }
    }
    val root = build.root ?: return
    val renderer = Renderer(registry, state, onAction, onStateChange, expressions, watchTracker)
    Box(modifier) {
        key(root.id, root.element.type) { renderer.Render(root) }
    }
}

private class Renderer(
    val registry: ComponentRegistry,
    val state: JsonObject,
    val onAction: (ActionBinding) -> Unit,
    val onStateChange: (String, JsonElement) -> Unit,
    val expressions: ExpressionRegistry,
    val watchTracker: WatchTracker,
) {
    @Composable
    fun Render(node: RenderNode) {
        val component = registry[node.element.type] ?: return
        component(ComponentContext(
            id = node.id,
            props = node.props,
            bindings = node.bindings,
            children = { wrapper -> RenderList(node.children, wrapper) },
            events = node.element.on.keys,
            slot = { name -> RenderList(node.slots[name].orEmpty()) },
            emitAction = { event ->
                watchTracker.resetCascade()
                resolveActions(node.element.on[event], state, node.scope, expressions).forEach(onAction)
            },
            writeState = { path, value ->
                watchTracker.resetCascade()
                onStateChange(path, value)
            },
        ))
    }

    @Composable
    private fun RenderList(nodes: List<RenderNode>, wrapper: ChildWrapper = { child -> child() }) {
        val occurrences = mutableMapOf<Pair<JsonPrimitive?, String>, Int>()
        for (node in nodes) {
            val identity = node.rowKey to node.id
            val occurrence = occurrences[identity] ?: 0
            occurrences[identity] = occurrence + 1
            key(node.rowKey, node.id, node.element.type, occurrence) { wrapper { Render(node) } }
        }
    }
}
