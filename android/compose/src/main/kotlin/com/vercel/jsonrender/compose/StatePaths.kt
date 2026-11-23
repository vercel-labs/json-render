package com.vercel.jsonrender.compose

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

internal fun pointerParts(pointer: String): List<String>? = when {
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

/** Reads a JSON Pointer from the current state snapshot. */
fun JsonObject.stateValue(path: String): JsonElement? = when (path) {
    "", "/" -> this
    else -> atPointer(if (path.startsWith("/")) path else "/$path")
}

/** Returns a new state object with [value] written to an RFC 6901 [path]. */
fun JsonObject.withStateValue(path: String, value: JsonElement): JsonObject =
    writeJsonState(this, path, value)
