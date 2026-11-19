package com.vercel.jsonrender.compose

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

class SpecStreamCompilerTest {
    @Test
    fun `recorded Swift demo streams produce renderable specs`() {
        for (name in listOf("coffee-shop", "smart-home", "tokyo-trip")) {
            val recorded = checkNotNull(javaClass.getResourceAsStream("/$name.json"))
                .bufferedReader().use { it.readText() }
            val chunks = (Json.parseToJsonElement(recorded) as JsonObject)["chunks"] as JsonArray
            val compiler = SpecStreamCompiler()
            val raw = buildString {
                for (chunk in chunks) {
                    val text = (chunk as JsonObject).string("text").orEmpty()
                    compiler.push(text)
                    append(text)
                }
            }
            compiler.finish()
            val spec = assertNotNull(compiler.currentSpec(), name)
            assertTrue(spec.root in spec.elements, name)
            val elements = compiler.result["elements"] as JsonObject
            assertEquals(elements.size, spec.elements.size, name)
            val additions = raw.lineSequence().count { it.contains("\"/elements/") && it.contains("\"op\":\"add\"") }
            assertTrue(spec.elements.size >= additions, name)
        }
    }

    @Test
    fun `partial writes create missing parents and finish processes one pending line`() {
        val compiler = SpecStreamCompiler()
        compiler.push("""{"op":"add","path":"/root","value":"main"}""" + "\n")
        compiler.push("""{"op":"add","path":"/elements/main","value":""")
        assertNull(compiler.currentSpec())
        compiler.push("""{"type":"Column","children":["label"]}}""" + "\n")
        assertEquals("Column", compiler.currentSpec()?.elements?.get("main")?.type)
        compiler.push("""{"op":"replace","path":"/elements/label/type","value":"Text"}""")
        assertNull(compiler.currentSpec()?.elements?.get("label"))
        compiler.finish()
        assertEquals("Text", compiler.currentSpec()?.elements?.get("label")?.type)
        assertEquals(compiler.result, compiler.finish())
    }

    @Test
    fun `patches support escaped pointers and atomic array operations`() {
        val original = Json.parseToJsonElement("""{"a/b":[1,2,3],"~":true}""")
        val moved = JsonPatch("move", "/a~1b/-", from = "/a~1b/0").applyTo(original)
        val copied = JsonPatch("copy", "/a~1b/1", from = "/~0").applyTo(moved)
        assertEquals(Json.parseToJsonElement("""{"a/b":[2,true,3,1],"~":true}"""), copied)
        assertEquals(copied, JsonPatch("test", "/a~1b/3", JsonPrimitive(1.0)).applyTo(copied))
        assertFailsWith<IllegalArgumentException> {
            JsonPatch("move", "/a~1b/99", from = "/a~1b/0").applyTo(copied)
        }
        assertFailsWith<IllegalArgumentException> { JsonPatch("remove", "/~2").applyTo(copied) }
        val removed = JsonPatch("remove", "/a~1b/1").applyTo(copied)
        assertEquals(Json.parseToJsonElement("""{"a/b":[2,3,1],"~":true}"""), removed)
    }

    @Test
    fun `oversized lines and expanding copies leave a bounded document`() {
        val compiler = SpecStreamCompiler()
        compiler.push("x".repeat(1_000_010))
        assertEquals(1, compiler.push("\n" + """{"op":"add","path":"/data","value":[1]}""" + "\n").size)
        repeat(24) { compiler.push("""{"op":"copy","from":"","path":"/copy"}""" + "\n") }
        assertNotNull(compiler.result["copy"])
        assertTrue(compiler.result.toString().length < 4_000_000)
    }
}
