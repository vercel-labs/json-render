package com.vercel.jsonrender.compose

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement

/** A committed json-render spec with elements keyed independently of their position. */
@Serializable
data class Spec(
    val root: String,
    val elements: Map<String, Element>,
    val state: JsonObject = JsonObject(emptyMap()),
) {
    companion object {
        private val format = Json { ignoreUnknownKeys = true }

        /** Decodes a full spec. Unknown fields are ignored for forward compatibility. */
        fun decode(source: String): Spec {
            require(source.length <= 4_000_000 && hasBoundedJsonDepth(source)) { "Spec exceeds JSON limits" }
            return format.decodeFromString(source)
        }

        /** Decodes renderable elements while a JSONL stream is still assembling the spec. */
        fun decodePartial(document: JsonObject): Spec? {
            val root = document.string("root") ?: return null
            val raw = document["elements"] as? JsonObject ?: return null
            val elements = raw.mapNotNull { (key, value) ->
                runCatching { format.decodeFromJsonElement<Element>(value) }.getOrNull()?.let { key to it }
            }.toMap()
            if (root !in elements) return null
            return Spec(root, elements, document["state"] as? JsonObject ?: JsonObject(emptyMap()))
        }
    }
}

@Serializable
data class Element(
    val type: String,
    val props: JsonObject = JsonObject(emptyMap()),
    val children: List<String> = emptyList(),
    val slots: Map<String, List<String>> = emptyMap(),
    val visible: JsonElement? = null,
    val on: JsonObject = JsonObject(emptyMap()),
    val repeat: RepeatSpec? = null,
    val watch: JsonObject = JsonObject(emptyMap()),
)

@Serializable
data class RepeatSpec(val statePath: JsonElement, val key: String? = null)

/** An event action with parameters resolved against the current state and repeat item. */
data class ActionBinding(val action: String, val params: JsonObject, val source: JsonObject)
