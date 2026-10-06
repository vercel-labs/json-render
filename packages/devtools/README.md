# @json-render/devtools

Framework-agnostic core for the json-render devtools — vanilla TS panel UI, event store, DOM picker, and stream tap utilities.

Most users never import from this package directly. Pick the adapter that matches your renderer and drop the `<JsonRenderDevtools />` component into your app:

- [`@json-render/devtools-react`](https://www.npmjs.com/package/@json-render/devtools-react) — React
- [`@json-render/devtools-vue`](https://www.npmjs.com/package/@json-render/devtools-vue) — Vue
- [`@json-render/devtools-svelte`](https://www.npmjs.com/package/@json-render/devtools-svelte) — Svelte
- [`@json-render/devtools-solid`](https://www.npmjs.com/package/@json-render/devtools-solid) — Solid

See the [devtools guide](https://json-render.dev/docs/devtools) for the full walkthrough.

## Installation

```bash
npm install @json-render/devtools
```

This package is pulled in automatically by every framework adapter. Install it directly only if you're building your own adapter or using the stream tap utilities on the server.

Adapters detect production through the bundler's `process.env.NODE_ENV` replacement, including in browsers without a `process` global.

## What you get

- **Event store** — capped ring buffer with `push`, `subscribe`, `snapshot`, `clear`.
- **Panel** — shadow-DOM-isolated drawer with six tabs (Spec, State, Actions, Stream, Catalog, Pick).
- **Stream taps** — wrap `pipeJsonRender` / YAML transforms to mirror patches into the event store.
- **Picker** — DOM overlay that maps clicked elements back to spec keys via `data-jr-key`.

## Example: server-side stream tap

```ts
import { tapJsonRenderStream, createEventStore } from "@json-render/devtools";
import { pipeJsonRender } from "@json-render/core";

const events = createEventStore({ bufferSize: 1000 });

const tapped = tapJsonRenderStream(
  result.toUIMessageStream(),
  events,
);
writer.merge(pipeJsonRender(tapped));
```

## License

Apache-2.0
