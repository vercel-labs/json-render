package com.vercel.jsonrender.material3

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Badge
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.vercel.jsonrender.compose.ComponentContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject

@Composable
internal fun MaterialGrid(context: ComponentContext) {
    FlowRow(
        maxItemsInEachRow = context.number("columns")?.toInt()?.coerceIn(1, 6) ?: 2,
        horizontalArrangement = Arrangement.spacedBy(context.gap()),
        verticalArrangement = Arrangement.spacedBy(context.gap()),
    ) { context.RenderChildren() }
}

@Composable
internal fun MaterialText(context: ComponentContext) {
    val text = context.text("text").orEmpty()
    val typography = MaterialTheme.typography
    val color = MaterialTheme.colorScheme.onSurfaceVariant
    when (context.text("variant")) {
        "lead" -> Text(text, style = typography.titleMedium, color = color)
        "caption" -> Text(text, style = typography.bodySmall, color = color)
        "muted" -> Text(text, color = color)
        "code" -> Surface(
            shape = MaterialTheme.shapes.small,
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
        ) {
            Text(text, Modifier.padding(horizontal = 6.dp, vertical = 3.dp), fontFamily = FontFamily.Monospace)
        }
        else -> Text(text, style = typography.bodyMedium)
    }
}

@Composable
internal fun MaterialHeading(context: ComponentContext) {
    val typography = MaterialTheme.typography
    val style = when (context.text("level") ?: context.props["level"].displayText()) {
        "h1", "1" -> typography.headlineLarge
        "h3", "3" -> typography.headlineSmall
        "h4", "4", "h5", "5", "h6", "6" -> typography.titleLarge
        else -> typography.headlineMedium
    }
    Text(context.text("text").orEmpty(), Modifier.semantics { heading() }, style = style)
}

@Composable
internal fun MaterialCard(context: ComponentContext) {
    val modifier = if (context.flag("fullWidth") == true) Modifier.fillMaxWidth() else Modifier
    val content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit = {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                context.text("icon")?.let { ControlIcon(it, "") }
                context.text("title")?.let { Text(it, style = MaterialTheme.typography.titleLarge) }
            }
            context.text("description")?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            context.RenderChildren()
        }
    }
    when (context.text("variant")) {
        "outlined" -> OutlinedCard(modifier, content = content)
        "elevated" -> ElevatedCard(modifier, content = content)
        else -> Card(
            modifier = modifier,
            colors = CardDefaults.cardColors(),
            content = content,
        )
    }
}

@Composable
internal fun MaterialSurface(context: ComponentContext) {
    val color = when (context.text("variant")) {
        "primary" -> MaterialTheme.colorScheme.primaryContainer
        "secondary" -> MaterialTheme.colorScheme.secondaryContainer
        "tertiary" -> MaterialTheme.colorScheme.tertiaryContainer
        else -> MaterialTheme.colorScheme.surfaceContainer
    }
    Surface(color = color, shape = MaterialTheme.shapes.medium) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(context.gap())) {
            context.RenderChildren()
        }
    }
}

@Composable
internal fun MaterialMetric(context: ComponentContext) {
    Surface(
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surfaceContainer,
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(context.label, style = MaterialTheme.typography.labelLarge)
            Text(context.props["value"].displayText().orEmpty(), style = MaterialTheme.typography.headlineMedium)
            context.text("detail")?.let {
                val color = when (context.text("trend")) {
                    "down" -> MaterialTheme.colorScheme.error
                    "up" -> MaterialTheme.colorScheme.primary
                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                }
                Text(it, style = MaterialTheme.typography.bodySmall, color = color)
            }
        }
    }
}

@Composable
internal fun MaterialBadge(context: ComponentContext) {
    val scheme = MaterialTheme.colorScheme
    val (background, foreground) = when (context.text("variant")) {
        "error", "danger", "destructive" -> scheme.errorContainer to scheme.onErrorContainer
        "success" -> scheme.tertiaryContainer to scheme.onTertiaryContainer
        "warning" -> scheme.secondaryContainer to scheme.onSecondaryContainer
        else -> scheme.primaryContainer to scheme.onPrimaryContainer
    }
    Badge(containerColor = background, contentColor = foreground) { Text(context.label) }
}

@Composable
internal fun MaterialAlert(context: ComponentContext) {
    val scheme = MaterialTheme.colorScheme
    val (background, foreground) = when (context.text("type")) {
        "error", "danger", "destructive" -> scheme.errorContainer to scheme.onErrorContainer
        "success" -> scheme.tertiaryContainer to scheme.onTertiaryContainer
        "warning" -> scheme.secondaryContainer to scheme.onSecondaryContainer
        else -> scheme.primaryContainer to scheme.onPrimaryContainer
    }
    Surface(color = background, contentColor = foreground, shape = MaterialTheme.shapes.large) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(context.text("title").orEmpty(), style = MaterialTheme.typography.titleMedium)
            context.text("message")?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            context.RenderChildren()
        }
    }
}

@Composable
internal fun MaterialList(context: ComponentContext) {
    Column {
        context.text("title")?.let { Text(it, style = MaterialTheme.typography.titleMedium) }
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow) {
            Column { context.RenderChildren() }
        }
    }
}

@Composable
internal fun MaterialListItem(context: ComponentContext) {
    val subtitle = context.text("subtitle")
    val modifier = if (context.flag("clickable") == true) {
        Modifier.clickable(enabled = context.enabled) { context.emit("press") }
    } else Modifier
    val icon = context.text("icon")
    ListItem(
        leadingContent = icon?.let { { ControlIcon(it, "") } },
        supportingContent = subtitle?.let { { Text(it, maxLines = 2, overflow = TextOverflow.Ellipsis) } },
        trailingContent = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                context.text("trailing")?.let { Text(it) }
                context.RenderChildren()
            }
        },
        modifier = modifier,
    ) {
        Text(context.text("title").orEmpty())
    }
}

internal data class ChartPoint(val label: String, val value: Float)

internal fun chartPoints(data: JsonArray?, xKey: String, yKey: String): List<ChartPoint> =
    data.orEmpty().take(100).mapIndexedNotNull { index, item ->
        val row = item as? JsonObject ?: return@mapIndexedNotNull null
        val raw = row[yKey]
        val value = raw.number() ?: raw.text()?.toFloatOrNull()?.takeIf(Float::isFinite)
            ?: return@mapIndexedNotNull null
        ChartPoint(row[xKey].displayText() ?: (index + 1).toString(), value)
    }

@Composable
internal fun MaterialChart(context: ComponentContext, bars: Boolean) {
    val title = context.text("title")
    val points = chartPoints(
        context.props["data"] as? JsonArray,
        context.text("xKey") ?: "x",
        context.text("yKey") ?: "y",
    )
    val primary = MaterialTheme.colorScheme.primary
    val axis = MaterialTheme.colorScheme.outlineVariant
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        title?.let { Text(it, style = MaterialTheme.typography.titleMedium) }
        Box(Modifier.fillMaxWidth().height((context.number("height") ?: 180f).coerceIn(48f, 500f).dp)) {
            if (points.isNotEmpty()) {
                val minimum = minOf(0.0, points.minOf { it.value.toDouble() })
                val maximum = maxOf(0.0, points.maxOf { it.value.toDouble() })
                val range = (maximum - minimum).takeIf { it > 0.0 } ?: 1.0
                val description = points.joinToString { "${it.label}: ${it.value}" }
                Canvas(Modifier.matchParentSize().semantics { contentDescription = description }) {
                    val baseline = (size.height * (maximum / range)).toFloat()
                    drawLine(axis, Offset(0f, baseline), Offset(size.width, baseline))
                    val step = size.width / points.size
                    var previous: Offset? = null
                    points.forEachIndexed { index, point ->
                        val offset = Offset(step * (index + 0.5f), (size.height * (maximum - point.value) / range).toFloat())
                        if (bars) {
                            drawRoundRect(
                                color = primary,
                                topLeft = Offset(offset.x - step * 0.3f, minOf(offset.y, baseline)),
                                size = Size(step * 0.6f, kotlin.math.abs(offset.y - baseline)),
                                cornerRadius = CornerRadius(3.dp.toPx()),
                            )
                        } else {
                            previous?.let { drawLine(primary, it, offset, 2.dp.toPx()) }
                            drawCircle(primary, 2.dp.toPx(), offset)
                            previous = offset
                        }
                    }
                }
            }
        }
        if (points.isNotEmpty()) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(points.first().label, style = MaterialTheme.typography.labelSmall)
                if (points.size > 1) Text(points.last().label, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
