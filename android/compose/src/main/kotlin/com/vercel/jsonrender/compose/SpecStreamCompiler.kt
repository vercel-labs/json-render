package com.vercel.jsonrender.compose

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** An RFC 6902 operation from a json-render JSONL stream. */
data class JsonPatch(
    val op: String,
    val path: String,
    val value: JsonElement? = null,
    val from: String? = null,
)

private const val MAX_POINTER_DEPTH = 64

/** Applies one operation without modifying the previous document. */
fun JsonPatch.applyTo(document: JsonElement): JsonElement = apply(document, createMissing = false)

private fun JsonPatch.apply(document: JsonElement, createMissing: Boolean): JsonElement {
    val parts = requirePointer(path)
    return when (op) {
        "add" -> edit(document, parts, Edit.Add, requireValue(), createMissing = createMissing)
        "remove" -> edit(document, parts, Edit.Remove)
        "replace" -> edit(document, parts, Edit.Replace, requireValue(), createMissing = createMissing)
        "copy" -> {
            val source = requireNotNull(from) { "Missing copy source" }
            requirePointer(source)
            val copied = requireNotNull(document.atPointer(source)) { "Missing copy source" }
            edit(document, parts, Edit.Add, copied, createMissing = createMissing)
        }
        "move" -> {
            val source = requireNotNull(from) { "Missing move source" }
            val sourceParts = requirePointer(source)
            require(sourceParts.size >= parts.size || parts.take(sourceParts.size) != sourceParts) {
                "Cannot move a value into its child"
            }
            val moved = requireNotNull(document.atPointer(source)) { "Missing move source" }
            if (parts == sourceParts) document
            else edit(edit(document, sourceParts, Edit.Remove), parts, Edit.Add, moved, createMissing = createMissing)
        }
        "test" -> {
            require(document.atPointer(path)?.patchEquals(requireValue(), 0) == true) { "Patch test failed" }
            document
        }
        else -> throw IllegalArgumentException("Unsupported patch operation")
    }
}

private fun JsonPatch.requireValue(): JsonElement = requireNotNull(value) { "Missing patch value" }

private enum class Edit { Add, Remove, Replace }

private fun requirePointer(path: String): List<String> {
    require(path.count { it == '/' } <= MAX_POINTER_DEPTH) { "Patch path is too deep" }
    require(path.indices.none { index ->
        path[index] == '~' && path.getOrNull(index + 1) != '0' && path.getOrNull(index + 1) != '1'
    }) {
        "Invalid patch path escape"
    }
    return requireNotNull(pointerParts(path)) { "Invalid patch path" }
}

private fun edit(
    existing: JsonElement?,
    path: List<String>,
    operation: Edit,
    value: JsonElement = JsonNull,
    depth: Int = 0,
    createMissing: Boolean = false,
): JsonElement {
    if (depth == path.size) return if (operation == Edit.Remove) JsonNull else value
    val part = path[depth]
    val leaf = depth == path.lastIndex
    val document = if (createMissing && existing !is JsonArray && existing !is JsonObject) {
        if (part.arrayIndex() != null || part == "-") JsonArray(emptyList()) else JsonObject(emptyMap())
    } else existing
    return when (document) {
        is JsonObject -> {
            val next = document.toMutableMap()
            if (!leaf) {
                val child = document[part]
                require(createMissing || child != null) { "Missing patch parent" }
                next[part] = edit(child, path, operation, value, depth + 1, createMissing)
            } else {
                require(createMissing || operation == Edit.Add || part in document) { "Missing patch target" }
                if (operation == Edit.Remove) next.remove(part) else next[part] = value
            }
            JsonObject(next)
        }
        is JsonArray -> {
            val append = createMissing || leaf && operation == Edit.Add
            val index = if (append && part == "-") document.size else part.arrayIndex()
            require(index != null && (index in document.indices || append && index == document.size)) {
                "Invalid patch array index"
            }
            JsonArray(document.toMutableList().apply {
                if (!leaf) {
                    val child = edit(getOrNull(index), path, operation, value, depth + 1, createMissing)
                    if (index == size) add(child) else this[index] = child
                } else {
                    when (operation) {
                        Edit.Add -> add(index, value)
                        Edit.Remove -> removeAt(index)
                        Edit.Replace -> if (index == size) add(value) else this[index] = value
                    }
                }
            })
        }
        else -> throw IllegalArgumentException("Patch parent is not a container")
    }
}

internal fun writeJsonState(state: JsonObject, path: String, value: JsonElement): JsonObject {
    if (!fitsJsonDocument(value)) return state
    val next = try {
        edit(state, requirePointer(path), Edit.Replace, value, createMissing = true) as? JsonObject
    } catch (_: IllegalArgumentException) {
        null
    }
    return next?.takeIf(::fitsJsonDocument) ?: state
}

private fun JsonElement.patchEquals(other: JsonElement, depth: Int): Boolean {
    if (depth > MAX_POINTER_DEPTH) return false
    return when {
        this is JsonObject && other is JsonObject -> keys == other.keys && all { (key, value) ->
            other[key]?.let { value.patchEquals(it, depth + 1) } == true
        }
        this is JsonArray && other is JsonArray -> size == other.size && indices.all { index ->
            this[index].patchEquals(other[index], depth + 1)
        }
        this is JsonPrimitive && other is JsonPrimitive && !isString && !other.isString -> {
            val number = content.toBigDecimalOrNull()
            if (number == null) this == other
            else other.content.toBigDecimalOrNull()?.compareTo(number) == 0
        }
        this is JsonPrimitive && other is JsonPrimitive -> this == other
        else -> false
    }
}

/** Compiles JSONL patches delivered in arbitrary chunks on one caller-owned thread. */
class SpecStreamCompiler(initial: JsonObject = JsonObject(emptyMap())) {
    var result: JsonObject = initial.also { require(fitsJsonDocument(it)) { "Initial spec exceeds JSON limits" } }
        private set

    private val pending = StringBuilder()
    private var droppingLine = false
    private var accepted = 0

    /**
     * Applies complete lines and returns the patches applied by this call. Invalid or
     * oversized patches leave [result] unchanged. A final unterminated line is kept
     * until [finish].
     */
    fun push(chunk: String): List<JsonPatch> {
        val applied = mutableListOf<JsonPatch>()
        for (character in chunk) {
            if (character == '\n') {
                commitLine()?.let(applied::add)
            } else if (!droppingLine) {
                if (pending.length == MAX_LINE) {
                    droppingLine = true
                    pending.clear()
                } else {
                    pending.append(character)
                }
            }
        }
        return applied
    }

    /** Applies a final unterminated line and returns the compiled JSON object. */
    fun finish(): JsonObject {
        commitLine()
        return result
    }

    /** Decodes what can be rendered as of the last complete line. */
    fun currentSpec(): Spec? = Spec.decodePartial(result)

    private fun commitLine(): JsonPatch? {
        val skip = droppingLine || accepted >= MAX_PATCHES || pending.isBlank()
        val line = if (skip) "" else pending.toString()
        pending.clear()
        droppingLine = false
        if (skip || !hasBoundedJsonDepth(line)) return null
        val obj = runCatching { Json.parseToJsonElement(line) as? JsonObject }.getOrNull() ?: return null
        val patch = JsonPatch(
            obj.string("op") ?: return null,
            obj.string("path") ?: return null,
            obj["value"],
            obj.string("from"),
        )
        val next = runCatching { patch.apply(result, createMissing = true) as? JsonObject }.getOrNull() ?: return null
        if (!fitsJsonDocument(next)) return null
        result = next
        accepted++
        return patch
    }

    private companion object {
        const val MAX_LINE = 1_000_000
        const val MAX_PATCHES = 10_000
    }
}

internal fun hasBoundedJsonDepth(source: String): Boolean {
    var depth = 0
    var inString = false
    var escaped = false
    for (character in source) {
        when {
            escaped -> escaped = false
            inString && character == '\\' -> escaped = true
            character == '"' -> inString = !inString
            !inString && (character == '{' || character == '[') -> {
                if (++depth > MAX_POINTER_DEPTH) return false
            }
            !inString && (character == '}' || character == ']') -> {
                if (--depth < 0) return false
            }
        }
    }
    return depth == 0 && !inString
}

internal fun fitsJsonDocument(root: JsonElement): Boolean {
    var nodes = 100_000
    var characters = 4_000_000
    fun visit(value: JsonElement, depth: Int): Boolean {
        if (--nodes < 0 || depth > MAX_POINTER_DEPTH) return false
        return when (value) {
            is JsonObject -> value.all { (key, element) ->
                characters -= key.length
                characters >= 0 && visit(element, depth + 1)
            }
            is JsonArray -> value.all { visit(it, depth + 1) }
            is JsonPrimitive -> {
                characters -= value.content.length
                characters >= 0
            }
        }
    }
    return visit(root, 0)
}
