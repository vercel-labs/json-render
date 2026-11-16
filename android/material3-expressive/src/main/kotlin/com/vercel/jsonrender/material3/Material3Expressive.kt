@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)

package com.vercel.jsonrender.material3

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.vercel.jsonrender.compose.ComponentRegistry
import com.vercel.jsonrender.compose.FoundationComponents

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
    "Grid" to { MaterialGrid(it) },
    "Text" to { MaterialText(it) },
    "Heading" to { MaterialHeading(it) },
    "Card" to { MaterialCard(it) },
    "Surface" to { MaterialSurface(it) },
    "Metric" to { MaterialMetric(it) },
    "Badge" to { MaterialBadge(it) },
    "Alert" to { MaterialAlert(it) },
    "List" to { MaterialList(it) },
    "ListItem" to { MaterialListItem(it) },
    "BarChart" to { MaterialChart(it, bars = true) },
    "LineChart" to { MaterialChart(it, bars = false) },
    "Separator" to { HorizontalDivider() },
    "Divider" to { HorizontalDivider() },
    "Spacer" to {
        val size = it.number("size")?.coerceIn(0f, 256f)?.dp ?: 8.dp
        Spacer(Modifier.width(size).height(size))
    },
    "Image" to { MaterialImage(it) },
    "Button" to { MaterialButton(it) },
    "IconButton" to { MaterialIconButton(it) },
    "FloatingActionButton" to { MaterialFloatingActionButton(it) },
    "ToggleButton" to { MaterialToggleButton(it) },
    "Switch" to { MaterialSwitch(it) },
    "Toggle" to { MaterialSwitch(it) },
    "Checkbox" to { MaterialCheckbox(it) },
    "Input" to { MaterialInput(it) },
    "Textarea" to { MaterialInput(it, multiline = true) },
    "Select" to { MaterialSelect(it) },
    "RadioGroup" to { MaterialRadioGroup(it) },
    "Slider" to { MaterialSlider(it) },
    "SegmentedButtonGroup" to { MaterialSegments(it) },
    "SegmentedPicker" to { MaterialSegments(it) },
    "Tabs" to { MaterialTabs(it) },
    "NavigationBar" to { MaterialNavigationBar(it) },
    "TopAppBar" to { MaterialTopAppBar(it) },
    "FloatingToolbar" to { MaterialFloatingToolbar(it) },
    "Toolbar" to { MaterialFloatingToolbar(it) },
    "Menu" to { MaterialMenu(it) },
    "Dialog" to { MaterialDialog(it) },
    "LoadingIndicator" to { MaterialLoadingIndicator(it) },
    "Progress" to { MaterialProgress(it) },
    "ProgressBar" to { MaterialProgress(it) },
)

/** The Compose Foundation layout components and the Material 3 Expressive catalog. */
val Material3ExpressiveComponents: ComponentRegistry = FoundationComponents + expressiveComponents
