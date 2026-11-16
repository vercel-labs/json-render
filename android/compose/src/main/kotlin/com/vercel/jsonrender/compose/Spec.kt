package com.vercel.jsonrender.compose

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

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
        fun decode(source: String): Spec = format.decodeFromString(source)
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
)

@Serializable
data class RepeatSpec(val statePath: JsonElement, val key: String? = null)

/** An event action with parameters resolved against the current state and repeat item. */
data class ActionBinding(val action: String, val params: JsonObject, val source: JsonObject)
