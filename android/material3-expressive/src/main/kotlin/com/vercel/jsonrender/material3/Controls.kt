@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package com.vercel.jsonrender.material3

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ContainedLoadingIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ElevatedButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.LinearWavyProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.ToggleButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.vercel.jsonrender.compose.ComponentContext
import kotlinx.serialization.json.JsonPrimitive

@Composable
internal fun MaterialButton(context: ComponentContext) {
    val dismiss = LocalMenuDismiss.current
    val press = {
        dismiss()
        context.emit("press")
    }
    val label: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit = {
        context.text("icon")?.let {
            ControlIcon(it, "")
            androidx.compose.foundation.layout.Spacer(Modifier.padding(start = ButtonDefaults.IconSpacing))
        }
        Text(context.label)
    }
    val shapes = ButtonDefaults.shapes()
    when (context.text("variant")) {
        "secondary", "tonal" -> FilledTonalButton(press, shapes, enabled = context.enabled, content = label)
        "outline", "outlined" -> OutlinedButton(press, shapes, enabled = context.enabled, content = label)
        "elevated" -> ElevatedButton(press, shapes, enabled = context.enabled, content = label)
        "danger", "destructive" -> Button(
            press,
            shapes,
            enabled = context.enabled,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error,
                contentColor = MaterialTheme.colorScheme.onError,
            ),
            content = label,
        )
        else -> Button(press, shapes, enabled = context.enabled, content = label)
    }
}

@Composable
internal fun MaterialIconButton(context: ComponentContext) {
    FilledIconButton(onClick = { context.emit("press") }, enabled = context.enabled) {
        ControlIcon(context.text("icon"), context.label)
    }
}

@Composable
internal fun MaterialFloatingActionButton(context: ComponentContext) {
    if (!context.enabled) {
        FilledIconButton(onClick = {}, enabled = false) { ControlIcon(context.text("icon"), context.label) }
        return
    }
    FloatingActionButton(onClick = { context.emit("press") }) {
        ControlIcon(context.text("icon"), context.label)
    }
}

@Composable
internal fun MaterialToggleButton(context: ComponentContext) {
    val (checked, update) = context.control("checked", context.flag("checked") ?: false, ::JsonPrimitive)
    ToggleButton(checked, update, enabled = context.enabled) { Text(context.label) }
}

@Composable
internal fun MaterialSwitch(context: ComponentContext) {
    val (checked, update) = context.control("checked", context.flag("checked") ?: false, ::JsonPrimitive)
    Row(
        modifier = Modifier.fillMaxWidth()
            .toggleable(checked, enabled = context.enabled, role = Role.Switch, onValueChange = update)
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(context.label)
            context.text("description")?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
        }
        Switch(checked, onCheckedChange = null, enabled = context.enabled)
    }
}

@Composable
internal fun MaterialCheckbox(context: ComponentContext) {
    val (checked, update) = context.control("checked", context.flag("checked") ?: false, ::JsonPrimitive)
    Row(
        modifier = Modifier.toggleable(checked, enabled = context.enabled, role = Role.Checkbox, onValueChange = update)
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked, onCheckedChange = null, enabled = context.enabled)
        Text(context.label)
    }
}

@Composable
internal fun MaterialInput(context: ComponentContext, multiline: Boolean = false) {
    val (value, update) = context.control("value", context.text("value").orEmpty(), ::JsonPrimitive)
    val password = context.text("type") == "password" && !multiline
    val keyboard = when (context.text("type")) {
        "email" -> KeyboardType.Email
        "number" -> KeyboardType.Decimal
        "password" -> if (password) KeyboardType.Password else KeyboardType.Text
        "tel" -> KeyboardType.Phone
        "url" -> KeyboardType.Uri
        else -> KeyboardType.Text
    }
    val placeholder = context.text("placeholder")
    val description = context.text("description")
    OutlinedTextField(
        value,
        update,
        Modifier.fillMaxWidth(),
        enabled = context.enabled,
        readOnly = context.flag("readOnly") == true,
        label = context.label.takeIf { it.isNotEmpty() }?.let { { Text(it) } },
        placeholder = placeholder?.let { { Text(it) } },
        supportingText = description?.let { { Text(it) } },
        isError = context.flag("error") == true,
        singleLine = !multiline,
        minLines = if (multiline) 3 else 1,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
    )
}

@Composable
internal fun MaterialSelect(context: ComponentContext) {
    val options = context.options()
    val (value, update) = context.control("value", context.text("value").orEmpty(), ::JsonPrimitive)
    val selection = options.firstOrNull { it.value == value }?.label
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick = { expanded = true },
            enabled = context.enabled && options.isNotEmpty(),
        ) {
            Text(selection ?: context.text("placeholder") ?: context.label)
        }
        DropdownMenu(expanded && context.enabled, onDismissRequest = { expanded = false }) {
            for (option in options) {
                DropdownMenuItem(
                    text = { Text(option.label) },
                    enabled = !option.disabled,
                    onClick = {
                        expanded = false
                        update(option.value)
                    },
                )
            }
        }
    }
}

@Composable
internal fun MaterialRadioGroup(context: ComponentContext) {
    val (value, update) = context.control("value", context.text("value").orEmpty(), ::JsonPrimitive)
    Column(Modifier.selectableGroup()) {
        context.text("label")?.let { Text(it, style = MaterialTheme.typography.labelLarge) }
        for (option in context.options()) {
            val selected = option.value == value
            val enabled = context.enabled && !option.disabled
            Row(
                modifier = Modifier.fillMaxWidth().selectable(selected, enabled = enabled, role = Role.RadioButton) {
                    update(option.value)
                }.padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(selected, onClick = null, enabled = enabled)
                Text(option.label)
            }
        }
    }
}

@Composable
internal fun MaterialSlider(context: ComponentContext) {
    val min = context.number("min") ?: 0f
    val max = context.number("max") ?: 100f
    // Compose's slider needs a positive, finite range.
    if (max <= min || !(max - min).isFinite()) return
    val (value, update) = context.control("value", context.number("value") ?: min, ::JsonPrimitive)
    val label = context.text("label")
    val steps = context.number("steps")?.toInt()?.coerceIn(0, 100) ?: 0
    val range = min..max
    val sliderState = remember(steps, range) { SliderState(value.coerceIn(min, max), steps, range) }
    sliderState.value = value.coerceIn(min, max)
    Column {
        label?.let { Text(it) }
        Slider(
            state = sliderState,
            onValueChange = update,
            modifier = Modifier.semantics { label?.let { contentDescription = it } },
            enabled = context.enabled,
        )
    }
}

@Composable
internal fun MaterialLoadingIndicator(context: ComponentContext) {
    val progress = context.number("value")?.coerceIn(0f, 100f)?.div(100f)
    Row(
        modifier = Modifier.semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (progress == null) ContainedLoadingIndicator()
        else ContainedLoadingIndicator(progress = { progress })
        context.text("label")?.let { Text(it) }
    }
}

@Composable
internal fun MaterialProgress(context: ComponentContext) {
    val label = context.text("label")
    val maximum = context.number("max")?.takeIf { it > 0 } ?: 100f
    val progress = context.number("value")?.coerceIn(0f, maximum)?.div(maximum)
    val modifier = Modifier.fillMaxWidth().semantics {
        label?.let { contentDescription = it }
    }
    if (progress == null) LinearWavyProgressIndicator(modifier = modifier)
    else LinearWavyProgressIndicator(progress = { progress }, modifier = modifier)
}
