# json-render for Jetpack Compose

Render a json-render spec as native Jetpack Compose UI. The renderer looks up each element's `type` in a registry of composables supplied by your app.

## Add the renderer to an app

Build with JDK 17 or newer and Android SDK 37.1. The library supports Android API 23 and newer. Include this Gradle project as a composite build in your app's `settings.gradle.kts`. Point the path at the `android` directory of your json-render checkout.

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

Keep a state snapshot in the app and pass a new snapshot to `JsonRender` when a bound control or action changes it.

```kotlin
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.vercel.jsonrender.compose.ActionDispatcher
import com.vercel.jsonrender.compose.JsonRender
import com.vercel.jsonrender.compose.Spec
import com.vercel.jsonrender.compose.withStateValue
import kotlinx.coroutines.launch

@Composable
fun SpecScreen(json: String) {
    val spec = remember(json) { Spec.decode(json) }
    var state by remember(spec) { mutableStateOf(spec.state) }
    val scope = rememberCoroutineScope()
    val actions = remember(spec) {
        ActionDispatcher(readState = { state }, replaceState = { state = it })
    }

    JsonRender(
        spec = spec,
        state = state,
        onAction = { action -> scope.launch { actions.dispatch(action) } },
        onStateChange = { path, value -> state = state.withStateValue(path, value) },
    )
}
```

In a custom container, call `context.RenderChildren()` for `children` and `context.RenderSlot(name)` for a named slot. For an input, read its value from `context.props` and call `context.write("value", newValue)` with a JSON value when the user edits it. The renderer forwards writes for `$bindState` and `$bindItem` props as JSON Pointer paths. Apply the callback to the current state and pass the updated object back to `JsonRender`.

The `onAction` callback receives the action name, resolved parameters, and original binding. An event can declare multiple bindings, which the renderer delivers in order from the rendered snapshot. A direct `$item` action parameter resolves to the item field's absolute state path so state actions can target a repeated row. You can dispatch them yourself or use the optional `ActionDispatcher` for `setState`, `pushState`, `removeState`, registered suspend handlers, and handler success or error follow-ups. Supply app callbacks for confirmation and navigation. A binding that requires confirmation runs only when the callback approves it.

## Foundation components

- Layout and containers — `Alert`, `Card`, `Column`, `Divider`, `Grid`, `List`, `ListItem`, `Row`, `Separator`, `Spacer`, and `Stack`.
- Content and data — `Badge`, `BarChart`, `Heading`, `Image`, `LineChart`, `Metric`, `Progress`, `ProgressBar`, and `Text`.
- Controls — `Button`, `Checkbox`, `Input`, `Select`, `Switch`, and `Toggle`.

Pass a `ComponentRegistry` to add or override components. `LocalJsonRenderImagePainter` lets the host supply a painter for approved image sources. Without a painter, `Image` keeps the specified size and exposes its alternative text.

## Spec features

- Nested children, named slots, conditional visibility, and array repeats. A nested repeat can read an array on its enclosing item.
- State references, item and index references, two-way bindings, templates, and conditional props. Pass an `ExpressionRegistry` for named `$computed` functions and custom directive keys.
- Event actions and state watchers. A new `watch` records its current value before dispatching later changes. Consecutive watch dispatches are capped at 64 by default. A control event or a state update that triggers no watch resets the cap.
- Complete spec validation with `validateSpec(source, componentTypes)`. Pass the registry's keys to detect unregistered components.

## Stream JSONL patches

Receive chunks from your backend and pass them to `SpecStreamCompiler.push(chunk)`. Call `currentSpec()` after each complete patch to get the renderable portion. Call `finish()` to apply a final line without a newline.

```kotlin
val compiler = SpecStreamCompiler()
for (chunk in chunks) {
    compiler.push(chunk)
    compiler.currentSpec()?.let { publishSpec(it) }
}
compiler.finish()
compiler.currentSpec()?.let { publishSpec(it) }
```

Keep the compiler on one coroutine or thread. It supports add, replace, remove, copy, move, and test operations. Stream writes can create missing parents while the spec is assembling. Invalid and oversized patches leave the last accepted spec available. Handle your network transport in the app and keep user-edited state separate from incoming spec snapshots.

## Build and test

From this directory, run:

```sh
./gradlew :compose:assembleRelease :compose:testDebugUnitTest
```
