package com.vercel.jsonrender.compose

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull

/** Provides a painter for the host's allowed image sources. */
val LocalJsonRenderImagePainter = staticCompositionLocalOf<@Composable (String) -> Painter?> { { null } }

/** Native layout, content, and form components built on Compose Foundation. */
val FoundationComponents: ComponentRegistry = mapOf(
    "Column" to { Stack(it, horizontal = false) },
    "Row" to { Stack(it, horizontal = true) },
    "Stack" to { Stack(it, horizontal = it.props.string("direction") == "horizontal") },
    "Grid" to { Grid(it) },
    "Spacer" to { Spacer(Modifier.size(it.props["size"].spacing(8))) },
    "Text" to { Text(it.text("text"), muted = it.props.string("variant") == "muted") },
    "Heading" to { Heading(it) },
    "Card" to { Panel(it.text("title"), it.text("description"), children = { it.RenderChildren() }) },
    "List" to { List(it) },
    "ListItem" to { ListItem(it) },
    "Badge" to { Badge(it) },
    "Alert" to { Alert(it) },
    "Metric" to { Metric(it) },
    "Divider" to { Divider(it) },
    "Separator" to { Divider(it) },
    "Progress" to { Progress(it) },
    "ProgressBar" to { Progress(it) },
    "Image" to { Image(it) },
    "BarChart" to { Chart(it, bars = true) },
    "LineChart" to { Chart(it, bars = false) },
    "Button" to { FoundationButton(it) },
    "Input" to { FoundationInput(it) },
    "Switch" to { FoundationToggle(it, Role.Switch) },
    "Toggle" to { FoundationToggle(it, Role.Switch) },
    "Checkbox" to { FoundationToggle(it, Role.Checkbox) },
    "Select" to { FoundationSelect(it) },
)

internal val controlShape = RoundedCornerShape(10.dp)
internal val outlineColor = Color(0x66707A80)
internal val highlightColor = Color(0xFF22695B)
internal val mutedColor = Color(0xFF60686E)

internal fun JsonObject.number(name: String): Double? =
    (get(name) as? JsonPrimitive)?.takeUnless { it.isString }?.doubleOrNull?.takeIf { it.isFinite() }

internal fun JsonObject.flag(name: String) =
    (get(name) as? JsonPrimitive)?.takeUnless { it.isString }?.booleanOrNull == true

internal fun JsonElement?.label(): String = (this as? JsonPrimitive)?.takeUnless { it == JsonNull }?.content.orEmpty()

internal fun ComponentContext.text(name: String): String = props[name].label()

private fun JsonElement?.spacing(fallback: Int): Dp {
    val value = this as? JsonPrimitive
    val number = value?.takeUnless { it.isString }?.doubleOrNull?.takeIf { it.isFinite() }
    return number?.coerceIn(0.0, 96.0)?.dp ?: when (value?.content) {
        "none" -> 0.dp
        "xs" -> 4.dp
        "sm" -> 8.dp
        "md" -> 16.dp
        "lg" -> 24.dp
        "xl" -> 32.dp
        "2xl" -> 40.dp
        else -> fallback.dp
    }
}

private fun ComponentContext.gap(fallback: Int = 16): Dp =
    (props["gap"] ?: props["spacing"]).spacing(fallback)

@Composable
internal fun Text(label: String, modifier: Modifier = Modifier, muted: Boolean = false, size: Int = 16, bold: Boolean = false) {
    BasicText(
        label,
        modifier,
        style = TextStyle(
            color = if (muted) mutedColor else Color.Unspecified,
            fontSize = size.sp,
            fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal,
        ),
    )
}

@Composable
private fun Stack(context: ComponentContext, horizontal: Boolean) {
    val alignment = context.props.string("align")
    val justification = context.props.string("justify")
    val gap = context.gap()
    if (horizontal) {
        Row(
            horizontalArrangement = when (justification) {
                "between" -> Arrangement.SpaceBetween
                "center" -> Arrangement.spacedBy(gap, Alignment.CenterHorizontally)
                "end" -> Arrangement.spacedBy(gap, Alignment.End)
                else -> Arrangement.spacedBy(gap)
            },
            verticalAlignment = when (alignment) {
                "start" -> Alignment.Top
                "end" -> Alignment.Bottom
                else -> Alignment.CenterVertically
            },
        ) { context.RenderChildren() }
    } else {
        Column(
            verticalArrangement = when (justification) {
                "between" -> Arrangement.SpaceBetween
                "center" -> Arrangement.spacedBy(gap, Alignment.CenterVertically)
                "end" -> Arrangement.spacedBy(gap, Alignment.Bottom)
                else -> Arrangement.spacedBy(gap)
            },
            horizontalAlignment = when (alignment) {
                "center" -> Alignment.CenterHorizontally
                "end" -> Alignment.End
                else -> Alignment.Start
            },
        ) { context.RenderChildren() }
    }
}

@Composable
private fun Grid(context: ComponentContext) {
    val count = (context.props.number("columns")?.toInt() ?: 2).coerceIn(1, 6)
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        maxItemsInEachRow = count,
        horizontalArrangement = Arrangement.spacedBy(context.gap(12)),
        verticalArrangement = Arrangement.spacedBy(context.gap(12)),
    ) {
        context.RenderChildren { content ->
            Box(Modifier.weight(1f)) { content() }
        }
    }
}

@Composable
private fun Heading(context: ComponentContext) {
    val size = when (context.text("level")) {
        "h2", "2" -> 24
        "h3", "3" -> 20
        "h4", "4" -> 18
        "h5", "5", "h6", "6" -> 16
        else -> 30
    }
    Text(context.text("text"), Modifier.semantics { heading() }, size = size, bold = true)
}

@Composable
private fun Panel(title: String, subtitle: String, children: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxWidth().border(1.dp, outlineColor, controlShape).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (title.isNotEmpty()) Text(title, size = 18, bold = true)
        if (subtitle.isNotEmpty()) Text(subtitle, muted = true, size = 14)
        children()
    }
}

@Composable
private fun List(context: ComponentContext) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(context.gap(8))) {
        val title = context.text("title")
        if (title.isNotEmpty()) Text(title, size = 18, bold = true)
        context.RenderChildren()
    }
}

@Composable
private fun ListItem(context: ComponentContext) {
    val target = if (context.hasEvent("press")) {
        Modifier.clickable(role = Role.Button) { context.emit("press") }.defaultMinSize(minHeight = 48.dp)
    } else Modifier
    Row(
        target.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        context.RenderSlot("leading")
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(context.text("title"), bold = true)
            val subtitle = context.text("subtitle")
            if (subtitle.isNotEmpty()) Text(subtitle, muted = true, size = 14)
            context.RenderChildren()
        }
        val trailing = context.text("trailing")
        if (trailing.isNotEmpty()) Text(trailing, muted = true)
        context.RenderSlot("trailing")
    }
}

@Composable
private fun Badge(context: ComponentContext) {
    val tint = if (context.text("variant") == "destructive") Color(0xFFAB352E) else highlightColor
    Text(
        context.text("text").ifEmpty { context.text("label") },
        Modifier.background(tint.copy(alpha = .13f), controlShape).padding(horizontal = 8.dp, vertical = 4.dp),
        size = 13, bold = true,
    )
}

@Composable
private fun Alert(context: ComponentContext) {
    Panel(context.text("title"), context.text("message").ifEmpty { context.text("description") }) {
        context.RenderChildren()
    }
}

@Composable
private fun Metric(context: ComponentContext) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(context.text("label"), muted = true, size = 14)
        Text(context.text("value"), size = 24, bold = true)
        val detail = context.text("detail")
        if (detail.isNotEmpty()) Text(detail, muted = true, size = 14)
    }
}

@Composable
private fun Divider(context: ComponentContext) {
    val size = if (context.text("orientation") == "vertical") Modifier.width(1.dp).height(24.dp)
        else Modifier.fillMaxWidth().height(1.dp)
    Box(size.background(outlineColor))
}

@Composable
private fun Progress(context: ComponentContext) {
    val maximum = (context.props.number("max") ?: 100.0).coerceAtLeast(0.0001)
    val value = (context.props.number("value")?.div(maximum) ?: context.props.number("progress") ?: 0.0)
        .coerceIn(0.0, 1.0).toFloat()
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        val label = context.text("label")
        if (label.isNotEmpty()) Text(label, size = 14)
        Box(Modifier
            .fillMaxWidth()
            .height(6.dp)
            .clip(controlShape)
            .background(outlineColor)
            .semantics { progressBarRangeInfo = ProgressBarRangeInfo(value, 0f..1f) }
        ) {
            Box(Modifier.fillMaxWidth(value).height(6.dp).background(highlightColor))
        }
    }
}

@Composable
private fun Image(context: ComponentContext) {
    val source = context.text("src")
    val alt = context.props.string("alt")
    val painter = if (source.isNotEmpty()) LocalJsonRenderImagePainter.current(source) else null
    val height = (context.props.number("height") ?: 160.0).coerceIn(1.0, 1000.0).dp
    val width = context.props.number("width")?.coerceIn(1.0, 1000.0)?.dp
    val size = (if (width == null) Modifier.fillMaxWidth() else Modifier.width(width)).height(height)
    if (painter != null) {
        Image(painter, alt, size)
    } else {
        Box(size.background(outlineColor.copy(alpha = .13f)).semantics {
            if (!alt.isNullOrEmpty()) contentDescription = alt
        })
    }
}

@Composable
private fun Chart(context: ComponentContext, bars: Boolean) {
    val xKey = context.props.string("xKey") ?: "x"
    val yKey = context.props.string("yKey") ?: "y"
    val points = (context.props["data"] as? JsonArray).orEmpty().asSequence().take(256).mapNotNull { point ->
        val entry = point as? JsonObject ?: return@mapNotNull null
        entry.number(yKey)?.let { entry[xKey].label().take(80) to it }
    }.toList()
    val title = context.text("title")
    if (points.isEmpty()) {
        if (title.isNotEmpty()) Text(title, bold = true)
        return
    }
    val min = minOf(0.0, points.minOf { it.second })
    val max = maxOf(0.0, points.maxOf { it.second })
    val scale = maxOf(kotlin.math.abs(min), kotlin.math.abs(max), 1.0)
    val low = min / scale
    val range = (max / scale - low).coerceAtLeast(.000001)
    val height = (context.props.number("height") ?: 180.0).coerceIn(40.0, 500.0)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (title.isNotEmpty()) Text(title, bold = true)
        Canvas(Modifier.fillMaxWidth().height(height.dp).semantics {
            contentDescription = points.joinToString { (label, value) -> "$label: $value" }
        }) {
            val step = size.width / points.size
            val zero = (size.height * (1 + low / range)).toFloat()
            var previous: Offset? = null
            for ((index, point) in points.withIndex()) {
                val x = (index + 0.5f) * step
                val y = (size.height * (1 - (point.second / scale - low) / range)).toFloat()
                if (bars) {
                    drawRect(highlightColor, Offset(x - step * .32f, minOf(zero, y)),
                        Size(step * .64f, kotlin.math.abs(y - zero)))
                } else {
                    previous?.let { drawLine(highlightColor, it, Offset(x, y), strokeWidth = 2.dp.toPx()) }
                    drawCircle(highlightColor, 3.dp.toPx(), Offset(x, y))
                    previous = Offset(x, y)
                }
            }
        }
    }
}
