package com.vercel.jsonrender.material3

import android.net.Uri
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.vercel.jsonrender.compose.ComponentContext

@Composable
internal fun ControlIcon(icon: String?, label: String) {
    val vector = when (icon) {
        "add", "plus" -> Icons.Default.Add
        "back", "arrow.left" -> Icons.AutoMirrored.Filled.ArrowBack
        "check", "checkmark" -> Icons.Default.Check
        "close", "xmark" -> Icons.Default.Close
        "favorite", "heart" -> Icons.Default.Favorite
        "home", "house" -> Icons.Default.Home
        "info" -> Icons.Default.Info
        "search", "magnifyingglass" -> Icons.Default.Search
        "settings", "gearshape" -> Icons.Default.Settings
        else -> Icons.Default.MoreVert
    }
    Icon(vector, label.takeIf { it.isNotEmpty() })
}

@Composable
internal fun MaterialImage(context: ComponentContext) {
    val source = context.text("src")?.let(Uri::parse)
    val model = source?.takeIf { it.scheme.equals("https", ignoreCase = true) && !it.host.isNullOrEmpty() }
        ?: return
    val height = (context.number("height") ?: 160f).coerceIn(24f, 480f).dp
    AsyncImage(
        model = model,
        contentDescription = context.text("alt"),
        modifier = Modifier.fillMaxWidth().height(height).clip(MaterialTheme.shapes.medium),
        contentScale = when (context.text("fit")) {
            "contain" -> ContentScale.Fit
            else -> ContentScale.Crop
        },
    )
}
