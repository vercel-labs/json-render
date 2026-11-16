package com.vercel.jsonrender.compose

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject

private fun pointerParts(pointer: String): List<String>? = when {
    pointer.isEmpty() -> emptyList()
    !pointer.startsWith("/") -> null
    else -> pointer.drop(1).split('/').map { it.replace("~1", "/").replace("~0", "~") }
}

internal fun String.arrayIndex(): Int? = toIntOrNull()?.takeIf { it >= 0 && it.toString() == this }

internal fun JsonElement.atPointer(pointer: String): JsonElement? =
    pointerParts(pointer)?.fold<String, JsonElement?>(this) { node, part ->
        when (node) {
            is JsonObject -> node[part]
            is JsonArray -> part.arrayIndex()?.let(node::getOrNull)
            else -> null
        }
    }

internal fun String.childPointer(key: String): String =
    this + "/" + key.replace("~", "~0").replace("/", "~1")

/** Returns a new state object with [value] written to an RFC 6901 [path]. */
fun JsonObject.withStateValue(path: String, value: JsonElement): JsonObject {
    val parts = pointerParts(path) ?: return this
    if (parts.size > 64) return this
    fun replace(node: JsonElement?, depth: Int): JsonElement? {
        if (depth == parts.size) return value
        val part = parts[depth]
        return when (node) {
            is JsonArray -> {
                val index = part.arrayIndex()?.takeIf { it in node.indices } ?: return null
                val next = replace(node[index], depth + 1) ?: return null
                JsonArray(node.toMutableList().apply { this[index] = next })
            }
            is JsonObject, null, JsonNull -> {
                val obj = node as? JsonObject
                val next = replace(obj?.get(part), depth + 1) ?: return null
                JsonObject(obj.orEmpty() + (part to next))
            }
            else -> null
        }
    }
    return replace(this, 0) as? JsonObject ?: this
}
