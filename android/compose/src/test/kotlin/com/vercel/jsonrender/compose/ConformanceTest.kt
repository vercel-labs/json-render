package com.vercel.jsonrender.compose

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

class ConformanceTest {
    @Test
    fun `all shared spec trees match the existing React conformance fixtures`() {
        val names = listOf("expressions", "settings-form", "todo-repeat", "unknown-component", "user-profile-card", "visibility")
        val types = setOf(
            "Card", "Heading", "Text", "Badge", "Stack", "Separator", "Progress",
            "Button", "Input", "Select", "Switch", "Image", "List", "Row", "Column",
        )
        for (name in names) {
            val spec = Spec.decode(fixture("specs/$name.json"))
            val actual = checkNotNull(buildRenderTree(spec, types, spec.state)).snapshot()
            val expected = Json.parseToJsonElement(fixture("expected/$name.json"))
            assertEquals(expected, actual, name)
        }
    }

    private fun fixture(name: String): String =
        checkNotNull(javaClass.getResourceAsStream("/$name"))
            .bufferedReader().use { it.readText() }

    private fun RenderNode.snapshot(): JsonObject = JsonObject(buildMap {
        put("component", JsonPrimitive(element.type))
        put("props", props)
        if (children.isNotEmpty()) put("children", JsonArray(children.map { it.snapshot() }))
    })
}
