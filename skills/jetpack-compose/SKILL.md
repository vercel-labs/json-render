---
name: jetpack-compose
description: Render json-render specs in Jetpack Compose on Android with Foundation components, app-defined composables, state bindings, actions, and streaming JSONL patches.
---

# json-render for Jetpack Compose

Read the [Android package guide](../../android/README.md) for Gradle setup and examples. Include the checkout's `android` Gradle project and substitute `com.vercel.jsonrender:compose` with project `:compose`.

## Render a spec

- Decode full JSON with `Spec.decode(json)` and call `JsonRender(spec)` inside a composable. Use `validateSpec(json, registry.keys)` to check schema fields, element references, cycles, and registered types.
- Use `FoundationComponents` for the built-in registry or merge it with a `ComponentRegistry` of custom composables. Each registry entry takes a `ComponentContext`.
- Use `context.props` for resolved props, `context.RenderChildren()` for default children, and `context.RenderSlot(name)` for named slots. For custom controls, use `context.emit("press")` and `context.write("value", value)`.
- For interactive screens, pass the app-owned state snapshot and apply `onStateChange` using `state.withStateValue(path, value)`. Use `$bindState` for app-level fields and `$bindItem` for fields in repeated rows.
- Dispatch actions with app handlers or use the suspend `ActionDispatcher.dispatch` from the app's coroutine. Use `SpecStreamCompiler` for JSONL chunks and call `finish()` at end of input.

Use `LocalJsonRenderImagePainter` to provide a painter for the app's image sources. Match the component names and props in the generation catalog to the registered Android components.
