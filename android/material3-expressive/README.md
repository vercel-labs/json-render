# Material 3 Expressive for json-render

Render Android json-render specs with Material 3 Expressive components. The
catalog adds Material layouts, content, charts, form controls,
navigation, and animated progress indicators to the [Jetpack Compose renderer](../README.md).

## Add the catalog to your app

Use JDK 17, Android SDK 37.1, Android Gradle Plugin 9.5.1, and Gradle 9.6.
The library supports Android API 24 and later. It uses AndroidX Material 3
`1.5.0-rc01` for its theme and components. Some Expressive APIs still require
experimental opt-in.

In your app's `settings.gradle.kts`, include the library build from a local
checkout of json-render.

```kotlin
includeBuild("../json-render/android/material3-expressive")
```

In your app module's `build.gradle.kts`, add the catalog dependency.

```kotlin
dependencies {
    implementation("com.vercel.jsonrender:json-render-material3-expressive")
}
```

Pass the catalog to `JsonRender` and wrap the result in
`JsonRenderExpressiveTheme`. The theme accepts app-provided colors, shapes, and
typography.

```kotlin
import androidx.compose.runtime.Composable
import com.vercel.jsonrender.compose.JsonRender
import com.vercel.jsonrender.compose.Spec
import com.vercel.jsonrender.material3.JsonRenderExpressiveTheme
import com.vercel.jsonrender.material3.Material3ExpressiveComponents

@Composable
fun SettingsScreen(spec: Spec) {
    JsonRenderExpressiveTheme {
        JsonRender(spec = spec, registry = Material3ExpressiveComponents)
    }
}
```

Use the Compose renderer's state and action callbacks when the spec contains
bindings or events. To add or replace component renderers, pass
`Material3ExpressiveComponents + appComponents` as the registry.

## Components

The catalog includes layout and content components, buttons and form controls,
Material tabs and navigation, overlays, charts, and Expressive progress
indicators. See the [component reference](../../apps/web/content/docs/api/material3-expressive.mdx)
for supported props, bindings, slots, and events.

To load images from HTTPS URLs with `Image`, add the Android `INTERNET`
permission to your app.

## Build from source

From the json-render repository root, run:

```sh
android/gradlew -p android/material3-expressive assembleDebug
```

When reviewing the catalog alongside a separate checkout of the Compose
renderer, set `-PjsonRenderAndroidDir=/path/to/compose-checkout/android` on the
Gradle command. Both builds must use the same Android Gradle Plugin version.
