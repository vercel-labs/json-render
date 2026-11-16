# Material 3 Expressive for json-render

Render Android json-render specs with Material 3 Expressive components. The
catalog adds Material typography, cards, shape-changing buttons, toggle
buttons, and animated progress indicators to the [Jetpack Compose renderer](../README.md).

## Add the catalog to your app

Use JDK 17, Android SDK 36, and Gradle 8.13. The library supports Android API 23
and later. It uses AndroidX Material 3 `1.5.0-alpha18` for the Expressive theme
and components.

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

`Column`, `Row`, and `Stack` come from the Compose renderer's foundation catalog.

- `Text` and `Heading` take a `text` string. `Heading` uses Material's
  `headlineMedium` style.
- `Card` renders its children below optional `title` and `description` strings.
- `Button` takes a `label` string and an optional `disabled` boolean. It emits
  `press` on activation.
- `ToggleButton` takes a `label` string, a `checked` boolean, and an optional
  `disabled` boolean. Bind `checked` with `$bindState` to receive updates through
  the renderer's state callback. The component emits `change` on activation.
- `LoadingIndicator` renders a contained indeterminate indicator with an
  optional visible `label`.
- `Progress` renders a wavy progress indicator. Set `value` to a percentage
  from 0 to 100, or omit it for indeterminate progress. Set `label` to describe
  the progress to assistive technologies.

## Build from source

From the json-render repository root, run:

```sh
android/gradlew -p android/material3-expressive assembleDebug
```

When reviewing the catalog alongside a separate checkout of the Compose
renderer, set `-PjsonRenderAndroidDir=/path/to/compose-checkout/android` on the
Gradle command and run the wrapper from that checkout.
