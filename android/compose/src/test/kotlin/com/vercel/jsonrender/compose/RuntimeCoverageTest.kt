package com.vercel.jsonrender.compose

import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.int

class RuntimeCoverageTest {
    @Test
    fun `custom directives and computed props receive resolved data`() {
        val spec = Spec.decode($$"""
            {
                "root": "main",
                "elements": {
                    "main": {
                        "type":"Text",
                        "props": {
                            "text": {"$upper":{"$state":"/name"}},
                            "total":{"$computed":"squared","args":{"value":{"$state":"/quantity"}}}
                        }
                    }
                },
                "state":{"name":"Ada","quantity":4}
            }
        """)
        val registry = ExpressionRegistry(
            functions = mapOf("squared" to { args ->
                val number = (args["value"] as JsonPrimitive).int
                JsonPrimitive(number * number)
            }),
            directives = mapOf("\$upper" to { form, context ->
                JsonPrimitive((context.resolve(form.getValue("\$upper")) as JsonPrimitive).content.uppercase())
            }),
        )
        val props = checkNotNull(buildRenderTree(spec, FoundationComponents.keys, spec.state, registry)).props
        assertEquals(JsonPrimitive("ADA"), props["text"])
        assertEquals(JsonPrimitive(16), props["total"])
    }

    @Test
    fun `watchers baseline initial state and emit only on changed values even when hidden`() {
        val spec = Spec.decode("""
            {
                "root":"main",
                "elements":{
                    "main":{"type":"Column","children":["status"]},
                    "status":{"type":"Text","visible":false,"watch":{"/ready":{"action":"refresh"}}}
                },
                "state":{"ready":false}
            }
        """)
        val registry = ExpressionRegistry()
        val first = buildRender(spec, FoundationComponents.keys, spec.state, registry)
        assertTrue(first.root?.children.orEmpty().isEmpty())
        assertEquals(1, first.watches.size)
        val tracker = WatchTracker()
        assertTrue(tracker.changes(first.watches).isEmpty())
        val after = spec.state.withStateValue("/ready", JsonPrimitive(true))
        val second = buildRender(spec, FoundationComponents.keys, after, registry)
        assertEquals(JsonPrimitive(true), tracker.changes(second.watches).single().value)
        assertTrue(tracker.changes(second.watches).isEmpty())
        tracker.changes(emptyList())
        assertTrue(tracker.changes(second.watches).isEmpty())
    }

    @Test
    fun `consecutive watch actions reach the cascade cap and restart on a silent state update`() {
        val tracker = WatchTracker(limit = 2)
        val watch = WatchRecord("root", null, "/enabled", JsonPrimitive(true), JsonPrimitive("reload"))
        assertTrue(tracker.changes(listOf(watch)).isEmpty())
        val next = watch.copy(value = JsonPrimitive(false))
        assertEquals(listOf(next), tracker.changes(listOf(next)))
        assertTrue(tracker.allowDispatch())
        assertEquals(listOf(watch), tracker.changes(listOf(watch)))
        assertTrue(tracker.allowDispatch())
        assertEquals(listOf(next), tracker.changes(listOf(next)))
        assertFalse(tracker.allowDispatch())
        assertTrue(tracker.changes(listOf(next)).isEmpty())
        assertTrue(tracker.allowDispatch())
    }

    @Test
    fun `template expansion abandons oversized render trees`() {
        val state = JsonObject(mapOf("data" to JsonPrimitive("x".repeat(250_001))))
        val reference = JsonPrimitive("\${/data}".repeat(8))
        val spec = Spec("text", mapOf(
            "text" to Element("Text", JsonObject(mapOf("text" to JsonObject(mapOf("\$template" to reference))))),
        ))
        assertNull(buildRenderTree(spec, FoundationComponents.keys, state))
    }

    @Test
    fun `validation reports malformed specs and graph errors`() {
        assertFalse(validateSpec("{").valid)
        val errors = validateSpec("""
            {"root":"loop","elements":{
                "loop":{"type":"Column","children":["loop","absent"]},
                "unregistered":{"type":"Mystery"}
            }}
        """, FoundationComponents.keys).issues.map { it.path }
        assertEquals(setOf("/elements/loop/children/0", "/elements/loop/children/1", "/elements/unregistered/type"), errors.toSet())
    }

    @Test
    fun `confirmation built-ins and handler follow-ups update the host snapshot`() = sync {
        var state = JsonObject(mapOf("draft" to JsonPrimitive("Ready")))
        val visited = mutableListOf<String>()
        val dispatcher = ActionDispatcher(
            readState = { state },
            replaceState = { state = it },
            handlers = mapOf(
                "success" to { visited.add("handler") },
                "fail" to { throw IllegalStateException("Could not sync") },
            ),
            confirm = { it.string("title") == "Continue" },
            navigate = { visited.add(it) },
        )
        fun action(json: String) = resolveActions(
            kotlinx.serialization.json.Json.parseToJsonElement(json), state, null,
        ).single()
        dispatcher.dispatch(action("""{"action":"success","confirm":{"title":"Cancel"}}"""))
        assertTrue(visited.isEmpty())
        dispatcher.dispatch(action("""{"action":"success","confirm":{"title":"Continue"},"onSuccess":{"navigate":"/done"}}"""))
        assertEquals(listOf("handler", "/done"), visited)
        dispatcher.dispatch(action("""{"action":"pushState","params":{"statePath":"/items","value":"Saved","clearStatePath":"/draft"}}"""))
        assertEquals(JsonArray(listOf(JsonPrimitive("Saved"))), state["items"])
        assertEquals(JsonPrimitive(""), state["draft"])
        dispatcher.dispatch(action("""{"action":"removeState","params":{"statePath":"/items","index":0}}"""))
        assertEquals(JsonArray(emptyList()), state["items"])
        dispatcher.dispatch(action($$"""{"action":"pushState","params":{"statePath":"/items","value":{"first":"$id","second":{"$id":true}}}}"""))
        val first = (state.stateValue("/items/0/first") as JsonPrimitive).content
        val second = (state.stateValue("/items/0/second") as JsonPrimitive).content
        assertTrue(first.isNotBlank() && second.isNotBlank() && first != second)
        assertFalse(first == "\$id")
        dispatcher.dispatch(action($$"""{"action":"fail","onError":{"set":{"/message":"$error.message"}}}"""))
        assertEquals(JsonPrimitive("Could not sync"), state["message"])
        dispatcher.dispatch(action("""{"action":"setState","params":{"statePath":"/data/0/title","value":"Created"}}"""))
        assertEquals(JsonPrimitive("Created"), state.stateValue("/data/0/title"))
    }

    private fun sync(test: suspend () -> Unit) {
        var completion: Result<Unit>? = null
        test.startCoroutine(object : Continuation<Unit> {
            override val context = EmptyCoroutineContext
            override fun resumeWith(result: Result<Unit>) {
                completion = result
            }
        })
        checkNotNull(completion).getOrThrow()
    }
}
