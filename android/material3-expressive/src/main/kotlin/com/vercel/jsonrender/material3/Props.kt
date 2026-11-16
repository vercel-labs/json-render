package com.vercel.jsonrender.material3

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.dp
import com.vercel.jsonrender.compose.ComponentContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.floatOrNull

internal fun JsonElement?.text(): String? =
    (this as? JsonPrimitive)?.takeIf { it.isString }?.content

internal fun JsonElement?.number(): Float? =
    (this as? JsonPrimitive)?.takeUnless { it.isString }?.floatOrNull?.takeIf(Float::isFinite)

internal fun ComponentContext.text(name: String): String? = props[name].text()

internal fun ComponentContext.number(name: String): Float? = props[name].number()

internal fun ComponentContext.flag(name: String): Boolean? =
    (props[name] as? JsonPrimitive)?.takeUnless { it.isString }?.booleanOrNull

internal val ComponentContext.enabled: Boolean get() = flag("disabled") != true

internal val ComponentContext.label: String get() = text("label") ?: text("text").orEmpty()

internal fun ComponentContext.gap() = when (text("gap")) {
    "none" -> 0.dp
    "xs" -> 4.dp
    "sm" -> 8.dp
    "lg" -> 24.dp
    "xl" -> 32.dp
    else -> number("gap")?.coerceIn(0f, 64f)?.dp ?: 16.dp
}

internal data class Option(val value: String, val label: String, val disabled: Boolean, val icon: String? = null)

internal fun ComponentContext.options(): List<Option> =
    (props["options"] as? JsonArray).orEmpty().mapNotNull { element ->
        when (element) {
            is JsonObject -> {
                val value = element["value"].text() ?: return@mapNotNull null
                val disabled = (element["disabled"] as? JsonPrimitive)
                    ?.takeUnless { it.isString }?.booleanOrNull == true
                Option(value, element["label"].text() ?: value, disabled, element["icon"].text())
            }
            else -> element.text()?.let { Option(it, it, false) }
        }
    }.distinctBy(Option::value)

internal fun JsonElement?.displayText(): String? =
    (this as? JsonPrimitive)?.takeUnless { it == JsonNull }?.content

@Composable
internal fun <T> ComponentContext.control(
    prop: String,
    initial: T,
    serialize: (T) -> JsonPrimitive,
): Pair<T, (T) -> Unit> {
    val bound = binding(prop) != null
    var local by remember(initial, bound) { mutableStateOf(initial) }
    return (if (bound) initial else local) to { value ->
        if (bound) write(prop, serialize(value)) else local = value
        emit("change")
    }
}
