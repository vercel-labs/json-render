package com.vercel.jsonrender.compose

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.text.BasicText
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Layout and text components built on Compose Foundation. */
val FoundationComponents: ComponentRegistry = mapOf(
    "Column" to { context ->
        Column(verticalArrangement = Arrangement.spacedBy(context.gap())) {
            context.RenderChildren()
        }
    },
    "Row" to { context ->
        Row(horizontalArrangement = Arrangement.spacedBy(context.gap())) {
            context.RenderChildren()
        }
    },
    "Stack" to { context ->
        if (context.props.string("direction") == "horizontal") {
            Row(horizontalArrangement = Arrangement.spacedBy(context.gap())) {
                context.RenderChildren()
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(context.gap())) {
                context.RenderChildren()
            }
        }
    },
    "Text" to { context -> BasicText(context.props.string("text").orEmpty()) },
)

private fun ComponentContext.gap(): Dp = when (props.string("gap")) {
    "none" -> 0.dp
    "xs" -> 4.dp
    "sm" -> 8.dp
    "lg" -> 24.dp
    "xl" -> 32.dp
    else -> 16.dp
}
