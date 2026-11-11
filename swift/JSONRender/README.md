# json-render for Swift

Swift package renderer for json-render. It decodes the same `{ "root", "elements", "state" }` JSON that `@json-render/core` defines, resolves data bindings and expressions, dispatches actions, and renders the tree with SwiftUI on macOS and iOS.

`JSONRenderCore` has no UI dependencies and builds on Linux. `JSONRenderSwiftUI`, `JSONRenderCatalog`, and the example apps need SwiftUI.

## Requirements

- Swift 5.9 or later.
- macOS 13 or later, or iOS 16 or later, for SwiftUI rendering.

## Installation

The package is in `swift/JSONRender` and does not have a standalone repository or release tag yet, so SwiftPM cannot fetch it by URL. Add the checkout as a local package dependency:

```swift
dependencies: [
    .package(path: "../json-render/swift/JSONRender"),
],
targets: [
    .target(
        name: "App",
        dependencies: [
            .product(name: "JSONRenderCore", package: "JSONRender"),
            .product(name: "JSONRenderSwiftUI", package: "JSONRender"),
        ]
    ),
]
```

Change the path to match your checkout. In Xcode, choose **File > Add Package Dependencies**, then **Add Local** and select the `swift/JSONRender` directory.

## Usage

```swift
import SwiftUI
import JSONRenderCore
import JSONRenderSwiftUI

private let spec = Spec.decodePartial(
    """
    {
      "root": "greeting",
      "elements": {
        "greeting": {
          "type": "Text",
          "props": { "text": { "$template": "Hello, ${/name}" } }
        }
      },
      "state": { "name": "Ada" }
    }
    """
)!

struct ContentView: View {
    var body: some View {
        JSONRenderView(spec: spec, registry: BuiltInComponents.registry())
            .padding()
    }
}
```

`JSONRenderView` takes a `Spec`, a `RendererRegistry<AnyView>`, an optional `initialState`, optional `navigate` and `confirm` closures, a `loading` flag for streamed specs, and an optional `animation` for layout changes caused by state updates, such as an element that a visibility condition shows or hides. The view owns a `StateStore` seeded from `spec.state`, rebuilds the tree on the main thread when state changes, and runs `watch` bindings when a watched value changes after the initial render.

When the `spec` you pass changes, the view applies it to the existing model. A different spec renders the new tree and resets the store to the new spec's `state`. An equal spec keeps the current state, including edits made through `$bindState`.

Register app components with `ComponentDefinition` and pass them through `extraComponents`:

```swift
let registry = BuiltInComponents.registry(
    extraComponents: [
        "Card": ComponentDefinition { context in
            AnyView(
                GroupBox(context.props.string("title") ?? "") {
                    ChildViews(children: context.children)
                }
            )
        },
    ],
    actions: [
        "save": { params in
            print(params)
        },
    ]
)
```

A definition receives a `ComponentRenderContext` with resolved `props`, rendered `children` (with a stable identity for each in `childIDs`) and `slots`, state bindings, the repeat scope, and `on` and `emit` event helpers. To render a component type that has no registered view, set `fallback` on the `RendererRegistry`. Without a fallback, the element and its subtree are dropped with a warning, matching the React renderer.

## Built-in components

`BuiltInComponents.registry()` provides Text, Stack, Row, Column, Button, Image, List, and Input.

Button props are `label` (or `text`), `variant` (`primary` or `secondary`), `disabled`, and `fullWidth`. A button hugs its label by default; set `fullWidth` to stretch it to the width of its container.

## Native catalog

`JSONRenderCatalog` is a larger catalog with native styling: cards on raised surfaces, SF Symbols, Swift Charts, and system controls.

```swift
import JSONRenderCatalog

JSONRenderView(spec: spec, registry: NativeCatalog.registry())
```

| Component | Props |
| --- | --- |
| Card | `title`, `description`, `icon`, `tint` |
| Stack | `direction`, `gap`, `align`, `justify` |
| Grid | `columns`, `gap` |
| Heading | `text`, `level` (`h1` to `h4`) |
| Text | `text`, `variant` (`body`, `lead`, `caption`, `muted`, `code`) |
| Metric | `label`, `value`, `detail`, `trend` (`up`, `down`, `neutral`), `icon`, `tint` |
| Badge | `text`, `variant` (`default`, `secondary`, `success`, `warning`, `destructive`, `outline`) |
| Alert | `title`, `message`, `type` (`info`, `success`, `warning`, `error`) |
| List | `title` |
| ListItem | `title`, `subtitle`, `icon`, `tint`, `trailing` |
| Image | `src`, `alt`, `height` |
| Progress | `value`, `max`, `label`, `tint` |
| Button | `label`, `variant` (`primary`, `secondary`, `danger`), `icon`, `disabled` |
| Switch | `label`, `description`, `checked` |
| BarChart, LineChart | `title`, `data`, `xKey`, `yKey`, `tint`, `height` |
| Separator | none |

`icon` props are SF Symbols names, and `tint` is a named system color such as `blue`, `green`, or `orange`. Button emits `press` and Switch emits `change`. Bind `checked` with `$bindState` or `$bindItem` for two-way state. ListItem renders its children as trailing accessories, such as a Badge, a Button, or a Switch.

Each element fades in the first time it appears, so a streamed spec builds up smoothly. Pass `animatesAppearance: false` to turn this off.

Grid keeps its columns at least 140 points wide and uses fewer columns in a narrow container. Apply `.jsonRenderTextScale(1.25)` to scale the catalog's text, icons, and controls, for example for a presentation.

`Scripts/record-demo-streams.mjs` defines the same catalog with `defineCatalog` from `@json-render/core`, so `catalog.prompt()` produces a system prompt for it.

## Streaming

`SpecStreamCompiler` applies JSONL patches as text arrives. Decode the partial result after each chunk and pass it to the view with `loading: true` until the stream ends:

```swift
let compiler = SpecStreamCompiler()

for try await chunk in stream {
    let update = compiler.push(chunk)
    if !update.newPatches.isEmpty {
        spec = Spec.decodePartial(update.result)
    }
}
spec = Spec.decodePartial(compiler.getResult())
```

```swift
JSONRenderView(spec: spec, registry: NativeCatalog.registry(), loading: isStreaming)
```

While `loading` is true, children that have not arrived yet are skipped without a warning.

## Supported

- Spec decoding, including partial specs, and JSONL patch streaming.
- Structural validation and catalog validation.
- Expressions: `$state`, `$item`, `$index`, `$bindState`, `$bindItem`, `$cond`, `$computed`, and `$template`.
- Visibility conditions and repeat expansion.
- Actions: custom handlers, the built-in `setState`, `pushState`, and `removeState` actions, `on` bindings, `watch` bindings, and action confirmation.
- An observable state store with path reads and writes.
- Unknown component and action handling that matches the React renderer.

## Not yet supported

- Form validation. Input `checks` and `validateOn` props are decoded but not enforced.
- Devtools integration.
- Navigation actions such as `push` and `pop`. The `navigate` closure handles redirect paths.
- An AI stream client and prompt generation. Generate the prompt with `@json-render/core` and stream the response with your own client.
- Catalogs beyond the built-in starter set and the native catalog. There is no shadcn, React Native, PDF, or email catalog.
- Prop type validation. Catalog validation checks component and action names and required props.

## Development

```bash
cd swift/JSONRender
swift build
swift test
```

On Linux, `swift build` compiles `JSONRenderCore` and the example apps' non-SwiftUI fallbacks. The SwiftUI targets are guarded by `#if canImport(SwiftUI)`.

The tests use XCTest. On macOS, `swift test` needs a full Xcode installation because the Command Line Tools do not include XCTest, while `swift build` works with either toolchain. On Linux, use the Swift 5.9 or later toolchain from [swift.org](https://www.swift.org/install/).

Run the example app on a Mac:

```bash
swift run JSONRenderMacExample
```

## Streaming demo

`JSONRenderStreamingDemo` is a macOS app with a prompt field and the native catalog. It replays recorded model responses through `SpecStreamCompiler` with the timing they streamed at, so the UI builds up element by element. Buttons and switches in the generated UI update state after the stream ends.

```bash
swift run JSONRenderStreamingDemo
```

Press Return in the prompt field to type and run the selected prompt. While a response streams, the send button becomes a stop button. Command-1 to Command-3 pick a prompt, and Command-K resets. Launch options:

| Option | Description |
| --- | --- |
| `--demo ID` | Prompt to select: `coffee-shop`, `tokyo-trip`, or `smart-home` |
| `--autoplay` | Start after launch, after `--delay` seconds (default 1) |
| `--appearance light\|dark` | Window appearance |
| `--size WIDTHxHEIGHT` | Window content size (default `900x900`) |
| `--origin X,Y` | Window top-left corner in screen points, from the top of the screen (default: centered) |
| `--speed N` | Playback speed (default 1, the recorded timing) |
| `--first-token SECONDS` | Shortens the recorded wait for the first token (default 0.9) |
| `--stop-after N` | Pause after N patches |
| `--no-follow` | Do not scroll to new content while streaming |
| `--stay` | Stay at the end of the page when the stream finishes instead of scrolling back to the top |
| `--text-scale N` | Scale text, icons, and controls (default 1) |

The recordings in `Sources/JSONRenderStreamingDemo/Resources` come from `Scripts/record-demo-streams.mjs`, which builds the system prompt with `catalog.prompt()` and saves each streamed chunk with its arrival time. To record new responses, build `@json-render/core` and run:

```bash
pnpm install
pnpm --filter @json-render/core build
AI_GATEWAY_API_KEY=... node swift/JSONRender/Scripts/record-demo-streams.mjs
```

Set `AI_GATEWAY_MODEL` to record with a different model. Pass demo IDs as arguments to record only those.

## Regenerate the spec model

`Sources/JSONRenderCore/SpecModel.swift` is generated from `packages/core/src/types.ts` and `packages/core/src/actions.ts`.

```bash
node swift/JSONRender/Scripts/generate-spec-model.mjs
node swift/JSONRender/Scripts/generate-spec-model.mjs --check
```

`--check` exits non-zero when the checked-in Swift file differs from the generator output. CI runs it.

## Conformance fixtures

`Tests/JSONRenderCoreTests/Fixtures/specs` holds specs that the Swift and React renderers both consume. Regenerate the expected trees with the React renderer:

```bash
node swift/JSONRender/Tools/conformance/render-fixtures.mjs
```

The script imports `packages/react/dist/index.mjs`, so build that package and install the workspace dependencies before running it.
