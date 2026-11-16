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

private val templateReference = Regex("""\$\{([^}]+)}""")

internal data class Expressions(val state: JsonObject, val scope: RepeatScope?) {
    fun binding(value: JsonElement): String? {
        val obj = value as? JsonObject ?: return null
        obj.string("\$bindState")?.let { return it }
        return obj.string("\$bindItem")?.let { name -> scope?.let { it.path + name.itemPointer() } }
    }

    fun resolve(value: JsonElement?, depth: Int = 0): JsonElement? {
        if (depth >= 64) return null
        return when (value) {
            is JsonArray -> JsonArray(value.map { resolve(it, depth + 1) ?: JsonNull })
            is JsonObject -> {
                value.string("\$state")?.let { return state.atPointer(it) }
                value.string("\$item")?.let { return scope?.item?.atPointer(it.itemPointer()) }
                if (value["\$index"] == JsonPrimitive(true)) return scope?.let { JsonPrimitive(it.index) }

                if (value.string("\$bindState") != null || value.string("\$bindItem") != null) {
                    return binding(value)?.let(state::atPointer)
                }
                if (value.containsKey("\$cond")) {
                    val branch = if (visible(value["\$cond"])) "\$then" else "\$else"
                    return resolve(value[branch], depth + 1)
                }
                value.string("\$template")?.let { template ->
                    return JsonPrimitive(templateReference.replace(template) { match ->
                        val path = match.groupValues[1]
                        val resolved = if (path.startsWith("/")) {
                            state.atPointer(path)
                        } else {
                            scope?.item?.atPointer(path.itemPointer())?.takeUnless { it == JsonNull }
                                ?: state.atPointer(path.itemPointer())
                        }
                        resolved.templateText()
                    })
                }
                if (value.string("\$computed") != null) return null

                JsonObject(value.mapNotNull { (key, child) ->
                    resolve(child, depth + 1)?.let { key to it }
                }.toMap())
            }
            else -> value
        }
    }

    fun visible(condition: JsonElement?, depth: Int = 0): Boolean {
        if (depth >= 64) return false
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
                    statePath != null -> state.atPointer(statePath)
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
        val other = if (reference != null) state.atPointer(reference) else raw
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

private fun JsonElement?.templateText(): String = when (this) {
    null, JsonNull -> ""
    is JsonPrimitive -> content
    is JsonArray -> joinToString(",") { it.templateText() }
    is JsonObject -> "[object Object]"
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
