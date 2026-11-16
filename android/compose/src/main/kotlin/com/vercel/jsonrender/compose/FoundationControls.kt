package com.vercel.jsonrender.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

@Composable
internal fun FoundationButton(context: ComponentContext) {
    val enabled = !context.props.flag("disabled")
    val primary = context.props.string("variant") == "primary"
    val width = if (context.props.flag("fullWidth")) Modifier.fillMaxWidth() else Modifier
    Box(
        width.defaultMinSize(minHeight = 48.dp)
            .clip(controlShape)
            .background(if (primary && enabled) highlightColor else Color.Transparent)
            .border(1.dp, outlineColor, controlShape)
            .clickable(enabled = enabled, role = Role.Button) { context.emit("press") }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        val label = context.text("label").ifEmpty { context.text("text") }
        if (label.isEmpty()) context.RenderChildren()
        else BasicText(label, style = TextStyle(color = when {
            !enabled -> mutedColor
            primary -> Color.White
            else -> Color.Unspecified
        }, fontSize = 16.sp))
    }
}

@Composable
internal fun FoundationInput(context: ComponentContext) {
    val initial = context.text("value")
    val bound = context.binding("value") != null
    var local by remember(initial, bound) { mutableStateOf(initial) }
    val label = context.text("label")
    val placeholder = context.text("placeholder")
    val kind = context.props.string("type")
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (label.isNotEmpty()) Text(label, size = 14)
        BasicTextField(
            value = if (bound) initial else local,
            onValueChange = { value ->
                if (!bound) local = value
                context.write("value", JsonPrimitive(value))
                context.emit("change")
            },
            modifier = Modifier.fillMaxWidth()
                .border(1.dp, outlineColor, controlShape)
                .semantics { if (label.isNotEmpty()) contentDescription = label },
            textStyle = TextStyle(fontSize = 16.sp),
            enabled = !context.props.flag("disabled"),
            singleLine = !context.props.flag("multiline"),
            keyboardOptions = KeyboardOptions(keyboardType = when (kind) {
                "email" -> KeyboardType.Email
                "number" -> KeyboardType.Decimal
                "tel" -> KeyboardType.Phone
                "password" -> KeyboardType.Password
                else -> KeyboardType.Text
            }),
            visualTransformation = if (kind == "password") PasswordVisualTransformation() else VisualTransformation.None,
            cursorBrush = SolidColor(highlightColor),
            decorationBox = { field ->
                Box(Modifier.defaultMinSize(minHeight = 48.dp).padding(12.dp), contentAlignment = Alignment.CenterStart) {
                    if ((if (bound) initial else local).isEmpty() && placeholder.isNotEmpty()) {
                        Text(placeholder, muted = true)
                    }
                    field()
                }
            },
        )
    }
}

@Composable
internal fun FoundationToggle(context: ComponentContext, role: Role) {
    val initial = context.props.flag("checked")
    val bound = context.binding("checked") != null
    var local by remember(initial, bound) { mutableStateOf(initial) }
    val checked = if (bound) initial else local
    val toggleShape = if (role == Role.Switch) CircleShape else RoundedCornerShape(4.dp)
    val label = context.text("label")
    Row(
        Modifier.defaultMinSize(minHeight = 48.dp)
            .toggleable(checked, enabled = !context.props.flag("disabled"), role = role) { value ->
                if (!bound) local = value
                context.write("checked", JsonPrimitive(value))
                context.emit("change")
            },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            Modifier.size(width = if (role == Role.Switch) 38.dp else 22.dp, height = 22.dp)
                .background(if (checked) highlightColor else Color.Transparent, toggleShape)
                .border(1.dp, outlineColor, toggleShape)
                .padding(4.dp),
            contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart,
        ) {
            if (role == Role.Switch || checked) {
                Box(Modifier.size(12.dp).background(if (checked) Color.White else mutedColor, toggleShape))
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            if (label.isNotEmpty()) Text(label)
            val description = context.text("description")
            if (description.isNotEmpty()) Text(description, size = 14, muted = true)
        }
    }
}

private data class SelectOption(val value: String, val label: String)

@Composable
internal fun FoundationSelect(context: ComponentContext) {
    val options = (context.props["options"] as? JsonArray).orEmpty().asSequence().take(256).mapNotNull { option ->
        when (option) {
            is JsonObject -> option.string("value")?.let { SelectOption(it, option.string("label") ?: it) }
            is JsonPrimitive -> option.takeIf { it.isString }?.content?.let { SelectOption(it, it) }
            else -> null
        }
    }.toList()
    val bound = context.binding("value") != null
    val initial = context.text("value")
    var local by remember(initial, bound) { mutableStateOf(initial) }
    var expanded by remember { mutableStateOf(false) }
    val value = if (bound) initial else local
    val selected = options.firstOrNull { it.value == value }
    val enabled = options.isNotEmpty() && !context.props.flag("disabled")
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        val label = context.text("label")
        if (label.isNotEmpty()) Text(label, size = 14)
        Box(
            Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                .border(1.dp, outlineColor, controlShape)
                .clickable(enabled = enabled, role = Role.DropdownList) { expanded = !expanded }
                .padding(12.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            Text(selected?.label ?: context.text("placeholder").ifEmpty { "Select" })
        }
        if (expanded && enabled) {
            for (option in options) {
                Box(
                    Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                        .clickable(role = Role.Button) {
                            if (!bound) local = option.value
                            expanded = false
                            context.write("value", JsonPrimitive(option.value))
                            context.emit("change")
                        }.padding(12.dp),
                    contentAlignment = Alignment.CenterStart,
                ) { Text(option.label, bold = option == selected) }
            }
        }
    }
}
