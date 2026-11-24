package com.vercel.jsonrender.compose

import java.util.UUID
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull

typealias ActionHandler = suspend (JsonObject) -> Unit

/**
 * Runs registered Android handlers and shared state actions on the caller's coroutine.
 * State access callbacks should use the same dispatcher as the renderer.
 */
class ActionDispatcher(
    private val readState: () -> JsonObject,
    private val replaceState: (JsonObject) -> Unit,
    private val handlers: Map<String, ActionHandler> = emptyMap(),
    private val confirm: (suspend (JsonObject) -> Boolean)? = null,
    private val navigate: ((String) -> Unit)? = null,
    private val expressions: ExpressionRegistry = ExpressionRegistry(),
) {
    suspend fun dispatch(binding: ActionBinding) = dispatch(binding, 0)

    private suspend fun dispatch(binding: ActionBinding, depth: Int) {
        require(depth <= 32) { "Action chain exceeds the maximum depth" }
        val confirmation = (binding.source["confirm"] as? JsonObject)?.let(::resolveConfirmation)
        if (confirmation != null && confirm?.invoke(confirmation) != true) return
        if (runStateAction(binding)) return
        val handler = handlers[binding.action] ?: return
        val error = try {
            handler(binding.params)
            null
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            error
        }
        if (error == null) {
            followUp(binding.source["onSuccess"] as? JsonObject, null, depth)
        } else {
            val failure = binding.source["onError"] as? JsonObject ?: throw error
            followUp(failure, error, depth)
        }
    }

    private fun resolveConfirmation(form: JsonObject): JsonObject {
        val context = Expressions(readState(), null, expressions)
        return JsonObject(form.mapValues { (key, value) ->
            if (key !in setOf("title", "message") || value !is JsonPrimitive || !value.isString) value
            else context.resolve(JsonObject(mapOf("\$template" to value))) ?: value
        })
    }

    private suspend fun followUp(
        followUp: JsonObject?,
        failure: Exception?,
        depth: Int,
    ) {
        if (followUp == null) return
        val updates = followUp["set"] as? JsonObject
        val destination = followUp.string("navigate")
        when {
            updates != null -> {
                val before = readState()
                val after = updates.entries.fold(before) { state, (path, raw) ->
                    val value = if (failure != null && raw == JsonPrimitive("\$error.message")) {
                        JsonPrimitive(failure.message.orEmpty())
                    } else raw
                    state.withStateValue(path, value)
                }
                publish(before, after)
            }
            destination != null && failure == null -> navigate?.invoke(destination)
            else -> for (action in resolveActions(followUp, readState(), null, expressions)) {
                dispatch(action, depth + 1)
            }
        }
    }

    private fun runStateAction(binding: ActionBinding): Boolean {
        if (binding.action !in stateActions) return false
        val path = binding.params.string("statePath") ?: return true
        val before = readState()
        val value = binding.params["value"] ?: JsonNull
        val current = before.stateValue(path) as? JsonArray
        val next = when (binding.action) {
            "setState" -> before.withStateValue(path, value)
            "pushState" -> {
                if (!fitsJsonDocument(value)) return true
                val item = resolvePushValue(value)
                val appended = before.withStateValue(path, JsonArray(current.orEmpty() + item))
                val clear = binding.params.string("clearStatePath")
                if (appended === before || clear == null) appended
                else appended.withStateValue(clear, JsonPrimitive(""))
            }
            else -> {
                val index = (binding.params["index"] as? JsonPrimitive)?.takeUnless { it.isString }?.intOrNull
                if (current == null || index == null || index !in current.indices) return true
                before.withStateValue(path, JsonArray(current.toMutableList().apply { removeAt(index) }))
            }
        }
        publish(before, next)
        return true
    }

    private fun publish(before: JsonObject, next: JsonObject) {
        if (before !== next && before != next) replaceState(next)
    }

    private fun resolvePushValue(value: JsonElement): JsonElement = when (value) {
        JsonPrimitive("\$id") -> newId()
        is JsonObject -> if (value.size == 1 && "\$id" in value) newId()
            else JsonObject(value.mapValues { (_, child) -> resolvePushValue(child) })
        is JsonArray -> JsonArray(value.map(::resolvePushValue))
        is JsonPrimitive -> value
    }

    private fun newId() = JsonPrimitive(UUID.randomUUID().toString())

    private companion object {
        val stateActions = setOf("setState", "pushState", "removeState")
    }
}
