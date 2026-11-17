package com.vercel.jsonrender.compose

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull

internal fun JsonObject.string(name: String): String? =
    (get(name) as? JsonPrimitive)?.takeIf { it.isString }?.content

internal fun String.itemPointer(): String = if (isEmpty() || startsWith("/")) this else "/$this"

internal data class RepeatScope(val item: JsonElement, val index: Int, val path: String)

private val templateReference = Regex("""\$\{([^}]+)\}""")

typealias ComputedFunction = (JsonObject) -> JsonElement?
typealias Directive = (JsonObject, DirectiveContext) -> JsonElement?

/** Named app functions and custom directive keys used when resolving a spec. */
data class ExpressionRegistry(
    val functions: Map<String, ComputedFunction> = emptyMap(),
    val directives: Map<String, Directive> = emptyMap(),
)

class DirectiveContext internal constructor(
    val state: JsonObject,
    val item: JsonElement?,
    val index: Int?,
    val itemPath: String?,
    private val resolveValue: (JsonElement) -> JsonElement?,
) {
    fun resolve(value: JsonElement): JsonElement? = resolveValue(value)
}

internal class ResolutionBudget {
    private var visits = 100_000
    private var characters = 2_000_000
    var exhausted = false
        private set

    fun visit(count: Int = 1): Boolean {
        if (count <= visits) {
            visits -= count
            return !exhausted
        }
        exhausted = true
        return false
    }

    fun text(count: Int): Boolean {
        if (count <= characters) {
            characters -= count
            return !exhausted
        }
        exhausted = true
        return false
    }
}

internal data class Expressions(
    val state: JsonObject,
    val scope: RepeatScope?,
    val registry: ExpressionRegistry = ExpressionRegistry(),
    val budget: ResolutionBudget = ResolutionBudget(),
) {
    fun binding(value: JsonElement): String? {
        val obj = value as? JsonObject ?: return null
        obj.string("\$bindState")?.let { return it }
        return obj.string("\$bindItem")?.let { name -> scope?.let { it.path + name.itemPointer() } }
    }

    fun resolveActionParam(value: JsonElement): JsonElement? {
        val itemPath = (value as? JsonObject)?.string("\$item")
        if (itemPath != null) return scope?.let { JsonPrimitive(it.path + itemPath.itemPointer()) }
        return resolve(value)
    }

    fun resolve(value: JsonElement?, depth: Int = 0): JsonElement? {
        if (depth >= 64 || !budget.visit()) return null
        return when (value) {
            is JsonArray -> {
                if (!budget.visit(value.size)) return null
                JsonArray(value.map { resolve(it, depth + 1) ?: JsonNull })
            }
            is JsonObject -> {
                value.string("\$state")?.let { return state.stateValue(it) }
                value.string("\$item")?.let { return scope?.item?.atPointer(it.itemPointer()) }
                if (value["\$index"] == JsonPrimitive(true)) return scope?.let { JsonPrimitive(it.index) }

                if (value.string("\$bindState") != null || value.string("\$bindItem") != null) {
                    return binding(value)?.let(state::stateValue)
                }
                if (value.containsKey("\$cond")) {
                    val branch = if (visible(value["\$cond"])) "\$then" else "\$else"
                    return resolve(value[branch], depth + 1)
                }
                value.string("\$computed")?.let { name ->
                    val function = registry.functions[name] ?: return null
                    val args = value["args"] as? JsonObject
                    if (!budget.visit(args?.size ?: 0)) return null
                    return function(JsonObject(args.orEmpty().mapValues { (_, arg) ->
                        resolve(arg, depth + 1) ?: JsonNull
                    }))
                }
                value.string("\$template")?.let { return interpolate(it)?.let(::JsonPrimitive) }
                registry.directives.entries.firstOrNull { value.containsKey(it.key) }?.let { (_, directive) ->
                    return directive(value, DirectiveContext(state, scope?.item, scope?.index, scope?.path) {
                        resolve(it, depth + 1)
                    })
                }

                if (!budget.visit(value.size)) return null
                JsonObject(value.mapNotNull { (key, child) ->
                    resolve(child, depth + 1)?.let { key to it }
                }.toMap())
            }
            else -> value
        }
    }

    private fun interpolate(template: String): String? {
        val output = StringBuilder()
        var cursor = 0
        for (match in templateReference.findAll(template)) {
            if (!budget.text(match.range.first - cursor)) return null
            output.append(template, cursor, match.range.first)
            val path = match.groupValues[1]
            val resolved = if (path.startsWith("/")) {
                state.stateValue(path)
            } else {
                scope?.item?.atPointer(path.itemPointer())?.takeUnless { it == JsonNull }
                    ?: state.stateValue(path.itemPointer())
            }
            if (!appendTemplateValue(output, resolved, 0)) return null
            cursor = match.range.last + 1
        }
        if (!budget.text(template.length - cursor)) return null
        return output.append(template, cursor, template.length).toString()
    }

    private fun appendTemplateValue(output: StringBuilder, value: JsonElement?, depth: Int): Boolean {
        if (depth >= 64 || !budget.visit()) return false
        val text = when (value) {
            null, JsonNull -> ""
            is JsonPrimitive -> value.content
            is JsonObject -> "[object Object]"
            is JsonArray -> {
                for ((index, item) in value.withIndex()) {
                    if (index > 0) {
                        if (!budget.text(1)) return false
                        output.append(',')
                    }
                    if (!appendTemplateValue(output, item, depth + 1)) return false
                }
                return true
            }
        }
        if (!budget.text(text.length)) return false
        output.append(text)
        return true
    }

    fun visible(condition: JsonElement?, depth: Int = 0): Boolean {
        if (depth >= 64 || !budget.visit()) return false
        return when (condition) {
            null, JsonNull -> true
            is JsonPrimitive -> condition == JsonPrimitive(true)
            is JsonArray -> condition.all { visible(it, depth + 1) }
            is JsonObject -> {
                (condition["\$and"] as? JsonArray)?.let { return it.all { visible(it, depth + 1) } }
                (condition["\$or"] as? JsonArray)?.let { return it.any { visible(it, depth + 1) } }

                val statePath = condition.string("\$state")
                val itemPath = condition.string("\$item")
                val value = when {
                    statePath != null -> state.stateValue(statePath)
                    itemPath != null -> scope?.item?.atPointer(itemPath.itemPointer())
                    condition["\$index"] == JsonPrimitive(true) -> scope?.let { JsonPrimitive(it.index) }
                    else -> return false
                }
                compare(value, condition) xor (condition["not"] == JsonPrimitive(true))
            }
        }
    }

    private fun compare(value: JsonElement?, condition: JsonObject): Boolean {
        val operator = comparisonOperators.firstOrNull(condition::containsKey) ?: return value.truthy()
        val raw = condition[operator]
        val reference = (raw as? JsonObject)?.string("\$state")
        val other = if (reference != null) state.stateValue(reference) else raw
        if (operator == "eq" || operator == "neq") {
            val number = value.jsonNumber()
            val equal = if (number != null) {
                number == other.jsonNumber()
            } else {
                (value == null || value is JsonPrimitive) && value == other
            }
            return equal xor (operator == "neq")
        }

        val left = value.jsonNumber() ?: return false
        val right = other.jsonNumber() ?: return false
        return when (operator) {
            "gt" -> left > right
            "gte" -> left >= right
            "lt" -> left < right
            else -> left <= right
        }
    }
}

private val comparisonOperators = listOf("eq", "neq", "gt", "gte", "lt", "lte")

private fun JsonElement?.jsonNumber(): Double? =
    (this as? JsonPrimitive)?.takeUnless { it.isString }?.doubleOrNull

private fun JsonElement?.truthy(): Boolean = when (this) {
    null, JsonNull -> false
    is JsonPrimitive -> if (isString) content.isNotEmpty() else booleanOrNull ?: (jsonNumber() != 0.0)
    else -> true
}

internal fun JsonElement.usesRepeatScope(depth: Int = 0): Boolean {
    if (depth >= 64) return false
    return when (this) {
        is JsonArray -> any { it.usesRepeatScope(depth + 1) }
        is JsonObject -> containsKey("\$item") || containsKey("\$index") ||
            get("\$and")?.usesRepeatScope(depth + 1) == true ||
            get("\$or")?.usesRepeatScope(depth + 1) == true
        else -> false
    }
}
