package com.vercel.jsonrender.compose

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

class RenderTreeTest {
    @Test
    fun `nested repeats retain state paths and resolve event params from the row`() {
        val spec = Spec.decode($$"""
            {
                "root": "list",
                "state": {
                    "groups": [
                        {"archived": true, "items": []},
                        {"archived": false, "items": [{"id": "one", "title": "Design", "checked": false}]}
                    ]
                },
                "elements": {
                    "list": {
                        "type": "Column",
                        "visible": {"$item": "archived", "eq": false},
                        "repeat": {"statePath": "/groups"},
                        "children": ["group"]
                    },
                    "group": {
                        "type": "Column",
                        "repeat": {"statePath": {"$item": "items"}, "key": "id"},
                        "children": ["entry"]
                    },
                    "entry": {
                        "type": "Entry",
                        "props": {"label": {"$template": "Task: ${title}"}, "checked": {"$bindItem": "checked"}},
                        "on": {
                            "press": [
                                {"action": "open", "params": {"task": {"$item": "title"}, "data": {"title": {"$item": "title"}}}},
                                {"action": "track", "params": {"position": {"$index": true}}}
                            ]
                        }
                    }
                }
            }
        """)
        val types = setOf("Column", "Entry")
        val row = checkNotNull(buildRenderTree(spec, types, spec.state))
            .children.single().children.single()
        assertEquals(JsonPrimitive("one"), row.rowKey)
        assertEquals(JsonPrimitive("Task: Design"), row.props["label"])
        assertEquals(JsonPrimitive(false), row.props["checked"])
        assertEquals("/groups/1/items/0/checked", row.bindings["checked"])

        val actions = resolveActions(row.element.on["press"], spec.state, row.scope)
        assertEquals(listOf("open", "track"), actions.map { it.action })
        assertEquals(JsonPrimitive("/groups/1/items/0/title"), actions[0].params["task"])
        assertEquals(JsonPrimitive("Design"), (actions[0].params["data"] as JsonObject)["title"])
        assertEquals(JsonPrimitive(0), actions[1].params["position"])
    }

    @Test
    fun `rendering skips cycles and missing components while keeping named slots`() {
        val spec = Spec.decode("""
            {"root": "root", "elements": {
                "root": {"type": "Column", "children": ["root", "missing", "unknown", "label"],
                         "slots": {"footer": ["label"]}},
                "unknown": {"type": "Custom"},
                "label": {"type": "Text", "props": {"text": "Hello"}}
            }}
        """)
        val tree = checkNotNull(buildRenderTree(spec, setOf("Column", "Text"), spec.state))
        assertEquals(listOf("label"), tree.children.map { it.id })
        assertEquals(listOf("label"), tree.slots["footer"]?.map { it.id })
    }

    @Test
    fun `expansion budget discards an oversized tree`() {
        val spec = Spec("root", mapOf(
            "root" to Element(type = "Column", children = List(10_000) { "leaf" }),
            "leaf" to Element(type = "Text"),
        ))
        assertNull(buildRenderTree(spec, setOf("Column", "Text"), spec.state))
    }

    @Test
    fun `state writes respect pointer escapes and keep untouched array items`() {
        val spec = Spec.decode("""
            {"root": "none", "elements": {}, "state": {"a/b": [{"x~y": false}, {"x~y": true}]}}
        """)
        val path = "/a~1b/0/x~0y"
        val updated = spec.state.withStateValue(path, JsonPrimitive(true))
        assertEquals(JsonPrimitive(true), updated.atPointer(path))
        assertEquals(JsonPrimitive(false), spec.state.atPointer(path))
        assertEquals(JsonPrimitive(true), updated.atPointer("/a~1b/1/x~0y"))
        assertEquals(updated, updated.withStateValue("/a~1b/5", JsonPrimitive(false)))
    }
}
