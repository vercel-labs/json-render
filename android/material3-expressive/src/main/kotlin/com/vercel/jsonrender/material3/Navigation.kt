@file:OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalMaterial3ExpressiveApi::class,
)

package com.vercel.jsonrender.material3

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalFloatingToolbar
import androidx.compose.material3.PrimaryScrollableTabRow
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.ShortNavigationBar
import androidx.compose.material3.ShortNavigationBarItem
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import com.vercel.jsonrender.compose.ComponentContext
import kotlinx.serialization.json.JsonPrimitive

@Composable
internal fun MaterialSegments(context: ComponentContext) {
    val options = context.options().take(5)
    val (value, update) = context.control("value", context.text("value").orEmpty(), ::JsonPrimitive)
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        options.forEachIndexed { index, option ->
            SegmentedButton(
                selected = option.value == value,
                onClick = { update(option.value) },
                enabled = context.enabled && !option.disabled,
                shape = SegmentedButtonDefaults.itemShape(index, options.size),
                label = { Text(option.label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
            )
        }
    }
}

@Composable
internal fun MaterialTabs(context: ComponentContext) {
    val options = context.options()
    if (options.isEmpty()) return
    val (value, update) = context.control(
        "value", context.text("value") ?: options.first().value, ::JsonPrimitive,
    )
    val index = options.indexOfFirst { it.value == value }.coerceAtLeast(0)
    PrimaryScrollableTabRow(selectedTabIndex = index) {
        for (option in options) {
            Tab(
                selected = option.value == value,
                onClick = { update(option.value) },
                enabled = context.enabled && !option.disabled,
                text = { Text(option.label) },
            )
        }
    }
}

@Composable
internal fun MaterialNavigationBar(context: ComponentContext) {
    val options = context.options().take(5)
    if (options.isEmpty()) return
    val (value, update) = context.control(
        "value", context.text("value") ?: options.first().value, ::JsonPrimitive,
    )
    ShortNavigationBar {
        for (option in options) {
            ShortNavigationBarItem(
                selected = option.value == value,
                onClick = { update(option.value) },
                enabled = context.enabled && !option.disabled,
                icon = { ControlIcon(option.icon, "") },
                label = { Text(option.label) },
            )
        }
    }
}

@Composable
internal fun MaterialTopAppBar(context: ComponentContext) {
    TopAppBar(
        title = { Text(context.text("title") ?: context.label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
        navigationIcon = { context.RenderSlot("navigation") },
        actions = {
            context.RenderSlot("actions")
            context.RenderChildren()
        },
    )
}

@Composable
internal fun MaterialFloatingToolbar(context: ComponentContext) {
    val label = context.text("label")
    HorizontalFloatingToolbar(
        expanded = context.flag("expanded") ?: true,
        modifier = Modifier.semantics { label?.let { contentDescription = it } },
        leadingContent = { context.RenderSlot("leading") },
        trailingContent = { context.RenderSlot("trailing") },
    ) {
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(context.gap()),
            verticalAlignment = Alignment.CenterVertically,
        ) { context.RenderChildren() }
    }
}

internal val LocalMenuDismiss = staticCompositionLocalOf<() -> Unit> { {} }

@Composable
internal fun MaterialMenu(context: ComponentContext) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        FilledTonalButton(onClick = { expanded = true }, enabled = context.enabled) {
            context.text("icon")?.let { ControlIcon(it, "") }
            Text(context.label)
        }
        DropdownMenu(expanded && context.enabled, onDismissRequest = { expanded = false }) {
            CompositionLocalProvider(LocalMenuDismiss provides { expanded = false }) {
                context.RenderChildren()
            }
        }
    }
}

@Composable
internal fun MaterialDialog(context: ComponentContext) {
    val (open, update) = context.control("open", context.flag("open") ?: false, ::JsonPrimitive)
    if (!open) return
    val dismiss = {
        update(false)
        context.emit("dismiss")
    }
    AlertDialog(
        onDismissRequest = dismiss,
        title = { Text(context.text("title").orEmpty()) },
        text = {
            androidx.compose.foundation.layout.Column {
                context.text("description")?.let { Text(it) }
                context.RenderChildren()
            }
        },
        dismissButton = {
            context.text("dismissLabel")?.let { label -> TextButton(onClick = dismiss) { Text(label) } }
        },
        confirmButton = {
            TextButton(onClick = {
                update(false)
                context.emit("confirm")
            }) { Text(context.text("confirmLabel") ?: "OK") }
        },
    )
}
