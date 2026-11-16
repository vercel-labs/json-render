package com.vercel.jsonrender.compose

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

internal data class RenderNode(
    val id: String,
    val element: Element,
    val props: JsonObject,
    val bindings: Map<String, String>,
    val children: List<RenderNode>,
    val slots: Map<String, List<RenderNode>>,
    val scope: RepeatScope?,
    val rowKey: JsonPrimitive? = null,
)

internal data class WatchRecord(
    val element: String,
    val scope: RepeatScope?,
    val path: String,
    val value: JsonElement?,
    val binding: JsonElement,
)

internal data class RenderBuild(val root: RenderNode?, val watches: List<WatchRecord>)

internal fun buildRenderTree(
    spec: Spec,
    types: Set<String>,
    state: JsonObject,
    expressions: ExpressionRegistry = ExpressionRegistry(),
): RenderNode? = buildRender(spec, types, state, expressions).root

internal fun buildRender(
    spec: Spec,
    types: Set<String>,
    state: JsonObject,
    expressions: ExpressionRegistry,
): RenderBuild = RenderTreeBuilder(spec, types, state, expressions).build()

private class RenderTreeBuilder(
    val spec: Spec,
    val types: Set<String>,
    val state: JsonObject,
    val registry: ExpressionRegistry,
) {
    private val ancestors = mutableSetOf<String>()
    private val watches = mutableListOf<WatchRecord>()
    private val resolutionBudget = ResolutionBudget()
    private var budget = 10_000
    private var limitReached = false

    fun build(): RenderBuild {
        val root = buildNode(spec.root, null)
        return if (limitReached || resolutionBudget.exhausted) RenderBuild(null, emptyList())
            else RenderBuild(root, watches)
    }

    private fun spend(): Boolean {
        if (budget-- > 0) return true
        limitReached = true
        return false
    }

    private fun buildNode(id: String, scope: RepeatScope?): RenderNode? {
        if (!spend()) return null
        if (ancestors.size >= 64) {
            limitReached = true
            return null
        }
        val element = spec.elements[id] ?: return null
        if (id in ancestors) return null
        for ((path, binding) in element.watch) {
            if (!spend()) return null
            watches.add(WatchRecord(id, scope, path, state.stateValue(path), binding))
        }
        if (element.type !in types) return null
        val expressions = Expressions(state, scope, registry, resolutionBudget)
        val condition = element.visible
        val (outer, filter) = if (scope == null && element.repeat != null && condition != null) {
            splitVisibility(condition)
        } else {
            condition to null
        }
        if (!expressions.visible(outer)) return null

        if (!resolutionBudget.visit(element.props.size)) return null
        ancestors.add(id)
        val props = JsonObject(element.props.mapNotNull { (name, value) ->
            expressions.resolve(value)?.let { name to it }
        }.toMap())
        val bindings = element.props.mapNotNull { (name, value) ->
            expressions.binding(value)?.let { name to it }
        }.toMap()
        val children = if (element.repeat != null) repeatChildren(element, scope, filter)
            else buildChildren(element.children, scope)
        val slots = buildMap {
            for ((name, ids) in element.slots) {
                if (!spend()) break
                put(name, buildChildren(ids, scope))
            }
        }
        ancestors.remove(id)
        return RenderNode(id, element, props, bindings, children, slots, scope)
    }

    private fun buildChildren(ids: List<String>, scope: RepeatScope?): List<RenderNode> = buildList {
        for (id in ids) {
            if (limitReached || resolutionBudget.exhausted) break
            buildNode(id, scope)?.let(::add)
        }
    }

    private fun repeatChildren(
        element: Element,
        scope: RepeatScope?,
        filter: JsonElement?,
    ): List<RenderNode> {
        val repeat = element.repeat ?: return emptyList()
        val path = when (val expression = repeat.statePath) {
            is JsonPrimitive -> expression.takeIf { it.isString }?.content
            is JsonObject -> expression.string("\$item")?.let { name -> scope?.let { it.path + name.itemPointer() } }
            else -> null
        } ?: return emptyList()
        val items = state.stateValue(path) as? JsonArray ?: return emptyList()
        return buildList {
            for ((index, item) in items.withIndex()) {
                if (limitReached || resolutionBudget.exhausted || !spend()) break
                val row = RepeatScope(item, index, path.childPointer(index.toString()))
                if (!Expressions(state, row, registry, resolutionBudget).visible(filter)) continue
                val key = repeat.key?.let { (item as? JsonObject)?.get(it) } as? JsonPrimitive
                val rowKey = key?.takeUnless { it == JsonNull } ?: JsonPrimitive(index)
                for (child in buildChildren(element.children, row)) add(child.copy(rowKey = rowKey))
            }
        }
    }
}

private fun splitVisibility(condition: JsonElement): Pair<JsonElement?, JsonElement?> {
    if (!condition.usesRepeatScope()) return condition to null
    val parts = condition as? JsonArray ?: (condition as? JsonObject)?.get("\$and") as? JsonArray
        ?: return null to condition
    val (items, container) = parts.partition { it.usesRepeatScope() }
    return JsonArray(container) to JsonArray(items)
}

internal fun resolveActions(
    binding: JsonElement?,
    state: JsonObject,
    scope: RepeatScope?,
    registry: ExpressionRegistry = ExpressionRegistry(),
): List<ActionBinding> {
    val bindings = if (binding is JsonArray) binding else listOfNotNull(binding)
    if (bindings.size > 1_000) return emptyList()
    val budget = ResolutionBudget()
    val expressions = Expressions(state, scope, registry, budget)
    return bindings.mapNotNull { entry ->
        val source = entry as? JsonObject ?: return@mapNotNull null
        val action = source.string("action") ?: return@mapNotNull null
        val input = source["params"] as? JsonObject
        if (!budget.visit(input?.size ?: 0)) return@mapNotNull null
        val params = input.orEmpty().mapNotNull { (name, value) ->
            expressions.resolveActionParam(value)?.let { name to it }
        }.toMap()
        ActionBinding(action, JsonObject(params), source)
    }.takeUnless { budget.exhausted }.orEmpty()
}
