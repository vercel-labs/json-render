# @json-render/devtools-solid

SolidJS adapter for the [json-render devtools](https://json-render.dev/docs/devtools). Drop-in `<JsonRenderDevtools />` component.

## Installation

```bash
npm install @json-render/devtools @json-render/devtools-solid
```

Peer dep: `solid-js@^1.9`.

## Usage

```tsx
import { JsonRenderDevtools } from "@json-render/devtools-solid";

<JSONUIProvider registry={registry}>
  <Renderer spec={spec()} registry={registry} />
  <JsonRenderDevtools
    spec={spec()}
    catalog={catalog}
    messages={messages()}
  />
</JSONUIProvider>;
```

While devtools is mounted, the renderer adds `display: contents` wrappers with
`data-jr-key` attributes for the DOM picker. Unmounting devtools removes these
wrappers; the spec content remains visible in either case.

- Floating toggle appears bottom-right.
- Hotkey: `Ctrl`/`Cmd` + `Shift` + `J`.
- Tree-shakes to `null` in production builds.

See the [devtools docs](https://json-render.dev/docs/devtools) for the full prop reference and panel tour.

## License

Apache-2.0
