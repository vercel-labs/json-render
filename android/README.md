# json-render for Jetpack Compose

Render a json-render spec as native Jetpack Compose UI. The renderer looks up each element's `type` in a registry of composables supplied by your app. `FoundationComponents` provides `Column`, `Row`, `Stack`, and `Text`.

## Add the renderer to an app

Build with JDK 17 or newer and Android SDK 36. The library supports Android API 23 and newer. Include this Gradle project as a composite build in your app's `settings.gradle.kts`. Point the path at the `android` directory of your json-render checkout.

```kotlin
includeBuild("../json-render/android") {
    dependencySubstitution {
        substitute(module("com.vercel.jsonrender:compose")).using(project(":compose"))
    }
}
```

Add the library to your app module's `build.gradle.kts`. Enable Compose in the app module.

```kotlin
dependencies {
    implementation("com.vercel.jsonrender:compose")
}
```

## Render a spec with state and actions

This example adds a Material 3 button to the foundation registry. Add Material 3 to your app's dependencies to use the example button. The spec should register the `primaryAction` element with type `Button`, a `label` prop, and an `on.press` binding when it needs to show the button.

```kotlin
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.vercel.jsonrender.compose.ActionBinding
import com.vercel.jsonrender.compose.ComponentRegistry
import com.vercel.jsonrender.compose.FoundationComponents
import com.vercel.jsonrender.compose.JsonRender
import com.vercel.jsonrender.compose.Spec
import com.vercel.jsonrender.compose.withStateValue
import kotlinx.serialization.json.JsonPrimitive

private val buttonComponents: ComponentRegistry = mapOf(
    "Button" to { context ->
        Button(onClick = { context.emit("press") }) {
            Text((context.props["label"] as? JsonPrimitive)?.content.orEmpty())
        }
    },
)

@Composable
fun SpecScreen(json: String, onAction: (ActionBinding) -> Unit) {
    val spec = remember(json) { Spec.decode(json) }
    var state by remember(spec) { mutableStateOf(spec.state) }

    JsonRender(
        spec = spec,
        registry = FoundationComponents + buttonComponents,
        state = state,
        onAction = onAction,
        onStateChange = { path, value -> state = state.withStateValue(path, value) },
    )
}
```

In a custom container, call `context.RenderChildren()` for `children` and `context.RenderSlot(name)` for a named slot. For an input, read its value from `context.props` and call `context.write("value", newValue)` with a JSON value when the user edits it. The renderer forwards writes for `$bindState` and `$bindItem` props as JSON Pointer paths. Apply the callback to the current state and pass the updated object back to `JsonRender`.

Register and dispatch action names in the host. `onAction` receives a name and resolved parameters, along with the original binding as `source` for apps that handle confirmation or follow-up actions. An event with an array of bindings dispatches them to the host in order using the rendered state snapshot. Resolve unknown action names in your dispatcher by ignoring or reporting them.

## Supported spec features

- Nested children, named slots, conditional visibility, and repeated layouts. Repeats use a state array or an item-relative array path from an enclosing repeat.
- JSON Pointer state references, repeat item and index references, two-way bindings, templates, and conditional props. Use `$state`, `$item`, `$index`, `$bindState`, `$bindItem`, `$template`, and `$cond` with `$then` and `$else`.
- Single or multiple actions per event. The host owns execution and state.

Supply a committed spec with `Spec.decode` or construct one directly. The Android package currently covers rendering and event dispatch. Streaming patches, watchers, computed props, custom directives, and action lifecycle handling are outside its runtime.

## Build and test

From this directory, run:

```sh
./gradlew :compose:assembleRelease :compose:testDebugUnitTest
```
