@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)

package com.vercel.jsonrender.material3

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.ContainedLoadingIndicator
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.LinearWavyProgressIndicator
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Text
import androidx.compose.material3.ToggleButton
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.vercel.jsonrender.compose.ComponentContext
import com.vercel.jsonrender.compose.ComponentRegistry
import com.vercel.jsonrender.compose.FoundationComponents
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.floatOrNull

/** Wraps rendered content in AndroidX's Material Expressive theme. */
@Composable
fun JsonRenderExpressiveTheme(
    colorScheme: ColorScheme? = null,
    shapes: Shapes? = null,
    typography: Typography? = null,
    content: @Composable () -> Unit,
) {
    MaterialExpressiveTheme(
        colorScheme = colorScheme,
        shapes = shapes,
        typography = typography,
        content = content,
    )
}

private val expressiveComponents: ComponentRegistry = mapOf(
    "Text" to { context: ComponentContext -> Text(context.text("text").orEmpty()) },
    "Heading" to { context: ComponentContext ->
        Text(context.text("text").orEmpty(), style = MaterialTheme.typography.headlineMedium)
    },
    "Card" to { context: ComponentContext -> ExpressiveCard(context) },
    "Button" to { context: ComponentContext -> ExpressiveButton(context) },
    "ToggleButton" to { context: ComponentContext -> ExpressiveToggleButton(context) },
    "LoadingIndicator" to { context: ComponentContext -> ExpressiveLoadingIndicator(context) },
    "Progress" to { context: ComponentContext -> ExpressiveProgress(context) },
)

/** Foundation layouts with Material text, cards, actions, and progress indicators. */
val Material3ExpressiveComponents: ComponentRegistry = FoundationComponents + expressiveComponents

@Composable
private fun ExpressiveCard(context: ComponentContext) {
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            context.text("title")?.let { Text(it, style = MaterialTheme.typography.titleLarge) }
            context.text("description")?.let { Text(it) }
            context.RenderChildren()
        }
    }
}

@Composable
private fun ExpressiveButton(context: ComponentContext) {
    Button(
        onClick = { context.emit("press") },
        enabled = !context.flag("disabled"),
        shapes = ButtonDefaults.shapes(),
    ) {
        Text(context.text("label").orEmpty())
    }
}

@Composable
private fun ExpressiveToggleButton(context: ComponentContext) {
    ToggleButton(
        checked = context.flag("checked"),
        onCheckedChange = { checked ->
            context.write("checked", JsonPrimitive(checked))
            context.emit("change")
        },
        enabled = !context.flag("disabled"),
    ) {
        Text(context.text("label").orEmpty())
    }
}

@Composable
private fun ExpressiveLoadingIndicator(context: ComponentContext) {
    Row(
        modifier = Modifier.semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ContainedLoadingIndicator()
        context.text("label")?.let { Text(it) }
    }
}

@Composable
private fun ExpressiveProgress(context: ComponentContext) {
    val label = context.text("label")
    val progress = (context.props["value"] as? JsonPrimitive)
        ?.takeUnless { it.isString }
        ?.floatOrNull
        ?.takeIf { it.isFinite() }
        ?.coerceIn(0f, 100f)
        ?.div(100f)
    val modifier = Modifier.fillMaxWidth().semantics {
        label?.let { contentDescription = it }
    }
    if (progress == null) {
        LinearWavyProgressIndicator(modifier = modifier)
    } else {
        LinearWavyProgressIndicator(progress = { progress }, modifier = modifier)
    }
}

private fun ComponentContext.text(name: String): String? =
    (props[name] as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun ComponentContext.flag(name: String): Boolean =
    (props[name] as? JsonPrimitive)?.takeUnless { it.isString }?.booleanOrNull == true
